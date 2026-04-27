import { NextResponse } from 'next/server';
import TCGdex from '@tcgdex/sdk';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/server-auth';

export const maxDuration = 300;

// Instâncias SDK por idioma
const sdks: Record<string, TCGdex> = {
    pt: new TCGdex('pt'),
    en: new TCGdex('en'),
    es: new TCGdex('es'),
    it: new TCGdex('it'),
    de: new TCGdex('de'),
    fr: new TCGdex('fr'),
};

const LANG_ORDER = ['pt', 'en', 'es', 'it', 'de', 'fr'] as const;

const SET_NAME_OVERRIDES: Record<string, string> = {
    sv09: 'Parceiros Iniciais',
    me03: 'Equilíbrio Perfeito',
};

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) return auth.response;

    try {
        const { setId } = await request.json();

        if (setId) {
            const result = await syncSet(setId);
            return NextResponse.json(result);
        }

        // Sync últimos 5 sets se nenhum ID fornecido
        const sets = await sdks['pt'].set.list();
        if (!sets) throw new Error('Não foi possível obter a lista de sets da TCGdex.');

        let totalSynced = 0;
        const setsToSync = sets.slice(-5);

        for (const set of setsToSync) {
            const result = await syncSet(set.id);
            if (result.success) totalSynced += result.count ?? 0;
        }

        return NextResponse.json({
            success: true,
            message: `Sincronizados ${totalSynced} cards dos últimos 5 sets.`,
            setsSynced: setsToSync.map(s => s.name),
        });
    } catch (error: any) {
        const msg = error?.message ?? String(error) ?? 'Erro desconhecido';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

async function syncSet(setId: string) {
    try {
        // Busca o set em todos os idiomas em paralelo
        const setResults = await Promise.all(
            LANG_ORDER.map(lang => sdks[lang].set.get(setId).catch(() => null))
        );

        // Monta um map de idioma → dados do set
        const setByLang: Record<string, Awaited<ReturnType<TCGdex['set']['get']>>> = {};
        LANG_ORDER.forEach((lang, i) => { setByLang[lang] = setResults[i]; });

        // Fallback PT → EN → qualquer um disponível
        const primarySet = setByLang['pt'] ?? setByLang['en'] ?? setResults.find(s => s !== null);
        if (!primarySet) throw new Error(`Set "${setId}" não encontrado em nenhum idioma na TCGdex.`);

        const totalOfficial = primarySet.cardCount?.official ?? 0;
        const cardList = primarySet.cards ?? [];

        console.log(`[sync] ${setId}: ${cardList.length} cards encontrados.`);

        const batchSize = 10;
        let withRarity = 0;
        let withoutRarity = 0;
        let savedCount = 0;
        const sampleFailures: string[] = [];
        const upsertErrors: string[] = [];

        for (let i = 0; i < cardList.length; i += batchSize) {
            const batch = cardList.slice(i, i + batchSize);

            // Busca detalhes de cada carta com fallback por idioma
            const detailedCards = await Promise.all(
                batch.map(async (cardBrief) => {
                    for (const lang of ['pt', 'en', 'fr'] as const) {
                        try {
                            const detail = await sdks[lang].card.get(cardBrief.id);
                            if (detail) return { detail, lang };
                        } catch { /* tenta próximo idioma */ }
                    }
                    return null;
                })
            );

            const batchToSave: any[] = [];

            for (let j = 0; j < batch.length; j++) {
                const cardBrief = batch[j];
                const result = detailedCards[j];
                const detail = result?.detail;

                if (detail?.rarity) {
                    withRarity++;
                } else {
                    withoutRarity++;
                    if (sampleFailures.length < 5) {
                        sampleFailures.push(`${cardBrief.id}: sem rarity`);
                    }
                }

                // Nomes por idioma a partir dos sets multilíngue
                const nameByLang = (lang: string) =>
                    (setByLang[lang]?.cards?.find(c => c.id === cardBrief.id) as any)?.name ?? cardBrief.name;

                batchToSave.push({
                    id: cardBrief.id,
                    local_id: totalOfficial > 0
                        ? `${cardBrief.localId}/${totalOfficial}`
                        : cardBrief.localId,
                    name: cardBrief.name,
                    name_en: nameByLang('en'),
                    name_es: nameByLang('es'),
                    name_it: nameByLang('it'),
                    name_de: nameByLang('de'),
                    name_fr: nameByLang('fr'),
                    image_url: detail?.getImageURL('high', 'png')
                        ?? `${(cardBrief as any).image}/high.png`,
                    set_id: primarySet.id,
                    set_name: SET_NAME_OVERRIDES[primarySet.id] ?? primarySet.name,
                    set_name_en: setByLang['en']?.name ?? primarySet.name,
                    set_name_es: setByLang['es']?.name ?? primarySet.name,
                    set_name_it: setByLang['it']?.name ?? primarySet.name,
                    set_name_de: setByLang['de']?.name ?? primarySet.name,
                    set_name_fr: setByLang['fr']?.name ?? primarySet.name,
                    rarity: detail?.rarity ?? 'Comum',
                    types: detail?.types ?? [],
                    updated_at: new Date().toISOString(),
                });
            }

            // Upsert por batch — falha parcial não perde tudo
            const { error: batchError } = await supabaseAdmin
                .from('pokemon_cards')
                .upsert(batchToSave, { onConflict: 'id' });

            if (batchError) {
                upsertErrors.push(`Batch ${i}–${i + batchSize}: ${batchError.message}`);
                console.error('[sync] Upsert error:', batchError);
            } else {
                savedCount += batchToSave.length;
            }

            // Pausa entre batches para não sobrecarregar a TCGdex
            if (i + batchSize < cardList.length) {
                await new Promise(r => setTimeout(r, 300));
            }
        }

        return {
            success: true,
            count: savedCount,
            withRarity,
            withoutRarity,
            sampleFailures,
            upsertErrors,
        };
    } catch (err: any) {
        const msg = err?.message ?? String(err) ?? 'Erro desconhecido';
        console.error(`[sync] Erro ao sincronizar set ${setId}:`, err);
        return { success: false, error: msg };
    }
}
