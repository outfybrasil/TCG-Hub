-- Add PSA/Grading fields to user_collections
ALTER TABLE public.user_collections
    ADD COLUMN IF NOT EXISTS grading_company TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS grading_score NUMERIC DEFAULT NULL;

-- Add PSA/Grading fields to inventory (admin store)
ALTER TABLE public.inventory
    ADD COLUMN IF NOT EXISTS grading_company TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS grading_score NUMERIC DEFAULT NULL;

-- COMMENT: grading_company values: 'PSA', 'CGC', 'BGS' (Beckett), 'TAG', 'ACE', or NULL (ungraded)
-- COMMENT: grading_score values: 1-10 scale (e.g. 10 = Gem Mint, 9.5 = Gem Mint, 9 = Mint, etc.)
