ALTER TABLE public.live_auctions ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.place_live_bid(p_live_id uuid, p_user_id uuid, p_amount numeric, p_user_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_live public.live_auctions%ROWTYPE; v_balance numeric; v_locked numeric; v_required numeric; v_user_name text; v_new_ends_at timestamptz;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Não autorizado'; END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN RETURN json_build_object('success', false, 'message', 'Lance inválido.'); END IF;
    SELECT * INTO v_live FROM public.live_auctions WHERE id = p_live_id FOR UPDATE;
    IF NOT FOUND OR upper(v_live.status) <> 'LIVE' OR v_live.ends_at IS NULL OR v_live.ends_at <= now() THEN RETURN json_build_object('success', false, 'message', 'Este lote já foi encerrado.'); END IF;
    IF p_amount < coalesce(v_live.current_bid, 0) + coalesce(v_live.min_bid_increment, 1) THEN RETURN json_build_object('success', false, 'message', 'Lance mínimo: R$ ' || to_char(coalesce(v_live.current_bid, 0) + coalesce(v_live.min_bid_increment, 1), 'FM999G999G990D00')); END IF;
    IF NOT v_live.is_demo THEN
        SELECT balance, locked INTO v_balance, v_locked FROM public.auction_credits WHERE user_id = auth.uid() FOR UPDATE;
        v_required := CASE WHEN v_live.winning_user_id = auth.uid() THEN p_amount - coalesce(v_live.current_bid, 0) ELSE p_amount END;
        IF v_balance IS NULL OR (v_balance - coalesce(v_locked, 0)) < v_required THEN RETURN json_build_object('success', false, 'message', 'Saldo livre insuficiente para este lance.'); END IF;
        IF v_live.winning_user_id IS NOT NULL AND v_live.winning_user_id <> auth.uid() THEN UPDATE public.auction_credits SET locked = greatest(coalesce(locked, 0) - coalesce(v_live.current_bid, 0), 0), updated_at = now() WHERE user_id = v_live.winning_user_id; END IF;
        UPDATE public.auction_credits SET locked = coalesce(locked, 0) + v_required, updated_at = now() WHERE user_id = auth.uid();
    END IF;
    SELECT coalesce(full_name, username, null) INTO v_user_name FROM public.profiles WHERE id = auth.uid();
    v_user_name := left(coalesce(v_user_name, nullif(trim(p_user_name), ''), 'Comprador'), 120);
    v_new_ends_at := CASE WHEN v_live.ends_at <= now() + interval '15 seconds' THEN now() + interval '15 seconds' ELSE v_live.ends_at END;
    UPDATE public.live_auctions SET current_bid = p_amount, winning_user_id = auth.uid(), winning_user_name = v_user_name, bid_count = coalesce(bid_count, 0) + 1, ends_at = v_new_ends_at WHERE id = p_live_id;
    INSERT INTO public.live_bids (live_id, user_id, user_name, amount) VALUES (p_live_id, auth.uid(), v_user_name, p_amount);
    RETURN json_build_object('success', true, 'message', CASE WHEN v_live.is_demo THEN 'Lance de demonstração registrado.' ELSE 'Lance registrado.' END, 'current_bid', p_amount, 'ends_at', v_new_ends_at, 'bid_count', coalesce(v_live.bid_count, 0) + 1, 'is_demo', v_live.is_demo);
END; $$;

REVOKE ALL ON FUNCTION public.place_live_bid(uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_live_bid(uuid, uuid, numeric, text) TO authenticated;
