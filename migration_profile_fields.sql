-- Add new fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update existing profiles with names from auth.users metadata
UPDATE public.profiles p
SET full_name = u.raw_user_meta_data->>'name'
FROM auth.users u
WHERE p.id = u.id AND p.full_name IS NULL;
