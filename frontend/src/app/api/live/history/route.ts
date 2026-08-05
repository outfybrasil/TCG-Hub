import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const liveId = searchParams.get('liveId');

    if (!liveId) {
        return NextResponse.json({ error: 'Live ID é obrigatório' }, { status: 400 });
    }

    try {
        // Usamos supabaseAdmin para bypass de RLS, garantindo que o histórico
        // seja retornado mesmo que não haja política SELECT configurada.
        const { data, error } = await supabaseAdmin
            .from('live_auction_history')
            .select('*')
            .eq('live_id', liveId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Erro ao buscar histórico via admin:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ history: data || [] });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
