import { describe, expect, it } from 'vitest';

import { assessListingPrice, calculateTcgHubPriceIndex } from './tcg-hub-price-index';

describe('calculateTcgHubPriceIndex', () => {
    it('returns insufficient when there are no valid observations', () => {
        const result = calculateTcgHubPriceIndex([
            { price: 0, kind: 'listing', source: 'invalid' },
            { price: Number.NaN, kind: 'listing', source: 'invalid' },
        ]);

        expect(result.price).toBeNull();
        expect(result.confidence).toBe('insufficient');
        expect(result.sampleSize).toBe(0);
    });

    it('gives verified sales more influence than isolated listings', () => {
        const result = calculateTcgHubPriceIndex([
            { price: 100, kind: 'verified_sale', source: 'TCG Megastore' },
            { price: 10, kind: 'listing', source: 'anúncio suspeito' },
            { price: 300, kind: 'listing', source: 'anúncio caro' },
        ]);

        expect(result.price).toBe(100);
        expect(result.verifiedSales).toBe(1);
    });

    it('excludes extreme outliers when there is enough data', () => {
        const result = calculateTcgHubPriceIndex([
            { price: 98, kind: 'external_sale', source: 'A' },
            { price: 100, kind: 'verified_sale', source: 'B' },
            { price: 101, kind: 'external_sale', source: 'C' },
            { price: 102, kind: 'trusted_listing', source: 'D' },
            { price: 10_000, kind: 'listing', source: 'E' },
        ]);

        expect(result.price).toBeGreaterThanOrEqual(98);
        expect(result.price).toBeLessThanOrEqual(102);
        expect(result.excludedOutliers).toBe(1);
    });
});

describe('assessListingPrice', () => {
    const reference = {
        price: 100,
        fairLow: 90,
        fairHigh: 110,
        confidence: 'medium' as const,
        sampleSize: 8,
        verifiedSales: 4,
        excludedOutliers: 0,
        methodology: 'weighted_median_v1' as const,
    };

    it('marks a price below 40% of the reference as high risk', () => {
        expect(assessListingPrice(30, reference).level).toBe('high');
    });

    it('marks a price below 65% of the reference for attention', () => {
        expect(assessListingPrice(60, reference).level).toBe('attention');
    });

    it('does not penalize a normal price', () => {
        expect(assessListingPrice(95, reference).level).toBe('normal');
    });
});
