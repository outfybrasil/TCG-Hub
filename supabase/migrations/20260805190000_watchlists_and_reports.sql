CREATE TABLE IF NOT EXISTS public.card_watchlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id text NOT NULL REFERENCES public.pokemon_cards(id) ON DELETE CASCADE,
    target_price numeric(12,2) CHECK (target_price IS NULL OR target_price > 0),
    condition text NOT NULL DEFAULT '',
    finish text NOT NULL DEFAULT '',
    language text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    last_notified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, card_id, condition, finish, language)
);

ALTER TABLE public.card_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlist" ON public.card_watchlists
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON public.card_watchlists FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_watchlists TO authenticated;

CREATE TABLE IF NOT EXISTS public.marketplace_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id uuid REFERENCES public.seller_listings(id) ON DELETE SET NULL,
    seller_id uuid REFERENCES public.seller_profiles(user_id) ON DELETE SET NULL,
    category text NOT NULL CHECK (category IN ('counterfeit', 'misleading', 'price_manipulation', 'abuse', 'non_delivery', 'other')),
    details text NOT NULL CHECK (char_length(details) BETWEEN 10 AND 1000),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    resolution text,
    resolved_by uuid REFERENCES auth.users(id),
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create reports" ON public.marketplace_reports
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users read own reports" ON public.marketplace_reports
    FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
REVOKE UPDATE, DELETE ON public.marketplace_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.marketplace_reports TO authenticated;
GRANT ALL ON public.marketplace_reports TO service_role;

CREATE INDEX IF NOT EXISTS card_watchlists_active_idx ON public.card_watchlists (card_id, active) WHERE active;
CREATE INDEX IF NOT EXISTS marketplace_reports_queue_idx ON public.marketplace_reports (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_price_watchers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, href)
    SELECT
        watch.user_id,
        'sistema',
        'Seu preço-alvo foi atingido',
        'A carta monitorada chegou a ' || to_char(NEW.index_price, 'FM999G999G990D00') || '.',
        '/marketplace/card/' || NEW.card_id || '/ofertas'
    FROM public.card_watchlists watch
    WHERE watch.card_id = NEW.card_id
      AND watch.active
      AND watch.target_price IS NOT NULL
      AND NEW.index_price IS NOT NULL
      AND NEW.index_price <= watch.target_price
      AND (watch.condition = '' OR watch.condition = COALESCE(NEW.card_condition, ''))
      AND (watch.finish = '' OR watch.finish = COALESCE(NEW.card_finish, ''))
      AND (watch.language = '' OR watch.language = COALESCE(NEW.card_language, ''))
      AND (watch.last_notified_at IS NULL OR watch.last_notified_at < now() - interval '24 hours');

    UPDATE public.card_watchlists watch
       SET last_notified_at = now(), updated_at = now()
     WHERE watch.card_id = NEW.card_id
       AND watch.active
       AND watch.target_price IS NOT NULL
       AND NEW.index_price IS NOT NULL
       AND NEW.index_price <= watch.target_price
       AND (watch.condition = '' OR watch.condition = COALESCE(NEW.card_condition, ''))
       AND (watch.finish = '' OR watch.finish = COALESCE(NEW.card_finish, ''))
       AND (watch.language = '' OR watch.language = COALESCE(NEW.card_language, ''))
       AND (watch.last_notified_at IS NULL OR watch.last_notified_at < now() - interval '24 hours');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_price_watchers_after_snapshot ON public.tcg_hub_price_snapshots;
CREATE TRIGGER notify_price_watchers_after_snapshot
AFTER INSERT ON public.tcg_hub_price_snapshots
FOR EACH ROW EXECUTE FUNCTION public.notify_price_watchers();
