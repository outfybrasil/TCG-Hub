import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import {
    DEFAULT_BUSINESS_RULES,
    parseBusinessRulesFromSettingsRows,
    sanitizeBusinessRules,
    type BusinessRules,
} from '@/lib/business-rules';

const BUSINESS_RULE_KEYS = [
    'credit_refund_fee_percentage',
    'credit_refund_processing_hours',
] as const;

export async function getBusinessRules(): Promise<BusinessRules> {
    const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .select('key, value')
        .in('key', [...BUSINESS_RULE_KEYS]);

    if (error) {
        console.error('Business rules lookup error:', error);
        return DEFAULT_BUSINESS_RULES;
    }

    return parseBusinessRulesFromSettingsRows(data ?? []);
}

export async function upsertBusinessRules(input?: Partial<BusinessRules> | null) {
    const rules = sanitizeBusinessRules(input);
    const timestamp = new Date().toISOString();

    const { error } = await supabaseAdmin.from('admin_settings').upsert([
        {
            key: 'credit_refund_fee_percentage',
            value: rules.creditRefundFeePercentage,
            updated_at: timestamp,
        },
        {
            key: 'credit_refund_processing_hours',
            value: rules.creditRefundProcessingHours,
            updated_at: timestamp,
        },
    ], { onConflict: 'key' });

    if (error) {
        throw error;
    }

    return rules;
}
