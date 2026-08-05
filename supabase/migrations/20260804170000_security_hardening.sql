BEGIN;

-- Historico de live e escrito apenas pelo servidor (service_role).
ALTER TABLE IF EXISTS public.live_auction_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.live_auction_history;

-- Impede duplicacao dos mesmos pagamentos em replays de webhook.
CREATE UNIQUE INDEX IF NOT EXISTS purchases_mp_payment_id_unique
    ON public.purchases (mp_payment_id)
    WHERE mp_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS seller_orders_mp_payment_id_unique
    ON public.seller_orders (mp_payment_id)
    WHERE mp_payment_id IS NOT NULL;

-- Lances de live: trava live/carteiras, cobra somente o delta do proprio vencedor
-- e nao confia em nome para autorizacao.
CREATE OR REPLACE FUNCTION public.place_live_bid(
    p_live_id UUID,
    p_user_id UUID,
    p_amount NUMERIC,
    p_user_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_bid NUMERIC;
    v_ends_at TIMESTAMPTZ;
    v_status TEXT;
    v_previous_winner UUID;
    v_balance NUMERIC;
    v_locked NUMERIC;
    v_required_delta NUMERIC;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RETURN json_build_object('success', false, 'message', 'Usuario invalido.');
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Valor invalido.');
    END IF;

    SELECT current_bid, ends_at, status, winning_user_id
      INTO v_current_bid, v_ends_at, v_status, v_previous_winner
      FROM public.live_auctions WHERE id = p_live_id FOR UPDATE;
    IF NOT FOUND OR upper(v_status) <> 'LIVE' OR (v_ends_at IS NOT NULL AND v_ends_at <= now()) THEN
        RETURN json_build_object('success', false, 'message', 'Leilao indisponivel.');
    END IF;
    IF p_amount <= coalesce(v_current_bid, 0) THEN
        RETURN json_build_object('success', false, 'message', 'O lance deve superar o atual.');
    END IF;

    SELECT balance, locked INTO v_balance, v_locked
      FROM public.auction_credits WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Carteira nao encontrada.');
    END IF;
    v_required_delta := CASE WHEN v_previous_winner = p_user_id
        THEN p_amount - coalesce(v_current_bid, 0) ELSE p_amount END;
    IF v_required_delta > v_balance - coalesce(v_locked, 0) THEN
        RETURN json_build_object('success', false, 'message', 'Saldo livre insuficiente.');
    END IF;

    IF v_previous_winner IS NOT NULL AND v_previous_winner <> p_user_id THEN
        UPDATE public.auction_credits
           SET locked = greatest(coalesce(locked, 0) - coalesce(v_current_bid, 0), 0)
         WHERE user_id = v_previous_winner;
    END IF;
    UPDATE public.auction_credits SET locked = coalesce(locked, 0) + v_required_delta WHERE user_id = p_user_id;
    UPDATE public.live_auctions
       SET current_bid = p_amount, winning_user_id = p_user_id, winning_user_name = left(p_user_name, 120)
     WHERE id = p_live_id;
    RETURN json_build_object('success', true, 'message', 'Lance registrado.');
END;
$$;

REVOKE ALL ON FUNCTION public.place_live_bid(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_live_bid(UUID, UUID, NUMERIC, TEXT) TO authenticated;

COMMIT;
