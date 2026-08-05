import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/server-auth';

export const maxDuration = 300; // 5 minutos para conjuntos grandes

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) return auth.response;

    const url = new URL(request.url);
    const setId = url.searchParams.get('setId') || 'me03';

    // 1. Checar o que está no banco
    const { data: dbCards, error } = await supabaseAdmin
        .from('pokemon_cards')
        .select('id, name, rarity, types')
        .eq('set_id', setId)
        .order('id');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rarityCounts: Record<string, number> = {};
    dbCards?.forEach(c => {
        rarityCounts[c.rarity || 'NULL'] = (rarityCounts[c.rarity || 'NULL'] || 0) + 1;
    });

    // 2. Testar alguns cards na API TCGdex
    const sampleIds = dbCards?.slice(0, 5).map(c => c.id) || [];
    const apiSamples = await Promise.all(
        sampleIds.map(async (cardId) => {
            try {
                const res = await fetch(`https://api.tcgdex.net/v2/pt/cards/${cardId}`);
                if (res.ok) {
                    const d = await res.json();
                    return { id: cardId, rarity: d.rarity, types: d.types };
                }
                return { id: cardId, error: `HTTP ${res.status}` };
            } catch (e: any) {
                return { id: cardId, error: e.message };
            }
        })
    );

    return NextResponse.json({
        setId,
        totalInDB: dbCards?.length,
        rarityCounts,
        apiSample: apiSamples,
        message: 'Se rarityCounts mostrar apenas Common/Comum, o sync está falhando. Se apiSample mostrar raridades corretas, o problema é no salvamento.'
    });
}

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) return auth.response;

    const { setId } = await request.json();
    if (!setId) return NextResponse.json({ error: 'setId obrigatório' }, { status: 400 });

    // Busca os cards do banco para saber quais IDs existem
    const { data: dbCards, error: dbErr } = await supabaseAdmin
        .from('pokemon_cards')
        .select('id')
        .eq('set_id', setId);

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    const cardIds = dbCards?.map(c => c.id) || [];
    const batchSize = 10;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < cardIds.length; i += batchSize) {
        const batch = cardIds.slice(i, i + batchSize);

        await Promise.all(batch.map(async (cardId) => {
            try {
                // Tenta PT depois EN
                for (const lang of ['pt', 'en', 'fr']) {
                    const res = await fetch(`https://api.tcgdex.net/v2/${lang}/cards/${cardId}`);
                    if (res.ok) {
                        const detail = await res.json();
                        if (detail.rarity) {
                            const { error: updateErr } = await supabaseAdmin
                                .from('pokemon_cards')
                                .update({
                                    rarity: detail.rarity,
                                    types: detail.types || [],
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', cardId);

                            if (updateErr) {
                                errors.push(`${cardId}: ${updateErr.message}`);
                                failed++;
                            } else {
                                updated++;
                            }
                            return;
                        }
                    }
                }
                failed++;
                errors.push(`${cardId}: rarity não encontrada em nenhum idioma`);
            } catch (e: any) {
                failed++; 
                errors.push(`${cardId}: ${e.message}`);
            }
        }));

        // Pequena pausa entre batches para não sobrecarregar a API
        if (i + batchSize < cardIds.length) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    return NextResponse.json({
        success: true,
        setId,
        total: cardIds.length,
        updated,
        failed,
        errors: errors.slice(0, 20) // Primeiros 20 erros para diagnóstico
    });
}
