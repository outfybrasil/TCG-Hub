-- Run this entirely in the Supabase SQL Editor

-- INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    set TEXT NOT NULL,
    number TEXT NOT NULL,
    language TEXT NOT NULL,
    condition TEXT NOT NULL,
    finish TEXT NOT NULL,
    price NUMERIC NOT NULL,
    grade TEXT,
    image_url TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.inventory FOR INSERT TO authenticated WITH CHECK (true);

-- AUCTIONS TABLE
CREATE TABLE IF NOT EXISTS public.auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    card_name TEXT NOT NULL,
    card_set TEXT NOT NULL,
    card_number TEXT NOT NULL,
    image_url TEXT NOT NULL,
    condition TEXT NOT NULL,
    starting_bid NUMERIC NOT NULL,
    current_bid NUMERIC NOT NULL,
    bid_count INTEGER DEFAULT 0,
    highest_bidder_id UUID REFERENCES auth.users(id),
    highest_bidder_name TEXT,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT
);

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.auctions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.auctions FOR UPDATE TO authenticated USING (true);

-- BIDS TABLE
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    user_name TEXT NOT NULL,
    amount NUMERIC NOT NULL
);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.bids FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.bids FOR INSERT TO authenticated WITH CHECK (true);

-- WALLETS TABLE (Cashback System)
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
-- Users can only read their own wallets
CREATE POLICY "Enable read for users based on user_id" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- CASHBACK RPC FUNCTION
CREATE OR REPLACE FUNCTION add_cashback(p_user_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as elevated user, so standard users can't manipulate arguments
AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = public.wallets.balance + p_amount, updated_at = NOW();
END;
$$;

-- DEDUCT CASHBACK RPC FUNCTION
CREATE OR REPLACE FUNCTION deduct_cashback(p_user_id UUID, p_amount NUMERIC)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance NUMERIC;
BEGIN
    SELECT balance INTO current_balance FROM public.wallets WHERE user_id = p_user_id;
    
    IF current_balance IS NULL OR current_balance < p_amount THEN
        RETURN false; -- Insufficient funds or no wallet
    END IF;

    UPDATE public.wallets 
    SET balance = balance - p_amount, updated_at = NOW() 
    WHERE user_id = p_user_id;
    
    RETURN true;
END;
$$;

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cep TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
