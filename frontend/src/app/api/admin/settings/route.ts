import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/server-auth';

interface AdminSettingsPayload {
    token?: string;
    origin?: Record<string, unknown> | null;
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
            .in('key', ['melhor_envio_token', 'origin_address']);

        if (error) {
            throw error;
        }

        const tokenRow = data?.find((item) => item.key === 'melhor_envio_token');
        const originRow = data?.find((item) => item.key === 'origin_address');

        return NextResponse.json({
            token: tokenRow?.value ? String(tokenRow.value).replace(/"/g, '') : '',
            origin: originRow?.value && typeof originRow.value === 'object' ? originRow.value : null,
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

        const [tokenResult, originResult] = await Promise.all([
            supabaseAdmin
                .from('admin_settings')
                .update({ value: token, updated_at: new Date().toISOString() })
                .eq('key', 'melhor_envio_token'),
            supabaseAdmin
                .from('admin_settings')
                .update({ value: origin, updated_at: new Date().toISOString() })
                .eq('key', 'origin_address'),
        ]);

        if (tokenResult.error) {
            throw tokenResult.error;
        }

        if (originResult.error) {
            throw originResult.error;
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
