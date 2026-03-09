-- Add document fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'CPF';

-- Optional: Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_document_number ON public.profiles(document_number);
