import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { lookupBrazilianMarketPrices, type MarketLookupInput, buildMarketSearchKey } from '@/lib/market-pricing';
import { getTcgHubReference } from '@/lib/tcg-hub-price-server';

export const runtime = 'nodejs';

const CACHE_HOURS = 6;

export async function POST(request: Request) {
    const clientAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = checkRateLimit(`price-search:${clientAddress}`, 20, 10 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

    try {
        const body = await request.json();
        const normalize = (value: unknown, maxLength: number) =>
            typeof value === 'string' ? value.trim().slice(0, maxLength) : null;
        const input: MarketLookupInput = {
            cardName: normalize(body.cardName, 120) || '',
            cardSet: normalize(body.cardSet, 120),
            cardNumber: normalize(body.cardNumber, 40),
            condition: normalize(body.condition, 40),
            finish: normalize(body.finish, 40),
            language: normalize(body.language, 20),
        };
        const cardId = normalize(body.cardId, 120);

        if (!input.cardName) {
            return NextResponse.json({ error: 'cardName is required' }, { status: 400 });
        }

        const searchKey = buildMarketSearchKey(input);
        const cached = await readCachedResult(searchKey);
        if (cached) {
            const hubIndex = await getTcgHubReference({ ...input, cardId });
            return NextResponse.json({
                source: 'cache',
                prices: { ...cached, hubIndex: hubIndex.price !== null ? hubIndex : cached.hubIndex },
            });
        }

        const prices = await lookupBrazilianMarketPrices(input);
        await writeCachedResult(searchKey, input, prices);
        const hubIndex = await getTcgHubReference({ ...input, cardId });

        return NextResponse.json({
            source: 'live',
            prices: { ...prices, hubIndex: hubIndex.price !== null ? hubIndex : prices.hubIndex },
        });
    } catch (error) {
        console.error('Price search error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

async function readCachedResult(searchKey: string) {
    try {
        const cacheExpiry = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
            .from('card_prices')
            .select('result, fetched_at')
            .eq('search_key', searchKey)
            .gte('fetched_at', cacheExpiry)
            .single();

        if (error || !data?.result) {
            return null;
        }

        return data.result;
    } catch (error) {
        console.warn('Price cache read skipped:', error);
        return null;
    }
}

async function writeCachedResult(searchKey: string, input: MarketLookupInput, result: unknown) {
    try {
        const { error } = await supabaseAdmin
            .from('card_prices')
            .upsert({
                search_key: searchKey,
                card_name: input.cardName,
                card_set: input.cardSet,
                card_number: input.cardNumber,
                card_condition: input.condition,
                card_finish: input.finish,
                card_language: input.language,
                result,
                fetched_at: new Date().toISOString(),
            }, { onConflict: 'search_key' });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.warn('Price cache write skipped:', error);
    }
}
