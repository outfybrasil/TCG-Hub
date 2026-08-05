export type PriceObservationKind = 'verified_sale' | 'external_sale' | 'trusted_listing' | 'listing';

export interface PriceObservation {
    price: number;
    kind: PriceObservationKind;
    source: string;
    observedAt?: string | null;
}

export type PriceConfidence = 'insufficient' | 'low' | 'medium' | 'high';

export interface TcgHubPriceIndex {
    price: number | null;
    fairLow: number | null;
    fairHigh: number | null;
    confidence: PriceConfidence;
    sampleSize: number;
    verifiedSales: number;
    excludedOutliers: number;
    methodology: 'weighted_median_v1';
}

const KIND_WEIGHT: Record<PriceObservationKind, number> = {
    verified_sale: 5,
    external_sale: 3,
    trusted_listing: 1,
    listing: 0.35,
};

function roundMoney(value: number) {
    return Math.round(value * 100) / 100;
}

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

function percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const fraction = index - lower;
    return sorted[lower + 1] === undefined
        ? sorted[lower]
        : sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower]);
}

function recencyWeight(observedAt?: string | null): number {
    if (!observedAt) return 1;
    const timestamp = new Date(observedAt).getTime();
    if (!Number.isFinite(timestamp)) return 1;
    const days = Math.max(0, (Date.now() - timestamp) / 86_400_000);
    return Math.max(0.25, Math.pow(0.5, days / 90));
}

function weightedMedian(observations: PriceObservation[]): number {
    const sorted = [...observations].sort((a, b) => a.price - b.price);
    const weights = sorted.map((item) => KIND_WEIGHT[item.kind] * recencyWeight(item.observedAt));
    const halfway = weights.reduce((sum, weight) => sum + weight, 0) / 2;
    let accumulated = 0;

    for (let index = 0; index < sorted.length; index += 1) {
        accumulated += weights[index];
        if (accumulated >= halfway) return sorted[index].price;
    }

    return sorted[sorted.length - 1].price;
}

export function calculateTcgHubPriceIndex(input: PriceObservation[]): TcgHubPriceIndex {
    const valid = input.filter((item) => Number.isFinite(item.price) && item.price > 0);
    if (valid.length === 0) {
        return {
            price: null,
            fairLow: null,
            fairHigh: null,
            confidence: 'insufficient',
            sampleSize: 0,
            verifiedSales: 0,
            excludedOutliers: 0,
            methodology: 'weighted_median_v1',
        };
    }

    const values = valid.map((item) => item.price);
    let accepted = valid;

    // IQR only becomes meaningful with at least four independent observations.
    if (valid.length >= 4) {
        const q1 = percentile(values, 0.25);
        const q3 = percentile(values, 0.75);
        const iqr = q3 - q1;
        const lowerFence = Math.max(0, q1 - 1.5 * iqr);
        const upperFence = q3 + 1.5 * iqr;
        const filtered = valid.filter((item) => item.price >= lowerFence && item.price <= upperFence);
        if (filtered.length >= 2) accepted = filtered;
    }

    const acceptedValues = accepted.map((item) => item.price);
    const indexPrice = weightedMedian(accepted);
    const verifiedSales = accepted.filter((item) => item.kind === 'verified_sale').length;
    const saleCount = accepted.filter((item) => item.kind === 'verified_sale' || item.kind === 'external_sale').length;
    const confidence: PriceConfidence = verifiedSales >= 8 && accepted.length >= 10
        ? 'high'
        : saleCount >= 3 && accepted.length >= 5
            ? 'medium'
            : accepted.length >= 2
                ? 'low'
                : 'insufficient';

    return {
        price: roundMoney(indexPrice),
        fairLow: roundMoney(accepted.length >= 3 ? percentile(acceptedValues, 0.25) : indexPrice * 0.9),
        fairHigh: roundMoney(accepted.length >= 3 ? percentile(acceptedValues, 0.75) : indexPrice * 1.1),
        confidence,
        sampleSize: accepted.length,
        verifiedSales,
        excludedOutliers: valid.length - accepted.length,
        methodology: 'weighted_median_v1',
    };
}

export type PriceRiskLevel = 'normal' | 'attention' | 'high';

export function assessListingPrice(price: number, reference: TcgHubPriceIndex | null) {
    if (!reference?.price || reference.confidence === 'insufficient') {
        return { level: 'normal' as PriceRiskLevel, ratio: null, reason: null };
    }

    const ratio = price / reference.price;
    if (ratio < 0.4) {
        return {
            level: 'high' as PriceRiskLevel,
            ratio,
            reason: 'Preço mais de 60% abaixo do Índice TCG Hub; não deve influenciar o índice antes da venda ser confirmada.',
        };
    }
    if (ratio < 0.65) {
        return {
            level: 'attention' as PriceRiskLevel,
            ratio,
            reason: 'Preço mais de 35% abaixo do Índice TCG Hub; oferta marcada para acompanhamento.',
        };
    }
    return { level: 'normal' as PriceRiskLevel, ratio, reason: null };
}
