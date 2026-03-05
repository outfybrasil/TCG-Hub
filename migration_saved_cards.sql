-- Create table for explicitly saved credit cards (token references only)
CREATE TABLE public.saved_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    mp_customer_id TEXT NOT NULL,
    mp_card_id TEXT NOT NULL,
    last_four_digits TEXT NOT NULL,
    card_brand TEXT NOT NULL,
    expiration_month TEXT NOT NULL,
    expiration_year TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, mp_card_id)
);

-- Enable RLS
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can insert their own saved cards."
    ON public.saved_cards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved cards."
    ON public.saved_cards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own saved cards."
    ON public.saved_cards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved cards."
    ON public.saved_cards FOR DELETE
    USING (auth.uid() = user_id);
