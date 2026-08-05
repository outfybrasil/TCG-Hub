ALTER TABLE public.live_auction_history
    ADD COLUMN IF NOT EXISTS lot_number integer,
    ADD COLUMN IF NOT EXISTS purchase_id uuid REFERENCES public.purchases(id),
    ADD COLUMN IF NOT EXISTS platform_fee numeric(12,2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS live_history_one_result_per_lot
    ON public.live_auction_history (live_id, lot_number)
    WHERE lot_number IS NOT NULL AND lot_number > 0;

CREATE OR REPLACE FUNCTION public.settle_expired_live_lot(p_live_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_live public.live_auctions%ROWTYPE;
    v_purchase_id uuid;
    v_fee_pct numeric := 5;
    v_fee numeric;
    v_seller_net numeric;
    v_existing uuid;
BEGIN
    SELECT * INTO v_live FROM public.live_auctions WHERE id = p_live_id FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Live não encontrada.'); END IF;
    IF v_live.is_demo THEN RETURN json_build_object('success', true, 'demo', true, 'message', 'Demo não gera cobrança.'); END IF;
    IF v_live.ends_at IS NULL OR v_live.ends_at > now() THEN
        RETURN json_build_object('success', false, 'message', 'Lote ainda está ativo.');
    END IF;
    SELECT id INTO v_existing FROM public.live_auction_history
     WHERE live_id = p_live_id AND lot_number = v_live.lot_number LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN json_build_object('success', true, 'already_settled', true, 'history_id', v_existing); END IF;

    IF v_live.winning_user_id IS NULL OR coalesce(v_live.current_bid, 0) <= 0 THEN
        INSERT INTO public.live_auction_history (live_id, lot_number, item_name, item_type, item_image, final_bid)
        VALUES (p_live_id, v_live.lot_number, coalesce(v_live.current_item_name, 'Lote'), v_live.current_item_type, v_live.current_item_image, 0);
        UPDATE public.live_auctions SET current_item_name='Aguardando Lote...', current_item_description=null,
            current_item_image=null, current_bid=0, starting_bid=0, winning_user_id=null, winning_user_name=null, ends_at=null
        WHERE id=p_live_id;
        RETURN json_build_object('success', true, 'sold', false);
    END IF;

    PERFORM 1 FROM public.auction_credits WHERE user_id=v_live.winning_user_id FOR UPDATE;
    IF NOT FOUND OR (SELECT balance FROM public.auction_credits WHERE user_id=v_live.winning_user_id) < v_live.current_bid
       OR (SELECT locked FROM public.auction_credits WHERE user_id=v_live.winning_user_id) < v_live.current_bid THEN
        RAISE EXCEPTION 'Saldo reservado inconsistente para o vencedor';
    END IF;

    BEGIN
        SELECT coalesce((value #>> '{}')::numeric, 5) INTO v_fee_pct FROM public.admin_settings WHERE key='live_platform_fee_percentage';
    EXCEPTION WHEN OTHERS THEN v_fee_pct := 5;
    END;
    v_fee_pct := coalesce(v_fee_pct, 5);
    v_fee := round(v_live.current_bid * v_fee_pct / 100, 2);
    v_seller_net := v_live.current_bid - v_fee;

    UPDATE public.auction_credits SET balance=balance-v_live.current_bid,
        locked=greatest(locked-v_live.current_bid, 0), updated_at=now() WHERE user_id=v_live.winning_user_id;
    INSERT INTO public.credit_transactions (user_id,type,amount,note)
    VALUES (v_live.winning_user_id,'consumed',v_live.current_bid,'Arremate em live '||p_live_id||' · lote '||v_live.lot_number);

    INSERT INTO public.purchases (user_id,items,total_amount,discount_amount,cashback_earned,payment_method,mp_payment_id,status)
    VALUES (v_live.winning_user_id,
        jsonb_build_array(jsonb_build_object('name',v_live.current_item_name,'price',v_live.current_bid,'quantity',1,
          'image_url',coalesce(v_live.current_item_image,''),'is_auction',true,'is_live',true,'live_id',p_live_id,
          'lot_number',v_live.lot_number,'item_type',coalesce(v_live.current_item_type,'Carta'),'seller_id',v_live.streamer_id,
          'platform_fee_pct',v_fee_pct,'platform_fee',v_fee)),
        v_live.current_bid,0,0,'live_credits','live-'||p_live_id||'-lot-'||v_live.lot_number,'approved')
    RETURNING id INTO v_purchase_id;

    INSERT INTO public.seller_profiles (user_id,display_name,total_sales,total_revenue,balance_pending)
    VALUES (v_live.streamer_id,'Vendedor',1,v_live.current_bid,v_seller_net)
    ON CONFLICT (user_id) DO UPDATE SET total_sales=seller_profiles.total_sales+1,
        total_revenue=seller_profiles.total_revenue+v_live.current_bid,
        balance_pending=seller_profiles.balance_pending+v_seller_net, updated_at=now();

    INSERT INTO public.live_auction_history (live_id,lot_number,item_name,item_type,item_image,winner_id,winner_name,final_bid,purchase_id,platform_fee)
    VALUES (p_live_id,v_live.lot_number,v_live.current_item_name,v_live.current_item_type,v_live.current_item_image,
        v_live.winning_user_id,v_live.winning_user_name,v_live.current_bid,v_purchase_id,v_fee);
    UPDATE public.live_auctions SET current_item_name='Aguardando Lote...',current_item_description=null,current_item_image=null,
        starting_bid=0,current_bid=0,winning_user_id=null,winning_user_name=null,ends_at=null WHERE id=p_live_id;
    RETURN json_build_object('success',true,'sold',true,'purchase_id',v_purchase_id,'gross',v_live.current_bid,
        'platform_fee',v_fee,'seller_net',v_seller_net);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_expired_live_lot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_expired_live_lot(uuid) TO service_role;
