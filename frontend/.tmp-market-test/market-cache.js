"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMarketInputFromCard = buildMarketInputFromCard;
exports.buildMarketSearchKeyFromCard = buildMarketSearchKeyFromCard;
exports.buildMarketSearchKeysFromCard = buildMarketSearchKeysFromCard;
exports.summarizeMarketResult = summarizeMarketResult;
exports.buildPriceHistoryRows = buildPriceHistoryRows;
const market_pricing_1 = require("@/lib/market-pricing");
function buildMarketInputFromCard(card) {
    return {
        cardName: card.official_name || card.name || '',
        cardSet: card.official_set_name || card.set || null,
        cardNumber: card.number || null,
        condition: card.grade || null,
        finish: card.finish || null,
        language: card.language || null,
    };
}
function buildMarketSearchKeyFromCard(card) {
    return (0, market_pricing_1.buildMarketSearchKey)(buildMarketInputFromCard(card));
}
function buildMarketSearchKeysFromCard(card) {
    const base = {
        cardNumber: card.number || null,
        condition: card.grade || null,
        finish: card.finish || null,
        language: card.language || null,
    };
    const candidates = [
        { cardName: card.official_name || card.name || '', cardSet: card.official_set_name || card.set || null, ...base },
        { cardName: card.name || card.official_name || '', cardSet: card.set || card.official_set_name || null, ...base },
        { cardName: card.official_name || card.name || '', cardSet: card.set || card.official_set_name || null, ...base },
        { cardName: card.name || card.official_name || '', cardSet: card.official_set_name || card.set || null, ...base },
    ]
        .filter((candidate) => candidate.cardName)
        .map((candidate) => (0, market_pricing_1.buildMarketSearchKey)(candidate));
    return Array.from(new Set(candidates));
}
function summarizeMarketResult(result) {
    if (!result) {
        return {
            bestComparablePrice: null,
            bestComparableStore: null,
            bestAvailablePrice: null,
            bestAvailableStore: null,
            matchType: null,
            fetchedAt: null,
            storePrices: {},
        };
    }
    const storePrices = {};
    if (result.sites.mypCards.selectedPrice !== null) {
        storePrices['MYP Cards'] = result.sites.mypCards.selectedPrice;
    }
    if (result.sites.ligaPokemon.selectedPrice !== null) {
        storePrices['Liga Pokemon'] = result.sites.ligaPokemon.selectedPrice;
    }
    return {
        bestComparablePrice: result.bestMatched.price,
        bestComparableStore: result.bestMatched.store,
        bestAvailablePrice: result.bestAvailable.price,
        bestAvailableStore: result.bestAvailable.store,
        matchType: result.bestAvailable.matchType,
        fetchedAt: result.fetchedAt,
        storePrices,
    };
}
function buildPriceHistoryRows(cardId, prices) {
    const rows = [];
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
