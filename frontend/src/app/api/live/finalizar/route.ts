import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const liveId = typeof body.liveId === 'string' ? body.liveId : '';
    if (!/^[0-9a-f-]{36}$/i.test(liveId)) {
        return NextResponse.json({ error: 'Live inválida.' }, { status: 400 });
    }

    const { data: live, error: liveError } = await supabaseAdmin
        .from('live_auctions')
        .select('streamer_id,is_demo,ends_at')
        .eq('id', liveId)
        .single();

    if (liveError || !live) return NextResponse.json({ error: 'Live não encontrada.' }, { status: 404 });
    if (live.streamer_id !== auth.user.id && !auth.isAdmin) {
        return NextResponse.json({ error: 'Apenas o responsável pela live pode finalizar o lote.' }, { status: 403 });
    }
    if (live.is_demo) return NextResponse.json({ error: 'Lives de demonstração não geram cobrança.' }, { status: 409 });

    if (!live.ends_at || new Date(live.ends_at).getTime() > Date.now()) {
        const { error } = await supabaseAdmin.from('live_auctions').update({ ends_at: new Date().toISOString() }).eq('id', liveId);
        if (error) return NextResponse.json({ error: 'Não foi possível encerrar o lote.' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin.rpc('settle_expired_live_lot', { p_live_id: liveId });
    if (error) {
        console.error('Falha na liquidação atômica da live:', error.message);
        return NextResponse.json({ error: 'Não foi possível liquidar o lote com segurança.' }, { status: 409 });
    }
    return NextResponse.json(data);
}
