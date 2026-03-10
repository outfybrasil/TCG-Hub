-- Run this in the Supabase SQL Editor to allow admins to view and update all purchases and wallets

-- Policy for Purchases
CREATE POLICY "Admin can view all purchases"
ON public.purchases
FOR SELECT
USING (auth.email() IN ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));

CREATE POLICY "Admin can update all purchases"
ON public.purchases
FOR UPDATE
USING (auth.email() IN ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));

CREATE POLICY "Admin can delete purchases"
ON public.purchases
FOR DELETE
USING (auth.email() IN ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));

-- Policy for Wallets (if needed in the future for refunds)
CREATE POLICY "Admin can view all wallets"
ON public.wallets
FOR SELECT
USING (auth.email() IN ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));

CREATE POLICY "Admin can update all wallets"
ON public.wallets
FOR UPDATE
USING (auth.email() IN ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));


-- Function to decrement inventory safely upon purchase
CREATE OR REPLACE FUNCTION public.decrement_inventory(p_item_id UUID, p_quantity INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.inventory
  SET quantity = GREATEST(0, quantity - p_quantity)
  WHERE id = p_item_id;
END;
$$;

-- Function to restore inventory safely upon refund/cancellation
CREATE OR REPLACE FUNCTION public.restore_inventory(p_item_id UUID, p_quantity INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.inventory
  SET quantity = quantity + p_quantity
  WHERE id = p_item_id;
END;
$$;
