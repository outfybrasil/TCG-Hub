-- Adiciona as colunas de tradução em inglês na tabela de cartas
ALTER TABLE public.pokemon_cards 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS set_name_en TEXT;
