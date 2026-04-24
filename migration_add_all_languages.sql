-- Adiciona as colunas de tradução para Espanhol na tabela de cartas
ALTER TABLE public.pokemon_cards 
ADD COLUMN IF NOT EXISTS name_es TEXT,
ADD COLUMN IF NOT EXISTS set_name_es TEXT;

-- Para indexar as buscas se o volume de cartas for alto (opcional, pode demorar no supabase se tiver muitos dados)
-- CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name_es ON public.pokemon_cards USING gin (name_es gin_trgm_ops);
