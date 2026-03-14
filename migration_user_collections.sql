-- Create table for personal user collections
CREATE TABLE IF NOT EXISTS public.user_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    card_id TEXT, -- Optional ID from external TCG API
    name TEXT NOT NULL,
    set_name TEXT NOT NULL,
    number TEXT,
    image_url TEXT,
    language TEXT DEFAULT 'Português',
    condition TEXT DEFAULT 'NM',
    finish TEXT DEFAULT 'Normal',
    quantity INTEGER DEFAULT 1 NOT NULL,
    purchase_price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own collection."
    ON public.user_collections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own collection."
    ON public.user_collections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collection."
    ON public.user_collections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own collection."
    ON public.user_collections FOR DELETE
    USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_collections_updated_at
    BEFORE UPDATE ON public.user_collections
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
