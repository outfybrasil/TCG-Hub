-- migration_profile.sql
-- Run this in your Supabase SQL Editor to create the Public Profiles & Achievements schema.

-- 1. Table: user_profiles
CREATE TABLE public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    title TEXT DEFAULT 'Iniciante',
    favorite_card_1 UUID REFERENCES public.virtual_inventory(id) ON DELETE SET NULL,
    favorite_card_2 UUID REFERENCES public.virtual_inventory(id) ON DELETE SET NULL,
    favorite_card_3 UUID REFERENCES public.virtual_inventory(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis são visíveis para todos" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem editar seu próprio perfil" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu próprio perfil" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Table: achievements
CREATE TABLE public.achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    xp_reward INTEGER DEFAULT 0,
    category TEXT DEFAULT 'general',
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conquistas são visíveis para todos" ON public.achievements FOR SELECT USING (true);


-- 3. Table: user_achievements
CREATE TABLE public.user_achievements (
    user_id UUID REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);

-- Row Level Security for user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conquistas de usuários são visíveis para todos" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Sistema pode inserir conquistas" ON public.user_achievements FOR INSERT WITH CHECK (true);


-- 4. Inserir Conquistas Base
INSERT INTO public.achievements (id, name, description, xp_reward, icon_url, category) VALUES
('first_blood', 'Primeiro Sangue', 'Abriu seu primeiro booster virtual no Gacha Hub.', 100, '🎁', 'gacha'),
('lucky_bastard', 'Mão Santa', 'Tirou uma carta Rara Brilhante (Holo/Secret/Ultra) no Gacha Hub.', 500, '✨', 'gacha'),
('whale', 'Baleia', 'Gastou mais de R$ 1.000,00 na loja.', 1000, '🐋', 'store'),
('sniper', 'Franco-Atirador', 'Ganhou um leilão dando lance nos últimos 3 minutos.', 300, '🎯', 'auction'),
('pioneer', 'Pioneiro', 'Criador de conta raiz nos primeiros meses da plataforma.', 200, '💎', 'general')
ON CONFLICT (id) DO NOTHING;

-- 5. RPC (Stored Procedure) to Grant Achievement Safely
-- This allows the Supabase Client to call this RPC directly bypassing RLS if it's SECURITY DEFINER
CREATE OR REPLACE FUNCTION grant_achievement(p_user_id UUID, p_achievement_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_xp_reward INTEGER;
BEGIN
    -- Check if already unlocked
    IF EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = p_achievement_id) THEN
        RETURN FALSE;
    END IF;

    -- Ensure profile exists, if not, create a blank one
    INSERT INTO public.user_profiles (user_id, nickname) 
    VALUES (p_user_id, 'User_' || substr(p_user_id::text, 1, 8))
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert Achievement
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, p_achievement_id)
    ON CONFLICT DO NOTHING;

    -- Fetch XP
    SELECT xp_reward INTO v_xp_reward FROM public.achievements WHERE id = p_achievement_id;

    -- Add XP to Profile
    UPDATE public.user_profiles
    SET xp = xp + COALESCE(v_xp_reward, 0)
    WHERE user_id = p_user_id;

    RETURN TRUE;
END;
$$;
