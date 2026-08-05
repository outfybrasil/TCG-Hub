-- Bind client-callable financial operations to auth.uid(), make bids atomic,
-- and reserve payment/webhook operations for the service role.
CREATE OR REPLACE FUNCTION public.convert_cashback_to_credits(p_user_id uuid, p_amount numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_wallet_balance numeric;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Não autorizado'; END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
    SELECT balance INTO v_wallet_balance FROM public.wallets WHERE user_id = auth.uid() FOR UPDATE;
    IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN RAISE EXCEPTION 'Saldo de cashback insuficiente'; END IF;
    UPDATE public.wallets SET balance = balance - p_amount, updated_at = now() WHERE user_id = auth.uid();
    INSERT INTO public.auction_credits (user_id, balance, locked) VALUES (auth.uid(), p_amount, 0)
    ON CONFLICT (user_id) DO UPDATE SET balance = auction_credits.balance + excluded.balance, updated_at = now();
    INSERT INTO public.credit_transactions (user_id, type, amount, note)
    VALUES (auth.uid(), 'deposit', p_amount, 'Conversão de Cashback');
    RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.place_bid_with_credits(
    p_bidder_id uuid, p_auction_id uuid, p_bid_amount numeric,
    p_prev_bidder_id uuid, p_prev_bid_amount numeric, p_bidder_name text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_auction public.auctions%ROWTYPE; v_balance numeric; v_locked numeric;
    v_required numeric; v_bidder_name text;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_bidder_id THEN RAISE EXCEPTION 'Não autorizado'; END IF;
    IF p_bid_amount IS NULL OR p_bid_amount <= 0 THEN RAISE EXCEPTION 'Lance inválido'; END IF;
    SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
    IF NOT FOUND OR v_auction.status <> 'active' OR
       (v_auction.ends_at IS NOT NULL AND v_auction.ends_at <= now()) THEN RETURN 'auction_unavailable'; END IF;
    IF p_bid_amount <= coalesce(v_auction.current_bid, 0) THEN RETURN 'bid_too_low'; END IF;
    SELECT balance, locked INTO v_balance, v_locked FROM public.auction_credits
    WHERE user_id = auth.uid() FOR UPDATE;
    v_required := CASE WHEN v_auction.highest_bidder_id = auth.uid()
        THEN p_bid_amount - coalesce(v_auction.current_bid, 0) ELSE p_bid_amount END;
    IF v_balance IS NULL OR (v_balance - coalesce(v_locked, 0)) < v_required THEN RETURN 'insufficient_credits'; END IF;
    IF v_auction.highest_bidder_id IS NOT NULL AND v_auction.highest_bidder_id <> auth.uid() THEN
        UPDATE public.auction_credits SET locked = greatest(locked - coalesce(v_auction.current_bid, 0), 0), updated_at = now()
        WHERE user_id = v_auction.highest_bidder_id;
    END IF;
    UPDATE public.auction_credits SET locked = locked + v_required, updated_at = now() WHERE user_id = auth.uid();
    SELECT coalesce(full_name, username, 'Comprador') INTO v_bidder_name FROM public.profiles WHERE id = auth.uid();
    v_bidder_name := coalesce(v_bidder_name, 'Comprador');
    UPDATE public.auctions SET current_bid = p_bid_amount, bid_count = coalesce(bid_count, 0) + 1,
        highest_bidder_id = auth.uid(), highest_bidder_name = v_bidder_name,
        ends_at = CASE WHEN ends_at IS NOT NULL AND ends_at <= now() + interval '3 minutes'
            THEN now() + interval '3 minutes' ELSE ends_at END WHERE id = p_auction_id;
    INSERT INTO public.bids (auction_id, user_id, user_name, amount, credit_locked)
    VALUES (p_auction_id, auth.uid(), v_bidder_name, p_bid_amount, p_bid_amount);
    RETURN 'ok';
END; $$;

CREATE OR REPLACE FUNCTION public.place_live_bid(p_live_id uuid, p_user_id uuid, p_amount numeric, p_user_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_live public.live_auctions%ROWTYPE; v_balance numeric; v_locked numeric;
    v_required numeric; v_user_name text;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Não autorizado'; END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN RETURN json_build_object('success', false, 'message', 'Lance inválido.'); END IF;
    SELECT * INTO v_live FROM public.live_auctions WHERE id = p_live_id FOR UPDATE;
    IF NOT FOUND OR upper(v_live.status) <> 'LIVE' OR
       (v_live.ends_at IS NOT NULL AND v_live.ends_at <= now()) THEN
        RETURN json_build_object('success', false, 'message', 'Leilão não está ativo.'); END IF;
    IF p_amount <= coalesce(v_live.current_bid, 0) THEN
        RETURN json_build_object('success', false, 'message', 'O lance deve ser maior que o atual.'); END IF;
    SELECT balance, locked INTO v_balance, v_locked FROM public.auction_credits
    WHERE user_id = auth.uid() FOR UPDATE;
    v_required := CASE WHEN v_live.winning_user_id = auth.uid()
        THEN p_amount - coalesce(v_live.current_bid, 0) ELSE p_amount END;
    IF v_balance IS NULL OR (v_balance - coalesce(v_locked, 0)) < v_required THEN
        RETURN json_build_object('success', false, 'message', 'Crédito insuficiente.'); END IF;
    IF v_live.winning_user_id IS NOT NULL AND v_live.winning_user_id <> auth.uid() THEN
        UPDATE public.auction_credits SET locked = greatest(locked - coalesce(v_live.current_bid, 0), 0), updated_at = now()
        WHERE user_id = v_live.winning_user_id;
    END IF;
    UPDATE public.auction_credits SET locked = locked + v_required, updated_at = now() WHERE user_id = auth.uid();
    SELECT coalesce(full_name, username, 'Comprador') INTO v_user_name FROM public.profiles WHERE id = auth.uid();
    v_user_name := coalesce(v_user_name, 'Comprador');
    UPDATE public.live_auctions SET current_bid = p_amount, winning_user_id = auth.uid(), winning_user_name = v_user_name,
        ends_at = CASE WHEN ends_at IS NOT NULL AND ends_at <= now() + interval '15 seconds'
            THEN now() + interval '15 seconds' ELSE ends_at END WHERE id = p_live_id;
    INSERT INTO public.live_bids (live_id, user_id, amount) VALUES (p_live_id, auth.uid(), p_amount);
    RETURN json_build_object('success', true, 'message', 'Lance registrado com sucesso.');
END; $$;

REVOKE EXECUTE ON FUNCTION public.place_live_bid(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.convert_cashback_to_credits(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_cashback_to_credits(uuid, numeric) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.place_bid_with_credits(uuid, uuid, numeric, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_bid_with_credits(uuid, uuid, numeric, uuid, numeric, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.place_live_bid(uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_live_bid(uuid, uuid, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.add_cashback(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_seller_order(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deposit_auction_credits(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_auction_credits(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_inventory(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_inventory(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_listing_quantity(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_seller_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_seller_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_auction_purchase(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_live_item_sale(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_achievement(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_items(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_seller_rating(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_seller_rating() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.add_cashback(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_seller_order(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.deposit_auction_credits(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_auction_credits(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_inventory(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_inventory(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_listing_quantity(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_seller_balance(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_seller_balance(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_auction_purchase(uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_live_item_sale(uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_achievement(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_items(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_seller_rating(uuid) TO service_role;

DO $$ DECLARE fn record; BEGIN
    FOR fn IN SELECT p.oid::regprocedure::text AS signature FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prosecdef
    LOOP EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn.signature); END LOOP;
END; $$;
