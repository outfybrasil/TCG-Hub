import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildMarketSearchKeysFromCard, type MarketCardLike } from '@/lib/market-cache';

export const runtime = 'nodejs';

interface InventoryStatsCard extends MarketCardLike {
    quantity?: number | null;
}

interface CachedRow {
    search_key: string;
    fetched_at: string | null;
}

export async function GET() {
    try {
        const [inventoryRes, cacheRes, historyRes] = await Promise.all([
            supabaseAdmin
                .from('inventory')
                .select('id, name, set, number, grade, finish, language, quantity')
                .gt('quantity', 0),
            supabaseAdmin
                .from('card_prices')
                .select('search_key, fetched_at'),
            supabaseAdmin
                .from('price_history')
                .select('*', { count: 'exact', head: true }),
        ]);

        if (inventoryRes.error) throw inventoryRes.error;
        if (cacheRes.error) throw cacheRes.error;
        if (historyRes.error) throw historyRes.error;

        const inventory = (inventoryRes.data || []) as InventoryStatsCard[];
        const cacheRows = (cacheRes.data || []) as CachedRow[];
        const cacheKeys = new Set(cacheRows.map((row) => row.search_key));
        const refreshedSince = Date.now() - 24 * 60 * 60 * 1000;

        let cachedItems = 0;
        let refreshed24h = 0;

        for (const card of inventory) {
            const keys = buildMarketSearchKeysFromCard(card);
            const matchedRows = cacheRows.filter((row) => keys.includes(row.search_key));

            if (matchedRows.length > 0) {
                cachedItems += 1;
            }

            if (matchedRows.some((row) => row.fetched_at && new Date(row.fetched_at).getTime() >= refreshedSince)) {
                refreshed24h += 1;
            }
        }

        const lastFetchedAt = cacheRows
            .map((row) => row.fetched_at)
            .filter(Boolean)
            .sort((left, right) => new Date(right as string).getTime() - new Date(left as string).getTime())[0] || null;

        return NextResponse.json({
            success: true,
            activeInventory: inventory.length,
            cachedItems,
            uncachedItems: Math.max(inventory.length - cachedItems, 0),
            cachedKeys: cacheKeys.size,
            refreshed24h,
            historySnapshots: historyRes.count || 0,
            lastFetchedAt,
        });
    } catch (error) {
        console.error('Sync market price stats error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}
