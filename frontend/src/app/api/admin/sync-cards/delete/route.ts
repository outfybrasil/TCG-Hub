import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const { setId } = await request.json();
        console.log('API Delete: Chamado para setId:', setId);

        if (!setId) {
            console.log('API Delete: Erro - setId ausente');
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
