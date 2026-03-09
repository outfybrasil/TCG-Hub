-- Add types to the global card database
ALTER TABLE public.pokemon_cards ADD COLUMN IF NOT EXISTS types TEXT[];

-- Add types and original_price (for discounts) to inventory
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS types TEXT[];
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Initialize quantity for existing items that might be NULL
UPDATE public.inventory SET quantity = 1 WHERE quantity IS NULL;

-- Update the enriched_inventory view if it exists (assuming it selects *)
-- If it's a fixed view, we might need to recreate it. 
-- Since I don't see the CREATE VIEW command in the codebase, Supabase handles it.
-- These columns will naturally appear if it's 'SELECT *'.
