export interface BusinessRules {
    creditRefundFeePercentage: number;
    creditRefundProcessingHours: number;
}

export const DEFAULT_BUSINESS_RULES: BusinessRules = {
    creditRefundFeePercentage: 5,
    creditRefundProcessingHours: 48,
};

function parseNumericValue(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.replace(',', '.').trim();
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

export function sanitizeBusinessRules(input?: Partial<BusinessRules> | null): BusinessRules {
    const percentage = parseNumericValue(input?.creditRefundFeePercentage);
    const hours = parseNumericValue(input?.creditRefundProcessingHours);

    return {
        creditRefundFeePercentage: percentage !== null ? Math.max(0, Number(percentage.toFixed(2))) : DEFAULT_BUSINESS_RULES.creditRefundFeePercentage,
        creditRefundProcessingHours: hours !== null ? Math.max(1, Math.round(hours)) : DEFAULT_BUSINESS_RULES.creditRefundProcessingHours,
    };
}

export function parseBusinessRulesFromSettingsRows(rows: Array<{ key: string; value: unknown }>) {
    const partial: Partial<BusinessRules> = {};

    for (const row of rows) {
        if (row.key === 'credit_refund_fee_percentage') {
            partial.creditRefundFeePercentage = parseNumericValue(row.value) ?? undefined;
        }

        if (row.key === 'credit_refund_processing_hours') {
            partial.creditRefundProcessingHours = parseNumericValue(row.value) ?? undefined;
        }
    }

    return sanitizeBusinessRules(partial);
}

function roundCurrency(value: number) {
    return Math.round(value * 100) / 100;
}

export function calculateCreditRefundFee(amount: number, rules: BusinessRules) {
    return roundCurrency(amount * (rules.creditRefundFeePercentage / 100));
}

export function calculateCreditRefundNet(amount: number, rules: BusinessRules) {
    return roundCurrency(Math.max(amount - calculateCreditRefundFee(amount, rules), 0));
}
