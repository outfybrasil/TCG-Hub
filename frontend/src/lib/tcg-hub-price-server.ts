import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculateTcgHubPriceIndex, type PriceObservation, type TcgHubPriceIndex } from '@/lib/tcg-hub-price-index';

interface IndexLookupInput {
    cardId?: string | null;
    cardName: string;
    cardNumber?: string | null;
    condition?: string | null;
    finish?: string | null;
    language?: string | null;
}

interface CachedMarketResult {
    sites?: {
        mypCards?: { selectedPrice?: number | null };
        ligaPokemon?: { minPrice?: number | null; avgPrice?: number | null; maxPrice?: number | null };
    };
}

export async function getTcgHubReference(input: IndexLookupInput): Promise<TcgHubPriceIndex> {
    const observations: PriceObservation[] = [];

    if (input.cardId) {
        const { data: sales, error } = await supabaseAdmin
            .from('seller_orders')
            .select('unit_price, updated_at, status, seller_listings!inner(card_id, condition, finish, language)')
            .eq('seller_listings.card_id', input.cardId)
            .in('status', ['paid', 'shipped', 'delivered'])
            .order('updated_at', { ascending: false })
            .limit(50);
        if (!error) {
            for (const sale of sales || []) {
                const relation = sale.seller_listings;
                const listing = Array.isArray(relation) ? relation[0] : relation;
                if (!sameVariant(listing, input)) continue;
                observations.push({
                    price: Number(sale.unit_price), kind: 'verified_sale', source: 'TCG Hub', observedAt: sale.updated_at,
                });
            }
        }
    }

    let cacheQuery = supabaseAdmin
        .from('card_prices')
        .select('result, fetched_at')
        .eq('card_name', input.cardName)
        .order('fetched_at', { ascending: false })
        .limit(1);
    if (input.cardNumber) cacheQuery = cacheQuery.eq('card_number', input.cardNumber);
    if (input.condition) cacheQuery = cacheQuery.eq('card_condition', input.condition);
    if (input.finish) cacheQuery = cacheQuery.eq('card_finish', input.finish);
    if (input.language) cacheQuery = cacheQuery.eq('card_language', input.language);
    const { data: rows } = await cacheQuery;
    const cached = rows?.[0]?.result as CachedMarketResult | undefined;
    const observedAt = rows?.[0]?.fetched_at as string | undefined;
    const myp = cached?.sites?.mypCards?.selectedPrice;
    const liga = cached?.sites?.ligaPokemon;
    if (myp) observations.push({ price: myp, kind: 'trusted_listing', source: 'MYP Cards', observedAt });
    if (liga?.minPrice) observations.push({ price: liga.minPrice, kind: 'listing', source: 'Liga - menor', observedAt });
    if (liga?.avgPrice) observations.push({ price: liga.avgPrice, kind: 'trusted_listing', source: 'Liga - médio', observedAt });
    if (liga?.maxPrice) observations.push({ price: liga.maxPrice, kind: 'listing', source: 'Liga - maior', observedAt });
    return calculateTcgHubPriceIndex(observations);
}

function normalize(value?: string | null) {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function sameVariant(
    listing: { condition?: string | null; finish?: string | null; language?: string | null } | null | undefined,
    input: IndexLookupInput
) {
    if (!listing) return false;
    return (!input.condition || normalize(listing.condition) === normalize(input.condition))
        && (!input.finish || normalize(listing.finish) === normalize(input.finish))
        && (!input.language || normalize(listing.language) === normalize(input.language));
}
