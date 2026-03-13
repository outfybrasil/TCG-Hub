import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/server-auth';

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const { count, error } = await supabaseAdmin
            .from('pokemon_cards')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return NextResponse.json({ success: true, count: count || 0 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
