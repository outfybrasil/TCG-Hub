import { NextResponse } from 'next/server';

import { DEFAULT_BUSINESS_RULES, type BusinessRules } from '@/lib/business-rules';
import { upsertBusinessRules } from '@/lib/business-rules-server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/server-auth';

interface AdminSettingsPayload {
    token?: string;
    origin?: Record<string, unknown> | null;
    businessRules?: Partial<BusinessRules> | null;
}

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('admin_settings')
            .select('key, value')
            .in('key', [
                'melhor_envio_token',
                'origin_address',
                'credit_refund_fee_percentage',
                'credit_refund_processing_hours',
            ]);

        if (error) {
            throw error;
        }

        const tokenRow = data?.find((item) => item.key === 'melhor_envio_token');
        const originRow = data?.find((item) => item.key === 'origin_address');
        const refundFeeRow = data?.find((item) => item.key === 'credit_refund_fee_percentage');
        const refundHoursRow = data?.find((item) => item.key === 'credit_refund_processing_hours');
        const refundFee = typeof refundFeeRow?.value === 'number'
            ? refundFeeRow.value
            : Number(refundFeeRow?.value ?? DEFAULT_BUSINESS_RULES.creditRefundFeePercentage);
        const refundHours = typeof refundHoursRow?.value === 'number'
            ? refundHoursRow.value
            : Number(refundHoursRow?.value ?? DEFAULT_BUSINESS_RULES.creditRefundProcessingHours);

        return NextResponse.json({
            token: tokenRow?.value ? String(tokenRow.value).replace(/"/g, '') : '',
            origin: originRow?.value && typeof originRow.value === 'object' ? originRow.value : null,
            businessRules: {
                creditRefundFeePercentage: Number.isFinite(refundFee) ? refundFee : DEFAULT_BUSINESS_RULES.creditRefundFeePercentage,
                creditRefundProcessingHours: Number.isFinite(refundHours) ? Math.round(refundHours) : DEFAULT_BUSINESS_RULES.creditRefundProcessingHours,
            },
        });
    } catch (error) {
        console.error('Admin settings GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro interno ao carregar configuracoes.' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const body = await request.json() as AdminSettingsPayload;
        const token = typeof body.token === 'string' ? body.token.trim() : '';
        const origin = body.origin && typeof body.origin === 'object' ? body.origin : null;
        const timestamp = new Date().toISOString();

        const [settingsResult] = await Promise.all([
            supabaseAdmin
                .from('admin_settings')
                .upsert([
                    { key: 'melhor_envio_token', value: token, updated_at: timestamp },
                    { key: 'origin_address', value: origin, updated_at: timestamp },
                ], { onConflict: 'key' }),
            upsertBusinessRules(body.businessRules),
        ]);

        if (settingsResult.error) {
            throw settingsResult.error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin settings PATCH error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro interno ao salvar configuracoes.' },
            { status: 500 }
        );
    }
}
