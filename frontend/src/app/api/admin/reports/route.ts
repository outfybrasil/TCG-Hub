import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
    const auth = await requireAdmin(request); if ('response' in auth) return auth.response;
    const { data, error } = await supabaseAdmin.from('marketplace_reports')
        .select('id, category, details, status, resolution, created_at, listing_id, seller_id, seller_listings(card_name, card_set, price), seller_profiles(display_name, is_verified, rating_avg, total_sales)')
        .order('created_at', { ascending: false }).limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reports: data || [] });
}

export async function PATCH(request: Request) {
    const auth = await requireAdmin(request); if ('response' in auth) return auth.response;
    const body = await request.json().catch(() => ({}));
    const status = typeof body.status === 'string' ? body.status : '';
    const id = typeof body.id === 'string' ? body.id : '';
    if (!['reviewing', 'resolved', 'dismissed'].includes(status) || !id) return NextResponse.json({ error: 'Decisão inválida.' }, { status: 400 });
    const resolution = typeof body.resolution === 'string' ? body.resolution.trim().slice(0, 1000) : null;
    const { error } = await supabaseAdmin.from('marketplace_reports').update({
        status, resolution, resolved_by: auth.user.id,
        resolved_at: status === 'reviewing' ? null : new Date().toISOString(),
    }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
