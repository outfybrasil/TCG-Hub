import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

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

    const { data: auctionData, error: auctionError } = await supabaseAdmin
        .from('purchases')
        .select(`
            *,
            live_auctions (
                current_item_name,
                current_item_image,
                title
            )
        `)
        .eq(role === 'buyer' ? 'user_id' : 'seller_id', userId)
        .eq('type', 'LIVE_AUCTION')
        .order('created_at', { ascending: false });

    if (auctionError) {
        console.error("Erro ao buscar leilões", auctionError);
    }

    return NextResponse.json({ 
        orders: data, 
        live_auctions: auctionData || [] 
    });
}
