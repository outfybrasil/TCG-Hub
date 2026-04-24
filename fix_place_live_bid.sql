-- Corrigindo a função place_live_bid para usar os nomes de colunas corretos,
-- e adicionando a validação de limite de saldo (créditos) do usuário.

CREATE OR REPLACE FUNCTION public.place_live_bid(
    p_live_id UUID,
    p_user_id UUID,
    p_amount NUMERIC,
    p_user_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_current_bid NUMERIC;
    v_ends_at TIMESTAMP WITH TIME ZONE;
    v_status TEXT;
    v_winning_user_id UUID;
    v_user_balance NUMERIC;
    v_user_locked NUMERIC;
BEGIN
    -- 1. Obter estado atual da live e travar a linha para evitar lances simultâneos problemáticos
    SELECT current_bid, ends_at, status, winning_user_id
    INTO v_current_bid, v_ends_at, v_status, v_winning_user_id
    FROM public.live_auctions
    WHERE id = p_live_id
    FOR UPDATE;

    -- 2. Validações básicas da Live
    IF v_status != 'LIVE' THEN
        RETURN json_build_object('success', false, 'message', 'Leilão não está ativo.');
    END IF;

    IF v_ends_at IS NOT NULL AND v_ends_at < NOW() THEN
        RETURN json_build_object('success', false, 'message', 'Tempo esgotado para este lote.');
    END IF;

    IF p_amount <= v_current_bid THEN
        RETURN json_build_object('success', false, 'message', 'O lance deve ser maior que o atual.');
    END IF;

    -- 3. Validação de Créditos do Usuário (Saldo disponível = balance - locked)
    SELECT balance, locked INTO v_user_balance, v_user_locked
    FROM public.auction_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_user_balance IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Sua carteira de leilão não foi encontrada.');
    END IF;

    -- Se o saldo disponível for menor que o valor do lance, bloqueia
    IF p_amount > (v_user_balance - COALESCE(v_user_locked, 0)) THEN
        RETURN json_build_object('success', false, 'message', 'Crédito insuficiente! Seu saldo livre é menor que o lance.');
    END IF;

    -- 4. Gerenciamento do saldo bloqueado (locked)
    -- Primeiro, bloqueia o valor do novo lance para o novo usuário
    UPDATE public.auction_credits
    SET locked = COALESCE(locked, 0) + p_amount
    WHERE user_id = p_user_id;

    -- Depois, se já havia um vencedor antes (e não for a mesma pessoa dando lance em si mesma), 
    -- devolve o saldo bloqueado do vencedor anterior.
    IF v_winning_user_id IS NOT NULL AND v_winning_user_id != p_user_id THEN
        UPDATE public.auction_credits
        SET locked = GREATEST(COALESCE(locked, 0) - v_current_bid, 0)
        WHERE user_id = v_winning_user_id;
    
    -- Caso o mesmo usuário aumente seu próprio lance, descontamos o bloqueio antigo dele.
    ELSIF v_winning_user_id = p_user_id THEN
        UPDATE public.auction_credits
        SET locked = GREATEST(COALESCE(locked, 0) - v_current_bid, 0)
        WHERE user_id = p_user_id;
    END IF;

    -- 5. Atualizar a live com o novo lance e o novo vencedor
    UPDATE public.live_auctions
    SET 
        current_bid = p_amount,
        winning_user_id = p_user_id,
        winning_user_name = p_user_name -- (Esta é a coluna correta que estava faltando/errada antes)
    WHERE id = p_live_id;

    RETURN json_build_object('success', true, 'message', 'Lance registrado com sucesso.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
