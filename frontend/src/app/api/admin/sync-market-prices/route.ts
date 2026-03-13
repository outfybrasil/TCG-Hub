import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lookupBrazilianMarketPrices } from '@/lib/market-pricing';
import {
    buildMarketInputFromCard,
    buildMarketSearchKeyFromCard,
    buildPriceHistoryRows,
    type MarketCardLike,
} from '@/lib/market-cache';
import { requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 20;
const CHUNK_SIZE = 3;

interface InventorySyncCard extends MarketCardLike {
    card_id?: string | null;
    created_at?: string;
    quantity?: number;
}

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const body = await request.json().catch(() => ({}));
        const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_LIMIT, 1), 100);

        const { data, error } = await supabaseAdmin
            .from('inventory')
            .select('id, card_id, name, set, number, grade, finish, language, created_at, quantity')
            .gt('quantity', 0)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw error;
        }

        const cards = (data || []) as InventorySyncCard[];
        let synced = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let start = 0; start < cards.length; start += CHUNK_SIZE) {
            const chunk = cards.slice(start, start + CHUNK_SIZE);
            const results = await Promise.allSettled(
                chunk.map(async (card) => {
                    const input = buildMarketInputFromCard(card);
                    if (!input.cardName) {
                        throw new Error(`Carta ${card.id} sem nome valido.`);
                    }

                    const prices = await lookupBrazilianMarketPrices(input);
                    const searchKey = buildMarketSearchKeyFromCard(card);

                    const { error: cacheError } = await supabaseAdmin
                        .from('card_prices')
                        .upsert({
                            search_key: searchKey,
                            card_name: input.cardName,
                            card_set: input.cardSet,
                            card_number: input.cardNumber,
                            card_condition: input.condition,
                            card_finish: input.finish,
                            card_language: input.language,
                            result: prices,
                            fetched_at: new Date().toISOString(),
                        }, { onConflict: 'search_key' });

                    if (cacheError) {
                        throw new Error(`Falha ao salvar cache (${searchKey}): ${cacheError.message}`);
                    }

                    const historyRows = buildPriceHistoryRows(card.card_id, prices);
                    if (historyRows.length > 0) {
                        const { error: historyError } = await supabaseAdmin
                            .from('price_history')
                            .insert(historyRows);

                        if (historyError) {
                            throw new Error(`Falha ao salvar historico (${searchKey}): ${historyError.message}`);
                        }
                    }
                })
            );

            for (let index = 0; index < results.length; index += 1) {
                const result = results[index];
                if (result.status === 'fulfilled') {
                    synced += 1;
                } else {
                    failed += 1;
                    errors.push(`${chunk[index].name || chunk[index].id}: ${result.reason instanceof Error ? result.reason.message : 'falha desconhecida'}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            processed: cards.length,
            synced,
            failed,
            errors: errors.slice(0, 10),
        });
    } catch (error) {
        console.error('Sync market prices error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}
