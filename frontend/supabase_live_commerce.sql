-- Tabelas e Lógica para Live Commerce (Supabase Realtime)

-- 1. Tabela de Transmissões (Lives)
CREATE TABLE IF NOT EXISTS public.live_auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    streamer_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    video_url TEXT NOT NULL, -- Link da Twitch ou YouTube
    status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'LIVE', 'ENDED'
    current_item_id TEXT, -- Produto sendo leiloado agora (pode ser UUID de inventario ou codigo livre)
    current_item_name TEXT,
    current_item_type TEXT DEFAULT 'Carta', -- Carta, Booster, Triple Pack, Quadpack
    current_item_image TEXT,
    starting_bid NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    current_bid NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    winning_user_id UUID REFERENCES auth.users(id),
    winning_user_name TEXT,
    ends_at TIMESTAMP WITH TIME ZONE, -- Cronômetro final do item atual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forçar a criação das novas colunas caso a tabela já existisse antes
ALTER TABLE public.live_auctions ADD COLUMN IF NOT EXISTS current_item_type TEXT DEFAULT 'Carta';
ALTER TABLE public.live_auctions ADD COLUMN IF NOT EXISTS winning_user_name TEXT;

-- 2. Segurança (RLS)
ALTER TABLE public.live_auctions ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode VER as lives
DROP POLICY IF EXISTS "Public can view live auctions" ON public.live_auctions;
CREATE POLICY "Public can view live auctions" 
ON public.live_auctions FOR SELECT 
USING (true);

-- Política: Apenas o Lojista (streamer) pode criar/editar sua própria live
DROP POLICY IF EXISTS "Streamers can manage their own auctions" ON public.live_auctions;
CREATE POLICY "Streamers can manage their own auctions" 
ON public.live_auctions FOR ALL 
TO authenticated
USING (auth.uid() = streamer_id)
WITH CHECK (auth.uid() = streamer_id);

-- 3. Tabela de Lances em Tempo Real (Bids)
CREATE TABLE IF NOT EXISTS public.live_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_id UUID NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS para Bids
ALTER TABLE public.live_bids ENABLE ROW LEVEL SECURITY;

-- Política: Lances são públicos para leitura
DROP POLICY IF EXISTS "Lances são públicos" ON public.live_bids;
CREATE POLICY "Lances são públicos" ON public.live_bids FOR SELECT USING (true);

-- Política: Apenas a função RPC pode inserir lances de forma segura (ou o próprio usuário, mas usamos RPC como batedor de martelo)
-- No nosso caso, como usamos RPC, as permissões são do SECURITY DEFINER da função.
-- Entretanto, deixaremos uma política básica por segurança.
DROP POLICY IF EXISTS "Users can place bids via RPC" ON public.live_bids;
CREATE POLICY "Users can place bids via RPC" ON public.live_bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Criar índices para performance em WebSockets
CREATE INDEX IF NOT EXISTS idx_live_bids_live_id ON public.live_bids(live_id);
CREATE INDEX IF NOT EXISTS idx_live_auctions_status ON public.live_auctions(status);

-- Ativar o Realtime para essas tabelas
-- NOTA: Se as tabelas já estiverem na publicação, os comandos abaixo podem dar erro.
-- Rode apenas se os lances não estiverem aparecendo em tempo real.
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.live_auction_history;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.live_auctions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.live_bids;

-- 3. Função RPC Ultra-Rápida para Registrar Lance e Bloquear Saldo
-- Essa função garante ACID (Atomicidade) para não ter lances duplicados ou sem saldo
CREATE OR REPLACE FUNCTION public.place_live_bid(
    p_live_id UUID,
    p_user_id UUID,
    p_amount NUMERIC,
    p_user_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_live RECORD;
    v_user_credits NUMERIC;
    v_user_name TEXT;
    v_previous_bid RECORD;
BEGIN
    -- 1. Bloquear a linha do leilão atual para evitar concorrência (Race Condition)
    SELECT * INTO v_live FROM public.live_auctions 
    WHERE id = p_live_id FOR UPDATE;

    -- Verificar se a live tá rolando e se o tempo não acabou
    IF v_live.status != 'LIVE' THEN
        RETURN json_build_object('success', false, 'message', 'O leilão não está ativo.');
    END IF;
    
    IF v_live.ends_at IS NOT NULL AND v_live.ends_at <= NOW() THEN
        RETURN json_build_object('success', false, 'message', 'O tempo do leilão acabou!');
    END IF;

    -- Verificar se o lance é maior que o atual
    IF p_amount <= v_live.current_bid THEN
        RETURN json_build_object('success', false, 'message', 'O lance precisa ser maior que o atual.');
    END IF;

    -- 2. Verificar Saldo do Usuário (Tabela auction_credits)
    SELECT (balance - locked) INTO v_user_credits
    FROM public.auction_credits 
    WHERE user_id = p_user_id;

    IF v_user_credits IS NULL OR v_user_credits < p_amount THEN
        RETURN json_build_object('success', false, 'message', 'Saldo de créditos insuficiente. Recarregue sua carteira.');
    END IF;

    -- 3. Identificar o Vencedor Anterior (para devolver o dinheiro dele)
    IF v_live.winning_user_id IS NOT NULL THEN
        -- Desbloquear o saldo do cara que perdeu a Bidding War (GREATEST evita negativo)
        UPDATE public.auction_credits
        SET locked = GREATEST(locked - v_live.current_bid, 0)
        WHERE user_id = v_live.winning_user_id;
    END IF;

    -- 4. Bloquear o saldo do NOVO Vencedor (Usuário atual)
    UPDATE public.auction_credits
    SET locked = locked + p_amount
    WHERE user_id = p_user_id;

    -- 5. Se chegamos até aqui, podemos registrar o lance!
    
    -- Busca o nome do usuário (Perfil)
    SELECT full_name INTO v_user_name FROM public.profiles WHERE id = p_user_id;
    IF v_user_name IS NULL THEN
        SELECT username INTO v_user_name FROM public.profiles WHERE id = p_user_id;
    END IF;
    IF v_user_name IS NULL THEN
        v_user_name := 'Comprador Anônimo';
    END IF;

    -- Atualiza a live_auctions com o novo vencedor e estende o tempo (Anti-Snipe 10s)
    UPDATE public.live_auctions
    SET 
        current_bid = p_amount,
        winning_user_id = p_user_id,
        winning_user_name = v_user_name,
        ends_at = CASE 
            WHEN ends_at < NOW() + INTERVAL '10 seconds' THEN NOW() + INTERVAL '10 seconds'
            ELSE ends_at
        END
    WHERE id = p_live_id;

    -- 6. Registrar o histórico do lance
    INSERT INTO public.live_bids (live_id, user_id, amount)
    VALUES (p_live_id, p_user_id, p_amount);

    RETURN json_build_object('success', true, 'message', 'Lance registrado com sucesso!');
END;
$$;

-- 4. Função para Efetivar Cobrança do Vencedor (Finalizar Venda)
-- Agora com validação, idempotência, e criação automática do pedido em purchases
CREATE OR REPLACE FUNCTION public.finalize_live_item_sale(
    p_live_id UUID,
    p_winner_id UUID,
    p_amount NUMERIC,
    p_item_name TEXT DEFAULT NULL,
    p_item_type TEXT DEFAULT NULL,
    p_item_image TEXT DEFAULT NULL,
    p_streamer_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_live RECORD;
    v_existing_purchase UUID;
    v_purchase_id UUID;
BEGIN
    -- 0. Buscar dados da live para validação
    SELECT * INTO v_live FROM public.live_auctions WHERE id = p_live_id;

    IF v_live IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Live não encontrada.');
    END IF;

    -- 1. Validar que o winner_id é realmente o vencedor atual
    IF v_live.winning_user_id IS DISTINCT FROM p_winner_id THEN
        RETURN json_build_object('success', false, 'message', 'Usuário não é o vencedor atual.');
    END IF;

    -- 2. Idempotência: Verificar se já existe um purchase para este item nesta live
    SELECT id INTO v_existing_purchase
    FROM public.purchases
    WHERE user_id = p_winner_id
      AND payment_method = 'live_credits'
      AND items::text LIKE '%' || p_live_id::text || '%'
      AND items::text LIKE '%' || COALESCE(p_item_name, v_live.current_item_name) || '%'
    LIMIT 1;

    IF v_existing_purchase IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Este arremate já foi processado.', 'already_processed', true);
    END IF;

    -- 3. Deduzir do saldo real e limpar o bloqueio (GREATEST evita negativo)
    UPDATE public.auction_credits
    SET 
        balance = balance - p_amount,
        locked = GREATEST(locked - p_amount, 0)
    WHERE user_id = p_winner_id;

    -- 4. Registrar Transação de Saída
    INSERT INTO public.credit_transactions (user_id, type, amount, note)
    VALUES (p_winner_id, 'withdrawal', p_amount, 'Arremate em Live - ' || COALESCE(p_item_name, v_live.current_item_name));

    -- 5. Criar pedido na tabela purchases (aparece em /minha-conta/pedidos)
    INSERT INTO public.purchases (
        user_id,
        items,
        total_amount,
        discount_amount,
        cashback_earned,
        payment_method,
        mp_payment_id,
        status
    ) VALUES (
        p_winner_id,
        json_build_array(json_build_object(
            'name', COALESCE(p_item_name, v_live.current_item_name),
            'price', p_amount,
            'quantity', 1,
            'image_url', COALESCE(p_item_image, v_live.current_item_image, ''),
            'is_auction', true,
            'is_live', true,
            'live_id', p_live_id,
            'item_type', COALESCE(p_item_type, v_live.current_item_type, 'Carta')
        ))::jsonb,
        p_amount,
        0,
        p_amount * 0.05,
        'live_credits',
        'live-' || p_live_id || '-' || extract(epoch from now())::bigint,
        'approved'
    )
    RETURNING id INTO v_purchase_id;

    -- 6. Dar cashback ao vencedor (5%)
    PERFORM public.add_cashback(p_winner_id, p_amount * 0.05);

    RETURN json_build_object('success', true, 'message', 'Venda finalizada e pedido criado!', 'purchase_id', v_purchase_id);
END;
$$;

-- 5. Tabela de Histórico de Arremates (Persistent)
CREATE TABLE IF NOT EXISTS public.live_auction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_id UUID NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_type TEXT,
    item_image TEXT,
    winner_id UUID REFERENCES auth.users(id),
    winner_name TEXT,
    final_bid NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forçar a criação da coluna item_image caso a tabela já existisse
ALTER TABLE public.live_auction_history ADD COLUMN IF NOT EXISTS item_image TEXT;
ALTER TABLE public.live_auction_history ADD COLUMN IF NOT EXISTS item_type TEXT;

-- Ativar RLS para Histórico
ALTER TABLE public.live_auction_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Histórico é público" ON public.live_auction_history;
CREATE POLICY "Histórico é público" ON public.live_auction_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lojistas podem inserir no histórico" ON public.live_auction_history;
CREATE POLICY "Lojistas podem inserir no histórico" ON public.live_auction_history FOR INSERT TO authenticated WITH CHECK (true); -- Controle via app

