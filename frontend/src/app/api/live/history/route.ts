import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const liveId = searchParams.get('liveId');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 50);

    if (!liveId) return NextResponse.json({ error: 'Live ID é obrigatório' }, { status: 400 });

    try {
        const { data, error } = await supabaseAdmin
            .from('live_auction_history')
            .select('id,lot_number,item_name,item_type,item_image,winner_name,final_bid,created_at')
            .eq('live_id', liveId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Erro ao buscar histórico da live:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ history: data || [] });
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
