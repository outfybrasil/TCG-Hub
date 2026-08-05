import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { lookupBrazilianMarketPrices, type MarketLookupInput } from '@/lib/market-pricing';
import { buildPriceHistoryRows } from '@/lib/market-cache';
import { getTcgHubReference } from '@/lib/tcg-hub-price-server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;
    const rate = checkRateLimit(`price-fetch:${auth.user.id}`, 10, 10 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

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

        const calculatedIndex = await getTcgHubReference({
            cardId: historyCardId || cardId,
            cardName: input.cardName,
            cardNumber: input.cardNumber,
            condition: input.condition,
            finish: input.finish,
            language: input.language,
        });
        const hubIndex = calculatedIndex.price !== null ? calculatedIndex : prices.hubIndex;
        const { error: snapshotError } = await supabaseAdmin.from('tcg_hub_price_snapshots').insert({
            card_id: historyCardId || cardId,
            card_condition: input.condition,
            card_finish: input.finish,
            card_language: input.language,
            index_price: hubIndex.price,
            fair_low: hubIndex.fairLow,
            fair_high: hubIndex.fairHigh,
            confidence: hubIndex.confidence,
            sample_size: hubIndex.sampleSize,
            verified_sales: hubIndex.verifiedSales,
            excluded_outliers: hubIndex.excludedOutliers,
            methodology: hubIndex.methodology,
        });
        if (snapshotError && snapshotError.code !== '42P01' && snapshotError.code !== 'PGRST205') {
            console.warn('Price index snapshot skipped:', snapshotError.message);
        }

        return NextResponse.json({
            success: true,
            inserted: insertRows,
            historySkipped: insertRows.length === 0,
            prices: { ...prices, hubIndex },
        });
    } catch (error) {
        console.error('Price fetch error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}
