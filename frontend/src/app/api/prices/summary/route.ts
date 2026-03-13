import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
    buildMarketSearchKeysFromCard,
    summarizeMarketResult,
    type MarketCardLike,
} from '@/lib/market-cache';
import type { MarketLookupResult } from '@/lib/market-pricing';

export const runtime = 'nodejs';

interface CachedPriceRow {
    search_key: string;
    result: MarketLookupResult | null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const cards = Array.isArray(body.cards) ? (body.cards as MarketCardLike[]) : [];

        if (cards.length === 0) {
            return NextResponse.json({ summaries: {} });
        }

        const lookup = new Map<string, string[]>();
        const searchKeys = Array.from(new Set(cards.flatMap((card) => {
            const keys = buildMarketSearchKeysFromCard(card);
            lookup.set(card.id, keys);
            return keys;
        })));

        if (searchKeys.length === 0) {
            return NextResponse.json({ summaries: {} });
        }

        const { data, error } = await supabaseAdmin
            .from('card_prices')
            .select('search_key, result')
            .in('search_key', searchKeys);

        if (error) {
            throw error;
        }

        const resultByKey = new Map<string, MarketLookupResult | null>(
            ((data as CachedPriceRow[] | null) || []).map((row) => [row.search_key, row.result])
        );

        const summaries = Object.fromEntries(
            cards.map((card) => {
                const keys = lookup.get(card.id) || [];
                const result = keys
                    .map((key) => resultByKey.get(key))
                    .find((entry) => entry !== undefined) || null;
                return [card.id, summarizeMarketResult(result)];
            })
        );

        return NextResponse.json({ summaries });
    } catch (error) {
        console.error('Price summary error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
