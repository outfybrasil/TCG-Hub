-- migration_cashback_to_credits.sql
-- Run this in your Supabase SQL Editor to allow users to convert loyal rewards to credits.

CREATE OR REPLACE FUNCTION public.convert_cashback_to_credits(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS for systemic balance update
AS $$
DECLARE
    v_wallet_balance NUMERIC;
BEGIN
    -- 1. Check current wallet balance
    SELECT balance INTO v_wallet_balance FROM public.wallets WHERE user_id = p_user_id;
    
    IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo de cashback insuficiente.';
    END IF;

    -- 2. Deduct from Wallets
    UPDATE public.wallets 
    SET balance = balance - p_amount 
    WHERE user_id = p_user_id;

    -- 3. Add to Auction Credits
    -- Ensure row exists
    INSERT INTO public.auction_credits (user_id, balance, locked)
    VALUES (p_user_id, p_amount, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.auction_credits.balance + p_amount;

    -- 4. Record Transaction
    INSERT INTO public.credit_transactions (user_id, type, amount, note)
    VALUES (p_user_id, 'deposit', p_amount, 'Conversão de Cashback');

    RETURN TRUE;
END;
$$;
