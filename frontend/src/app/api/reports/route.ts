import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const CATEGORIES = new Set(['counterfeit', 'misleading', 'price_manipulation', 'abuse', 'non_delivery', 'other']);

export async function POST(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;
    const body = await request.json().catch(() => ({}));
    const category = typeof body.category === 'string' ? body.category : '';
    const details = typeof body.details === 'string' ? body.details.trim().slice(0, 1000) : '';
    const listingId = typeof body.listingId === 'string' ? body.listingId : null;
    const sellerId = typeof body.sellerId === 'string' ? body.sellerId : null;
    if (!CATEGORIES.has(category) || details.length < 10 || (!listingId && !sellerId)) {
        return NextResponse.json({ error: 'Denúncia incompleta.' }, { status: 400 });
    }
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supabaseAdmin.from('marketplace_reports').select('id', { count: 'exact', head: true })
        .eq('reporter_id', auth.user.id).gte('created_at', hourAgo);
    if ((count || 0) >= 5) return NextResponse.json({ error: 'Limite de denúncias atingido. Tente novamente mais tarde.' }, { status: 429 });
    const { error } = await supabaseAdmin.from('marketplace_reports').insert({
        reporter_id: auth.user.id, listing_id: listingId, seller_id: sellerId, category, details,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true }, { status: 201 });
}
