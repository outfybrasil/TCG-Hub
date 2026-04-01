-- ==========================================
-- SISTEMA DE AVALIAÇÕES DE VENDEDORES (REVIEWS)
-- ==========================================

-- 1. Cria a tabela de Avaliações
DROP TABLE IF EXISTS public.seller_reviews CASCADE;

CREATE TABLE public.seller_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.seller_orders(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Garante que um comprador só pode avaliar uma compra/pedido 1 vez:
    UNIQUE(order_id, buyer_id)  
);

-- Ativar RLS
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Acesso
-- Qualquer um pode ler as avaliações de um vendedor
CREATE POLICY "Publicar pode ler as avaliacoes"
ON public.seller_reviews
FOR SELECT
USING (true);

-- Apenas o comprador dono do pedido pode inserir sua avaliação
CREATE POLICY "Comprador pode avaliar seu pedido"
ON public.seller_reviews
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- O comprador também pode atualizar o texto de sua própria avaliação
CREATE POLICY "Comprador pode editar sua avaliacao"
ON public.seller_reviews
FOR UPDATE
USING (auth.uid() = buyer_id);


-- ==========================================
-- GATILHO (TRIGGER) PARA CÁLCULO AUTOMÁTICO
-- ==========================================

-- 3. Função que recalcula a Média e o Total de Avaliações
CREATE OR REPLACE FUNCTION public.update_seller_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_seller_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_seller_id := OLD.seller_id;
    ELSE
        target_seller_id := NEW.seller_id;
    END IF;

    -- Primeiro atualiza as contas
    UPDATE public.seller_profiles
    SET 
        rating_avg = (
            SELECT ROUND(AVG(rating)::numeric, 1) 
            FROM public.seller_reviews 
            WHERE seller_id = target_seller_id
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM public.seller_reviews 
            WHERE seller_id = target_seller_id
        )
    WHERE user_id = target_seller_id;

    -- Trata nulo se deletar ultima avaliação
    UPDATE public.seller_profiles
    SET rating_avg = COALESCE(rating_avg, 0)
    WHERE user_id = target_seller_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Anexar o Gatilho na tabela de Avaliações
DROP TRIGGER IF EXISTS trigger_update_seller_rating ON public.seller_reviews;
CREATE TRIGGER trigger_update_seller_rating
AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_rating();
