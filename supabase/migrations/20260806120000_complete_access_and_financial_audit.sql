BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        OR lower(coalesce(auth.jwt() ->> 'email', '')) IN ('admin@tcghub.com.br', 'contato@tcgmegastore.com.br')
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND lower(coalesce(to_jsonb(profiles) ->> 'is_admin', 'false')) = 'true'
        );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Dados financeiros: leitura apenas do titular; escritas exclusivamente por RPC/service_role.
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own wallet" ON public.wallets;
CREATE POLICY "Users read own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users read own auction credits" ON public.auction_credits;
CREATE POLICY "Users read own auction credits" ON public.auction_credits FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users read own credit transactions" ON public.credit_transactions;
CREATE POLICY "Users read own credit transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users read own purchases" ON public.purchases;
CREATE POLICY "Users read own purchases" ON public.purchases FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.wallets, public.auction_credits, public.credit_transactions, public.purchases FROM anon, authenticated;
GRANT SELECT ON public.wallets, public.auction_credits, public.credit_transactions, public.purchases TO authenticated;

-- Estoque e operações administrativas usam uma fonte única de autorização.
DROP POLICY IF EXISTS "Admins can insert inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can delete inventory" ON public.inventory;
CREATE POLICY "Admins can insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update inventory" ON public.inventory FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete inventory" ON public.inventory FOR DELETE TO authenticated USING (public.is_admin());

ALTER TABLE public.seller_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads active listings" ON public.seller_listings;
DROP POLICY IF EXISTS "Sellers manage own listings" ON public.seller_listings;
DROP POLICY IF EXISTS "Sellers insert own listings" ON public.seller_listings;
DROP POLICY IF EXISTS "Sellers update own listings" ON public.seller_listings;
DROP POLICY IF EXISTS "Sellers delete own listings" ON public.seller_listings;
CREATE POLICY "Public reads active listings" ON public.seller_listings FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR public.is_admin());
CREATE POLICY "Sellers insert own listings" ON public.seller_listings FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Sellers update own listings" ON public.seller_listings FOR UPDATE TO authenticated USING (seller_id = auth.uid() OR public.is_admin()) WITH CHECK (seller_id = auth.uid() OR public.is_admin());
CREATE POLICY "Sellers delete own listings" ON public.seller_listings FOR DELETE TO authenticated USING (seller_id = auth.uid() OR public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.seller_listings FROM anon, authenticated;
GRANT SELECT ON public.seller_listings TO anon, authenticated;

-- Trilha imutável para mudanças de saldo, reembolsos e finalizações.
CREATE TABLE IF NOT EXISTS public.financial_audit_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type text NOT NULL,
    entity_table text NOT NULL,
    entity_id text NOT NULL,
    actor_id uuid,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read financial audit" ON public.financial_audit_events;
CREATE POLICY "Admins read financial audit" ON public.financial_audit_events FOR SELECT TO authenticated USING (public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.financial_audit_events FROM anon, authenticated;
GRANT SELECT ON public.financial_audit_events TO authenticated;

CREATE OR REPLACE FUNCTION public.record_financial_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id text;
BEGIN
    v_id := coalesce(to_jsonb(NEW) ->> 'id', to_jsonb(OLD) ->> 'id', to_jsonb(NEW) ->> 'user_id', to_jsonb(OLD) ->> 'user_id', 'unknown');
    INSERT INTO public.financial_audit_events(event_type, entity_table, entity_id, actor_id, old_data, new_data)
    VALUES (TG_OP, TG_TABLE_NAME, v_id, auth.uid(), CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END, CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_financial_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_auction_credits ON public.auction_credits;
CREATE TRIGGER audit_auction_credits AFTER INSERT OR UPDATE OR DELETE ON public.auction_credits FOR EACH ROW EXECUTE FUNCTION public.record_financial_audit();
DROP TRIGGER IF EXISTS audit_credit_transactions ON public.credit_transactions;
CREATE TRIGGER audit_credit_transactions AFTER INSERT OR UPDATE OR DELETE ON public.credit_transactions FOR EACH ROW EXECUTE FUNCTION public.record_financial_audit();
DROP TRIGGER IF EXISTS audit_purchases ON public.purchases;
CREATE TRIGGER audit_purchases AFTER INSERT OR UPDATE OR DELETE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.record_financial_audit();
DROP TRIGGER IF EXISTS audit_live_history ON public.live_auction_history;
CREATE TRIGGER audit_live_history AFTER INSERT OR UPDATE OR DELETE ON public.live_auction_history FOR EACH ROW EXECUTE FUNCTION public.record_financial_audit();

COMMIT;
