-- Migration for auction subscribers

CREATE TABLE IF NOT EXISTS public.auction_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.auction_subscribers ENABLE ROW LEVEL SECURITY;

-- Only admins can see the subscribers list
CREATE POLICY "Admins can view subscribers" ON public.auction_subscribers
    FOR SELECT 
    USING (auth.jwt() ->> 'email' = 'admin@tcghub.com.br');

-- Anyone can subscribe
CREATE POLICY "Anyone can subscribe" ON public.auction_subscribers
    FOR INSERT 
    WITH CHECK (true);
