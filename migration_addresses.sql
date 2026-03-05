-- MULTI-ADDRESS SUPPORT
-- 1. Create user_addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT DEFAULT 'Principal',
    cep TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add RLS Policies
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own addresses" ON public.user_addresses
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Migration: Move existing data from profiles to user_addresses
INSERT INTO public.user_addresses (user_id, cep, street, number, complement, neighborhood, city, state, is_default)
SELECT id, cep, street, number, complement, neighborhood, city, state, true
FROM public.profiles
ON CONFLICT DO NOTHING;

-- 4. Create function to ensure only one default address per user
CREATE OR REPLACE FUNCTION set_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.user_addresses
        SET is_default = false
        WHERE user_id = NEW.user_id AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_set_default_address
BEFORE INSERT OR UPDATE ON public.user_addresses
FOR EACH ROW EXECUTE FUNCTION set_default_address();
-- 5. Add shipping_address to purchases table
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS shipping_address JSONB;
