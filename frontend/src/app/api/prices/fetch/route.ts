import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lookupBrazilianMarketPrices, type MarketLookupInput } from '@/lib/market-pricing';
import { buildPriceHistoryRows } from '@/lib/market-cache';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const cardId = body.cardId as string | undefined;
        const historyCardId = (body.historyCardId as string | undefined) || null;
        const input: MarketLookupInput = {
            cardName: body.cardName,
            cardSet: body.cardSet || null,
            cardNumber: body.cardCode || body.cardNumber || null,
            condition: body.condition || null,
            finish: body.finish || null,
            language: body.language || null,
        };

        if (!cardId || !input.cardName) {
            return NextResponse.json({ error: 'cardId and cardName are required' }, { status: 400 });
        }

        const prices = await lookupBrazilianMarketPrices(input);
        const hasAnyPrice =
            prices.sites.mypCards.selectedPrice !== null ||
            prices.sites.ligaPokemon.selectedPrice !== null;
        const insertRows = buildPriceHistoryRows(historyCardId, prices);

        if (!hasAnyPrice) {
            return NextResponse.json({
                error: 'Nenhum preco disponivel nos sites monitorados.',
                prices,
            }, { status: 404 });
        }

        if (insertRows.length > 0) {
            const { error } = await supabaseAdmin.from('price_history').insert(insertRows);
            if (error) {
                throw error;
            }
        }

        return NextResponse.json({
            success: true,
            inserted: insertRows,
            historySkipped: insertRows.length === 0,
            prices,
        });
    } catch (error) {
        console.error('Price fetch error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}
