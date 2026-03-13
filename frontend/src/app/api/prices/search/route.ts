import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lookupBrazilianMarketPrices, type MarketLookupInput, buildMarketSearchKey } from '@/lib/market-pricing';

export const runtime = 'nodejs';

const CACHE_HOURS = 6;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const input: MarketLookupInput = {
            cardName: body.cardName,
            cardSet: body.cardSet || null,
            cardNumber: body.cardNumber || null,
            condition: body.condition || null,
            finish: body.finish || null,
            language: body.language || null,
        };

        if (!input.cardName) {
            return NextResponse.json({ error: 'cardName is required' }, { status: 400 });
        }

        const searchKey = buildMarketSearchKey(input);
        const forceRefresh = body.forceRefresh === true;

        if (!forceRefresh) {
            const cached = await readCachedResult(searchKey);
            if (cached) {
                return NextResponse.json({
                    source: 'cache',
                    prices: cached,
                });
            }
        }

        const prices = await lookupBrazilianMarketPrices(input);
        await writeCachedResult(searchKey, input, prices);

        return NextResponse.json({
            source: 'live',
            prices,
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
