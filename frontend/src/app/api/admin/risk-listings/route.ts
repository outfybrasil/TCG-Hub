import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ACTIONS = new Set(['approved', 'excluded', 'suspended', 'restored']);

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) return auth.response;

    const { data, error } = await supabaseAdmin
        .from('seller_listings')
        .select('id, seller_id, card_id, card_name, card_set, card_number, image_url, price, reference_price, price_risk_level, price_risk_reason, index_eligible, moderation_status, risk_assessed_at, created_at, seller_profiles(display_name, is_verified, rating_avg, rating_count, total_sales)')
        .or('price_risk_level.neq.normal,moderation_status.neq.clear')
        .order('risk_assessed_at', { ascending: false, nullsFirst: false })
        .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ listings: data || [] });
}

export async function PATCH(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) return auth.response;
    const body = await request.json().catch(() => ({}));
    const listingId = typeof body.listingId === 'string' ? body.listingId : '';
    const action = typeof body.action === 'string' ? body.action : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;
    if (!/^[0-9a-f-]{36}$/i.test(listingId) || !ACTIONS.has(action)) {
        return NextResponse.json({ error: 'Decisão inválida.' }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabaseAdmin
        .from('seller_listings').select('moderation_status, status').eq('id', listingId).single();
    if (currentError || !current) return NextResponse.json({ error: 'Anúncio não encontrado.' }, { status: 404 });

    const updates: Record<string, unknown> = {
        moderation_status: action === 'restored' ? 'clear' : action,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
        index_eligible: action === 'approved' || action === 'restored',
    };
    if (action === 'suspended') updates.status = 'paused';
    if (action === 'restored' && current.status === 'paused') updates.status = 'active';

    const { error } = await supabaseAdmin.from('seller_listings').update(updates).eq('id', listingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabaseAdmin.from('listing_moderation_events').insert({
        listing_id: listingId, moderator_id: auth.user.id, action, reason,
        previous_status: current.moderation_status,
    });
    return NextResponse.json({ success: true });
}
