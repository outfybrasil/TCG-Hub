import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assessListingPrice } from '@/lib/tcg-hub-price-index';
import { getTcgHubReference } from '@/lib/tcg-hub-price-server';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) return auth.response;

    const userId = auth.user.id;
    const { id: listingId } = await params;

    // Verificar propriedade
    const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('seller_listings')
        .select('id, seller_id, status, card_id, card_name, card_number, condition, finish, language, price')
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

    if ('quantity' in updates) {
        const quantity = Number(updates.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
            return NextResponse.json({ error: 'Quantidade invalida.' }, { status: 400 });
        }
        updates.quantity = quantity;
    }
    if ('status' in updates && !['active', 'paused'].includes(String(updates.status))) {
        return NextResponse.json({ error: 'Status invalido.' }, { status: 400 });
    }
    if ('notes' in updates) updates.notes = String(updates.notes || '').slice(0, 500);

    if (['price', 'condition', 'finish', 'language'].some((field) => field in updates)) {
        const reference = await getTcgHubReference({
            cardId: existing.card_id,
            cardName: existing.card_name,
            cardNumber: existing.card_number,
            condition: String(updates.condition ?? existing.condition),
            finish: String(updates.finish ?? existing.finish),
            language: String(updates.language ?? existing.language),
        });
        const risk = assessListingPrice(Number(updates.price ?? existing.price), reference);
        updates.price_risk_level = risk.level;
        updates.price_risk_reason = risk.reason;
        updates.reference_price = reference.price;
        updates.index_eligible = risk.level === 'normal';
        updates.risk_assessed_at = new Date().toISOString();
        updates.moderation_status = risk.level === 'normal' ? 'clear' : 'pending';
    }

    let { data, error } = await supabaseAdmin
        .from('seller_listings')
        .update(updates)
        .eq('id', listingId)
        .select()
        .single();

    if (error?.code === 'PGRST204' || error?.message?.includes('price_risk_level')) {
        delete updates.price_risk_level;
        delete updates.price_risk_reason;
        delete updates.reference_price;
        delete updates.index_eligible;
        delete updates.risk_assessed_at;
        const fallback = await supabaseAdmin.from('seller_listings').update(updates).eq('id', listingId).select().single();
        data = fallback.data;
        error = fallback.error;
    }

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
