import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const { setId } = await request.json();

        if (!setId) {
            return NextResponse.json({ success: false, error: 'Set ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('pokemon_cards')
            .delete()
            .eq('set_id', setId);

        if (error) throw error;

        return NextResponse.json({ 
            success: true, 
            message: `Cards do set ${setId} deletados com sucesso.`
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
