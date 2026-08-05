import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;
    const { data, error } = await supabaseAdmin.from('card_watchlists')
        .select('id, card_id, target_price, condition, finish, language, active, created_at, pokemon_cards(name, image_url, set_name)')
        .eq('user_id', auth.user.id).order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ watchlist: data || [] });
}

export async function POST(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;
    const body = await request.json().catch(() => ({}));
    const cardId = typeof body.cardId === 'string' ? body.cardId.trim().slice(0, 120) : '';
    const targetPrice = body.targetPrice === null || body.targetPrice === '' ? null : Number(body.targetPrice);
    if (!cardId || (targetPrice !== null && (!Number.isFinite(targetPrice) || targetPrice <= 0 || targetPrice > 10_000_000))) {
        return NextResponse.json({ error: 'Carta ou preço-alvo inválido.' }, { status: 400 });
    }
    const row = {
        user_id: auth.user.id, card_id: cardId, target_price: targetPrice,
        condition: clean(body.condition), finish: clean(body.finish), language: clean(body.language),
        active: true, updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin.from('card_watchlists').upsert(row, {
        onConflict: 'user_id,card_id,condition,finish,language',
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ watch: data }, { status: 201 });
}

export async function DELETE(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('card_watchlists').delete().eq('id', id).eq('user_id', auth.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

function clean(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : '';
}
