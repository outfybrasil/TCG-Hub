-- Prevent object-shadowing attacks in helper functions reported by the
-- Supabase security advisor. These functions do not need caller-controlled
-- schema resolution.
ALTER FUNCTION public.generate_order_number()
    SET search_path = public, pg_temp;

ALTER FUNCTION public.set_default_address()
    SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at_column()
    SET search_path = public, pg_temp;
