-- Tabela de Conquistas (Achievements)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    condition_type TEXT NOT NULL, -- Ex: 'PURCHASE', 'AUCTION_WIN', 'COLLECTION_SIZE', 'ACCOUNT_CREATE'
    target_value INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rotina de migração se a tabela JÁ EXISTIA de outro teste/projeto:
DO $$
BEGIN
    -- Adicionar novas colunas se não existirem
    BEGIN
        ALTER TABLE public.achievements ADD COLUMN condition_type TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE public.achievements ADD COLUMN target_value INTEGER DEFAULT 1;
    EXCEPTION WHEN duplicate_column THEN END;

    -- Renomear icon_url para icon se a coluna se chamar icon_url
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='achievements' AND column_name='icon_url') THEN
        ALTER TABLE public.achievements RENAME COLUMN icon_url TO icon;
    END IF;
END $$;


-- Tabela de Conquistas Desbloqueadas pelos Usuários
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id) -- Impede que o usuário ganhe a mesma conquista duas vezes
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Conquistas são públicas para leitura" 
ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Usuários podem ver as próprias conquistas e de outros (público)" 
ON public.user_achievements FOR SELECT USING (true);

CREATE POLICY "Apenas serviço interno pode inserir/atualizar conquistas de usuário" 
ON public.user_achievements FOR ALL USING (auth.role() = 'service_role');

-- Inserir as 5 Conquistas (Badges) Iniciais
INSERT INTO public.achievements (id, name, description, icon, condition_type, target_value)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Iniciante TCG', 'Criou sua conta no TCG Hub', '🐣', 'ACCOUNT_CREATE', 1),
    ('22222222-2222-2222-2222-222222222222', 'Primeira Compra', 'Realizou sua primeira compra no marketplace', '🛒', 'PURCHASE', 1),
    ('33333333-3333-3333-3333-333333333333', 'Comprador Frequente', 'Finalizou 5 compras no TCG Hub', '🛍️', 'PURCHASE', 5),
    ('44444444-4444-4444-4444-444444444444', 'Mestre do Leilão', 'Venceu seu primeiro leilão', '🔨', 'AUCTION_WIN', 1),
    ('55555555-5555-5555-5555-555555555555', 'Baleia', 'Gastou mais de R$ 1000 no marketplace', '🐋', 'SPEND_AMOUNT', 1000)
ON CONFLICT DO NOTHING;
