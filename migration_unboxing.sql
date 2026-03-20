-- Tables for Unboxing Simulator (Gambit/Gacha system)

-- User's Virtual Inventory (results of opened packs)
CREATE TABLE IF NOT EXISTS public.virtual_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL,         
    card_name TEXT NOT NULL,       
    set_name TEXT NOT NULL,        
    set_id TEXT NOT NULL,          
    image_url TEXT,                
    rarity TEXT,                   
    market_value NUMERIC(10, 2) DEFAULT 0,
    is_shiny BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast user inventory fetch
CREATE INDEX IF NOT EXISTS idx_virtual_inventory_user ON public.virtual_inventory(user_id);

-- Unboxing History (for public leaderboards of sick pulls)
CREATE TABLE IF NOT EXISTS public.unboxing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    set_id TEXT NOT NULL,
    set_name TEXT NOT NULL,
    total_cost NUMERIC(10, 2) NOT NULL,
    total_value NUMERIC(10, 2) NOT NULL,
    best_pull_name TEXT,
    best_pull_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.virtual_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unboxing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own virtual inventory"
    ON public.virtual_inventory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Virtual inventory is insertable by service role/api"
    ON public.virtual_inventory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view unboxing history (leaderboard)"
    ON public.unboxing_history FOR SELECT
    USING (true);

CREATE POLICY "Unboxing history is insertable by service role/api"
    ON public.unboxing_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);
