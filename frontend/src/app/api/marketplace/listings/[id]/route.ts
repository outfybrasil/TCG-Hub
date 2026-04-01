import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) return auth.response;

    const userId = auth.user.id;
    const { id: listingId } = await params;

    // Verificar propriedade
    const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('seller_listings')
        .select('id, seller_id, status')
        .eq('id', listingId)
        .single();

    if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Listagem não encontrada.' }, { status: 404 });
    }

    if (existing.seller_id !== userId) {
        return NextResponse.json({ error: 'Sem permissão para editar esta listagem.' }, { status: 403 });
    }

    const body = await req.json();
    const allowedFields = ['price', 'quantity', 'status', 'condition', 'notes', 'free_shipping', 'ships_from_state', 'finish', 'language'];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
        if (field in body) {
            updates[field] = body[field];
        }
    }

    // Validação de preço se fornecido
    if ('price' in updates) {
        const p = Number(updates['price']);
        if (isNaN(p) || p < 0.5) {
            return NextResponse.json({ error: 'Preço mínimo é R$ 0,50.' }, { status: 400 });
        }
        updates['price'] = p;
    }

    const { data, error } = await supabaseAdmin
        .from('seller_listings')
        .update(updates)
        .eq('id', listingId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listing: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuthenticatedUser(_req);
    if ('response' in auth) return auth.response;

    const userId = auth.user.id;
    const { id: listingId } = await params;

    const { data: existing } = await supabaseAdmin
        .from('seller_listings')
        .select('seller_id, status')
        .eq('id', listingId)
        .single();

    if (!existing) {
        return NextResponse.json({ error: 'Listagem não encontrada.' }, { status: 404 });
    }

    if (existing.seller_id !== userId) {
        return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    // Não permite excluir se há pedidos pendentes/pagos
    if (existing.status === 'sold') {
        return NextResponse.json({ error: 'Não é possível excluir uma listing vendida.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('seller_listings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', listingId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
