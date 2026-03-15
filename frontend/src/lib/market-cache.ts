import type { MarketLookupInput, MarketLookupResult } from '@/lib/market-pricing';
import { buildMarketSearchKey } from '@/lib/market-pricing';

export interface MarketCardLike {
    id: string;
    name?: string | null;
    official_name?: string | null;
    name_en?: string | null;
    set?: string | null;
    official_set_name?: string | null;
    set_name_en?: string | null;
    number?: string | null;
    grade?: string | null;
    finish?: string | null;
    language?: string | null;
}

export interface MarketPriceSummary {
    bestComparablePrice: number | null;
    bestComparableStore: string | null;
    bestAvailablePrice: number | null;
    bestAvailableStore: string | null;
    matchType: string | null;
    fetchedAt: string | null;
    storePrices: Record<string, number>;
    storeUrls: Record<string, string>;
}

export function buildMarketInputFromCard(card: MarketCardLike): MarketLookupInput {
    return {
        cardName: card.official_name || card.name || '',
        cardNameEn: card.name_en || null,
        cardSet: card.official_set_name || card.set || null,
        cardSetEn: card.set_name_en || null,
        cardNumber: card.number || null,
        condition: card.grade || null,
        finish: card.finish || null,
        language: card.language || null,
    };
}

export function buildMarketSearchKeyFromCard(card: MarketCardLike): string {
    return buildMarketSearchKey(buildMarketInputFromCard(card));
}

export function buildMarketSearchKeysFromCard(card: MarketCardLike): string[] {
    const base = {
        cardNumber: card.number || null,
        condition: card.grade || null,
        finish: card.finish || null,
        language: card.language || null,
    };

    const candidates = [
        // Portuguese variations
        { cardName: card.official_name || card.name || '', cardSet: card.official_set_name || card.set || null, ...base },
        { cardName: card.name || card.official_name || '', cardSet: card.set || card.official_set_name || null, ...base },
        // English variations
        { cardName: card.name_en || '', cardSet: card.set_name_en || null, ...base },
        { cardName: card.name_en || '', cardSet: card.official_set_name || card.set || null, ...base },
    ]
        .filter((candidate) => candidate.cardName)
        .map((candidate) => buildMarketSearchKey(candidate));

    return Array.from(new Set(candidates));
}

export function summarizeMarketResult(result: MarketLookupResult | null | undefined): MarketPriceSummary {
    if (!result) {
        return {
            bestComparablePrice: null,
            bestComparableStore: null,
            bestAvailablePrice: null,
            bestAvailableStore: null,
            matchType: null,
            fetchedAt: null,
            storePrices: {},
            storeUrls: {},
        };
    }

    const storePrices: Record<string, number> = {};
    const storeUrls: Record<string, string> = {};

    if (result.sites.mypCards.selectedPrice !== null) {
        storePrices['MYP Cards'] = result.sites.mypCards.selectedPrice;
    }
    if (result.sites.mypCards.url) {
        storeUrls['MYP Cards'] = result.sites.mypCards.url;
    }

    if (result.sites.ligaPokemon.selectedPrice !== null) {
        storePrices['Liga Pokemon'] = result.sites.ligaPokemon.selectedPrice;
    }
    if (result.sites.ligaPokemon.url) {
        storeUrls['Liga Pokemon'] = result.sites.ligaPokemon.url;
    }

    return {
        bestComparablePrice: result.bestMatched.price,
        bestComparableStore: result.bestMatched.store,
        bestAvailablePrice: result.bestAvailable.price,
        bestAvailableStore: result.bestAvailable.store,
        matchType: result.bestAvailable.matchType,
        fetchedAt: result.fetchedAt,
        storePrices,
        storeUrls,
    };
}

export function buildPriceHistoryRows(cardId: string | null | undefined, prices: MarketLookupResult) {
    if (!cardId) {
        return [];
    }

    const rows: Array<{
        card_id: string;
        store_name: string;
        price: number;
        recorded_at: string;
    }> = [];
    const recordedAt = new Date().toISOString();

    if (prices.sites.mypCards.selectedPrice !== null) {
        rows.push({
            card_id: cardId,
            store_name: 'MYP Cards',
            price: prices.sites.mypCards.selectedPrice,
            recorded_at: recordedAt,
        });
    }

    if (prices.sites.ligaPokemon.selectedPrice !== null) {
        rows.push({
            card_id: cardId,
            store_name: 'Liga Pokemon',
            price: prices.sites.ligaPokemon.selectedPrice,
            recorded_at: recordedAt,
        });
    }

    return rows;
}
