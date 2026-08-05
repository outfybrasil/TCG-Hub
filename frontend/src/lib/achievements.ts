import { supabaseAdmin } from '@/lib/supabase-admin';

export type ConditionType = 'ACCOUNT_CREATE' | 'PURCHASE' | 'AUCTION_WIN' | 'SPEND_AMOUNT' | 'COLLECTION_SIZE';

/**
 * Avalia o progresso de um usuário e destrava conquistas, se aplicável.
 * 
 * @param userId - ID do usuário autenticado no Supabase
 * @param type - O tipo de ação realizada
 * @param currentValue - O valor atual do usuário para aquela ação (ex: 5 compras totais, R$ 1200 gastos)
 * @returns Array com as novas conquistas recém desbloqueadas (se houver)
 */
export async function checkAndUnlockAchievements(
    userId: string, 
    type: ConditionType, 
    currentValue: number
) {
    try {
        // 1. Buscar todas as conquistas do tipo correspondente
        const { data: achievements, error: fetchError } = await supabaseAdmin
            .from('achievements')
            .select('*')
            .eq('condition_type', type)
            .lte('target_value', currentValue); // Apenas buscar aquelas cuja meta já foi atingida

        if (fetchError || !achievements || achievements.length === 0) {
            return [];
        }

        const unlockedBadges = [];

        // 2. Tentar inserir cada conquista no perfil do usuário
        for (const achievement of achievements) {
            const { error: insertError } = await supabaseAdmin
                .from('user_achievements')
                .insert({
                    user_id: userId,
                    achievement_id: achievement.id,
                });

            // Se der erro de 'unique constraint', significa que o usuário já tinha ganhado ela
            if (!insertError) {
                unlockedBadges.push(achievement);
            }
        }

        return unlockedBadges;
    } catch (err) {
        console.error('[Achievements API] Erro ao destravar conquistas:', err);
        return [];
    }
}

/**
 * Busca todas as conquistas de um usuário.
 */
export async function getUserAchievements(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('user_achievements')
        .select(`
            unlocked_at,
            achievements ( id, name, description, icon )
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

    if (error) {
        console.error('[Achievements API] Erro ao buscar conquistas do usuário:', error);
        return [];
    }

    return data.map(item => ({
        unlockedAt: item.unlocked_at,
        ...item.achievements
    }));
}
