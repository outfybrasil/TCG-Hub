CREATE TABLE IF NOT EXISTS public.live_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    live_id uuid NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name text NOT NULL,
    message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 300),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.live_chat_bans (
    live_id uuid NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    banned_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (live_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_chat_messages_timeline_idx ON public.live_chat_messages(live_id, created_at DESC);
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read visible live chat" ON public.live_chat_messages;
CREATE POLICY "Public can read visible live chat" ON public.live_chat_messages FOR SELECT USING (deleted_at IS NULL);
GRANT SELECT ON public.live_chat_messages TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.live_chat_messages FROM anon, authenticated;
REVOKE ALL ON public.live_chat_bans FROM anon, authenticated;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
