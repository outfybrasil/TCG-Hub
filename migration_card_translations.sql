-- Add English translation columns to pokemon_cards
ALTER TABLE public.pokemon_cards ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.pokemon_cards ADD COLUMN IF NOT EXISTS set_name_en TEXT;

-- Index for translation performance
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name_en ON public.pokemon_cards (name_en);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_set_name_en ON public.pokemon_cards (set_name_en);
