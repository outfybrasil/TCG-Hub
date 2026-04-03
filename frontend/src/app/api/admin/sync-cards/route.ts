import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/server-auth';

// TCGdex API Base URL
const TCGDEX_API = 'https://api.tcgdex.net/v2/pt';

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) {
        return auth.response;
    }

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
    } catch (error: any) {
        const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error)) || 'Erro desconhecido';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

async function syncSet(setId: string) {
    try {
        // Fetch from both Portuguese and English endpoints
        const [resPt, resEn] = await Promise.all([
            fetch(`https://api.tcgdex.net/v2/pt/sets/${setId}`),
            fetch(`https://api.tcgdex.net/v2/en/sets/${setId}`)
        ]);

        if (!resPt.ok) throw new Error(`Set ${setId} não encontrado na TCGdex (PT)`);
        
        const dataPt = await resPt.json();
        const dataEn = resEn.ok ? await resEn.json() : null;

        const cardsPt = dataPt.cards || [];
        const cardsEn = dataEn?.cards || [];

        // Build mapping for English names
        const enMap = new Map<string, string>();
        if (cardsEn) {
            cardsEn.forEach((c: any) => enMap.set(c.id, c.name));
        }

        const totalOfficial = dataPt.cardCount?.official || 0;

        const cardsToInsert = cardsPt.map((card: any) => ({
            id: card.id,
            local_id: totalOfficial > 0 ? `${card.localId}/${totalOfficial}` : card.localId,
            name: card.name,
            name_en: enMap.get(card.id) || card.name, // Fallback to PT if EN not found
            image_url: `${card.image}/high.png`,
            set_id: dataPt.id,
            set_name: dataPt.name,
            set_name_en: dataEn?.name || dataPt.name, // Fallback to PT if EN not found
            rarity: card.rarity || 'Common',
            types: card.types || [],
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabaseAdmin
            .from('pokemon_cards')
            .upsert(cardsToInsert, { onConflict: 'id' });

        if (error) throw error;

        return { success: true, count: cardsToInsert.length };
    } catch (err: any) {
        const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Erro desconhecido';
        console.error(`Erro ao sincronizar set ${setId}:`, err);
        return { success: false, error: msg };
    }
}
