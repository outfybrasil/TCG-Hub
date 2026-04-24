-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.live_auction_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    live_id UUID NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_type TEXT DEFAULT 'Carta',
    item_image TEXT,
    winner_id UUID NOT NULL REFERENCES auth.users(id),
    winner_name TEXT NOT NULL,
    final_bid NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.live_auction_history ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
-- Allow anyone to read the history (since it's public on the live page)
CREATE POLICY "Public read access for live history"
    ON public.live_auction_history
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert (we also use supabaseAdmin to bypass, but this is good practice)
CREATE POLICY "Authenticated users can insert history"
    ON public.live_auction_history
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Enable Realtime for the table
BEGIN;
  -- Remove the table from the publication if it's already there (to avoid errors)
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.live_auction_history;
  -- Add the table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_auction_history;
COMMIT;
