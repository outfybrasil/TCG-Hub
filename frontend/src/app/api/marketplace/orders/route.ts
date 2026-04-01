import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) return auth.response;

    const userId = auth.user.id;
    const url = new URL(req.url);
    const role = url.searchParams.get('role') || 'seller'; // 'seller' | 'buyer'

    const field = role === 'buyer' ? 'buyer_id' : 'seller_id';

    const { data, error } = await supabaseAdmin
        .from('seller_orders')
        .select(`
            *,
            seller_listings (
                card_name,
                card_set,
                card_number,
                image_url,
                condition,
                language,
                finish
            ),
            seller_reviews (
                id,
                rating,
                comment
            )
        `)
        .eq(field, userId)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data });
}
