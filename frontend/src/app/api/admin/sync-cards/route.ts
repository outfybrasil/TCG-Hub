import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// TCGdex API Base URL
const TCGDEX_API = 'https://api.tcgdex.net/v2/pt';

export async function POST(request: Request) {
    try {
        const { setId } = await request.json();

        if (setId) {
            // Sync specific set
            const result = await syncSet(setId);
            return NextResponse.json(result);
        } else {
            // Sync all sets (Warning: This might be heavy)
            const response = await fetch(`${TCGDEX_API}/sets`);
            const sets = await response.json();

            let totalSynced = 0;
            // For safety and to avoid timeouts, we'll only sync the last 5 sets if no ID is provided
            // or we could implement a more robust background worker.
            const setsToSync = sets.slice(-5);

            for (const set of setsToSync) {
                const result = await syncSet(set.id);
                if (result.success) totalSynced += result.count;
            }

            return NextResponse.json({
                success: true,
                message: `Sincronizados ${totalSynced} cards dos últimos 5 sets.`,
                setsSynced: setsToSync.map((s: { name: string }) => s.name)
            });
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

async function syncSet(setId: string) {
    try {
        const response = await fetch(`${TCGDEX_API}/sets/${setId}`);
        if (!response.ok) throw new Error(`Set ${setId} não encontrado na TCGdex`);

        const setData = await response.json();
        const cards = setData.cards || [];

        const cardsToInsert = cards.map((card: { id: string; localId: string; name: string; image?: string; rarity?: string }) => ({
            id: card.id,
            local_id: card.localId,
            name: card.name,
            image_url: `${card.image}/high.png`,
            set_id: setData.id,
            set_name: setData.name,
            rarity: card.rarity || 'Common',
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabaseAdmin
            .from('pokemon_cards')
            .upsert(cardsToInsert, { onConflict: 'id' });

        if (error) throw error;

        return { success: true, count: cardsToInsert.length };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`Erro ao sincronizar set ${setId}:`, err);
        return { success: false, error: msg };
    }
}
