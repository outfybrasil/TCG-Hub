ALTER TABLE public.pokemon_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to manage pokemon_cards" ON public.pokemon_cards;
DROP POLICY IF EXISTS "Allow public read access to pokemon_cards" ON public.pokemon_cards;
CREATE POLICY "Public can read pokemon cards" ON public.pokemon_cards
    FOR SELECT TO anon, authenticated USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.pokemon_cards FROM anon, authenticated;
GRANT SELECT ON public.pokemon_cards TO anon, authenticated;

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.inventory;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.inventory;

CREATE POLICY "Public can read inventory" ON public.inventory
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert inventory" ON public.inventory
    FOR INSERT TO authenticated WITH CHECK (
        lower(coalesce(auth.jwt() ->> 'email', '')) IN
        ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br')
    );
CREATE POLICY "Admins can update inventory" ON public.inventory
    FOR UPDATE TO authenticated
    USING (lower(coalesce(auth.jwt() ->> 'email', '')) IN
        ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'))
    WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) IN
        ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));
CREATE POLICY "Admins can delete inventory" ON public.inventory
    FOR DELETE TO authenticated
    USING (lower(coalesce(auth.jwt() ->> 'email', '')) IN
        ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br'));

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.inventory FROM anon;
GRANT SELECT ON public.inventory TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;

ALTER VIEW public.enriched_inventory SET (security_invoker = true);
REVOKE ALL ON public.enriched_inventory FROM anon, authenticated;
GRANT SELECT ON public.enriched_inventory TO anon, authenticated;

REVOKE ALL ON public.tcg_hub_price_snapshots FROM anon, authenticated;
