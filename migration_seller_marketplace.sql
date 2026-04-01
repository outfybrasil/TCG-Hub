-- migration_seller_marketplace.sql
-- Run this in your Supabase SQL Editor

-- ============================================================
-- 1. seller_listings: ofertas P2P dos usuários
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seller_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE NOT NULL,

    -- Referência à carta (catálogo oficial)
    card_id TEXT,
    card_name TEXT NOT NULL,
    card_set TEXT NOT NULL,
    card_number TEXT,
    image_url TEXT,

    -- Física da carta
    condition TEXT NOT NULL DEFAULT 'NM',
    language TEXT NOT NULL DEFAULT 'Português',
    finish TEXT NOT NULL DEFAULT 'Normal',
    grade TEXT,

    -- Preço e quantidade
    price NUMERIC NOT NULL CHECK (price > 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

    -- Envio
    ships_from_state TEXT,
    free_shipping BOOLEAN DEFAULT FALSE,

    -- Status
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused', 'sold', 'cancelled')),

    -- Taxa da plataforma snapshot
    platform_fee_pct NUMERIC NOT NULL DEFAULT 8.0,

    -- Notas e métricas
    notes TEXT,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. seller_orders: pedidos P2P
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seller_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES public.seller_listings(id) NOT NULL,
    buyer_id UUID REFERENCES auth.users(id) NOT NULL,
    seller_id UUID REFERENCES auth.users(id) NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    platform_fee_pct NUMERIC NOT NULL DEFAULT 8.0,
    platform_fee_amount NUMERIC NOT NULL,
    seller_net_amount NUMERIC NOT NULL,

    shipping_address JSONB,
    shipping_cost NUMERIC DEFAULT 0,

    mp_payment_id TEXT,
    mp_preference_id TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'disputed', 'refunded', 'cancelled')),

    tracking_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. seller_reviews: avaliações do vendedor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seller_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.seller_orders(id) UNIQUE NOT NULL,
    reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
    seller_id UUID REFERENCES auth.users(id) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. seller_profiles: dados públicos + saldo do vendedor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seller_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    pix_key TEXT,
    pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'email', 'telefone', 'aleatoria')),
    cpf_encrypted TEXT,
    total_sales INTEGER DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    balance_pending NUMERIC DEFAULT 0,
    balance_available NUMERIC DEFAULT 0,
    rating_avg NUMERIC DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    ships_from_state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. seller_withdrawals: saques solicitados pelo vendedor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seller_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES auth.users(id) NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    pix_key TEXT NOT NULL,
    pix_key_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'processing', 'paid', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. Row Level Security
-- ============================================================
ALTER TABLE public.seller_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listings visíveis a todos" ON public.seller_listings
    FOR SELECT USING (true);

CREATE POLICY "Vendedor cria sua listing" ON public.seller_listings
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Vendedor edita sua listing" ON public.seller_listings
    FOR UPDATE TO authenticated USING (auth.uid() = seller_id);

CREATE POLICY "Vendedor deleta sua listing" ON public.seller_listings
    FOR DELETE TO authenticated USING (auth.uid() = seller_id);

----

ALTER TABLE public.seller_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comprador/Vendedor vê seus pedidos" ON public.seller_orders
    FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Sistema insere pedidos" ON public.seller_orders
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Vendedor atualiza pedido (envio)" ON public.seller_orders
    FOR UPDATE TO authenticated USING (auth.uid() = seller_id);

----

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews visíveis a todos" ON public.seller_reviews
    FOR SELECT USING (true);

CREATE POLICY "Comprador avalia sua compra" ON public.seller_reviews
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

----

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis de vendedor visíveis a todos" ON public.seller_profiles
    FOR SELECT USING (true);

CREATE POLICY "Vendedor gerencia seu perfil" ON public.seller_profiles
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

----

ALTER TABLE public.seller_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedor vê seus saques" ON public.seller_withdrawals
    FOR SELECT TO authenticated USING (auth.uid() = seller_id);

CREATE POLICY "Vendedor solicita saque" ON public.seller_withdrawals
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

-- ============================================================
-- 7. Admin policies
-- ============================================================
CREATE POLICY "Admin vê todas listings" ON public.seller_listings
    FOR ALL USING (auth.email() IN ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));

CREATE POLICY "Admin vê todos pedidos P2P" ON public.seller_orders
    FOR ALL USING (auth.email() IN ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));

CREATE POLICY "Admin gerencia saques" ON public.seller_withdrawals
    FOR ALL USING (auth.email() IN ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));

-- ============================================================
-- 8. RPCs utilitários
-- ============================================================

-- Decrementar quantidade de uma listing após venda
CREATE OR REPLACE FUNCTION public.decrement_listing_quantity(p_listing_id UUID, p_quantity INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.seller_listings
    SET quantity = GREATEST(0, quantity - p_quantity),
        status = CASE WHEN quantity - p_quantity <= 0 THEN 'sold' ELSE status END,
        updated_at = NOW()
    WHERE id = p_listing_id;
END;
$$;

-- Aprovar pagamento e atualizar saldo do vendedor (idempotente)
CREATE OR REPLACE FUNCTION public.approve_seller_order(
    p_order_id UUID,
    p_mp_payment_id TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order public.seller_orders%ROWTYPE;
BEGIN
    SELECT * INTO v_order FROM public.seller_orders WHERE id = p_order_id;

    IF NOT FOUND THEN RETURN FALSE; END IF;

    -- Idempotência: não reprocessar pagamento já aprovado
    IF v_order.status = 'paid' THEN RETURN FALSE; END IF;

    -- Atualizar status do pedido
    UPDATE public.seller_orders
    SET status = 'paid', mp_payment_id = p_mp_payment_id, updated_at = NOW()
    WHERE id = p_order_id;

    -- Adicionar ao saldo pendente do vendedor
    INSERT INTO public.seller_profiles (user_id, balance_pending)
    VALUES (v_order.seller_id, v_order.seller_net_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET
        balance_pending = seller_profiles.balance_pending + v_order.seller_net_amount,
        total_sales = seller_profiles.total_sales + 1,
        total_revenue = seller_profiles.total_revenue + v_order.unit_price * v_order.quantity,
        updated_at = NOW();

    -- Decrementar a listing
    PERFORM public.decrement_listing_quantity(v_order.listing_id, v_order.quantity);

    RETURN TRUE;
END;
$$;

-- Liberar saldo pendente para disponível (admin: após envio confirmado)
CREATE OR REPLACE FUNCTION public.release_seller_balance(p_seller_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.seller_profiles
    SET balance_pending = GREATEST(0, balance_pending - p_amount),
        balance_available = balance_available + p_amount,
        updated_at = NOW()
    WHERE user_id = p_seller_id;
END;
$$;

-- Deduzir saldo disponível para saque
CREATE OR REPLACE FUNCTION public.deduct_seller_balance(p_seller_id UUID, p_amount NUMERIC)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance NUMERIC;
BEGIN
    SELECT balance_available INTO current_balance FROM public.seller_profiles WHERE user_id = p_seller_id;
    IF current_balance IS NULL OR current_balance < p_amount THEN RETURN FALSE; END IF;
    UPDATE public.seller_profiles
    SET balance_available = balance_available - p_amount, updated_at = NOW()
    WHERE user_id = p_seller_id;
    RETURN TRUE;
END;
$$;

-- Recalcular média de avaliação do vendedor
CREATE OR REPLACE FUNCTION public.update_seller_rating(p_seller_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.seller_profiles
    SET rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM public.seller_reviews WHERE seller_id = p_seller_id),
        rating_count = (SELECT COUNT(*) FROM public.seller_reviews WHERE seller_id = p_seller_id),
        updated_at = NOW()
    WHERE user_id = p_seller_id;
END;
$$;

-- ============================================================
-- 9. Índices de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_seller_listings_card_id ON public.seller_listings(card_id);
CREATE INDEX IF NOT EXISTS idx_seller_listings_card_name ON public.seller_listings(card_name);
CREATE INDEX IF NOT EXISTS idx_seller_listings_seller_id ON public.seller_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_listings_status ON public.seller_listings(status);
CREATE INDEX IF NOT EXISTS idx_seller_orders_buyer_id ON public.seller_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_seller_id ON public.seller_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_listing_id ON public.seller_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_mp_payment_id ON public.seller_orders(mp_payment_id);
