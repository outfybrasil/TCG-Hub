import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const body = await req.json();
        const { auctionId, shippingAddress } = body;
        const userId = auth.user.id;

        if (!auctionId) {
            return NextResponse.json({ error: 'Dados obrigatÃ³rios ausentes' }, { status: 400 });
        }

        const { data: auction, error: auctionFetchError } = await supabaseAdmin
            .from('auctions')
            .select('*')
            .eq('id', auctionId)
            .single();

        if (auctionFetchError || !auction) {
            return NextResponse.json({ error: 'Erro ao buscar detalhes do leilÃ£o.' }, { status: 400 });
        }

        if (auction.highest_bidder_id !== userId) {
            return NextResponse.json({ error: 'Somente o vencedor pode finalizar este leilao.' }, { status: 403 });
        }

        if (!['active', 'ended', 'awaiting_payment'].includes(String(auction.status))) {
            return NextResponse.json({ error: 'Este leilao ja foi finalizado ou cancelado.' }, { status: 409 });
        }

        const finalAmount = Number(auction.current_bid ?? auction.highest_bid);
        if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
            return NextResponse.json({ error: 'Valor final do leilao invalido.' }, { status: 409 });
        }

        const { data: creditRes, error: creditError } = await supabaseAdmin.rpc('finalize_auction_purchase', {
            p_user_id: userId,
            p_auction_id: auctionId,
            p_amount: finalAmount,
        });

        if (creditError || !creditRes) {
            console.error('Credit finalize error:', creditError);
            return NextResponse.json({ error: 'Erro ao processar crÃ©ditos do leilÃ£o. Saldo bloqueado insuficiente.' }, { status: 400 });
        }

        const { error: purchaseError } = await supabaseAdmin.from('purchases').insert({
            user_id: userId,
            items: [{
                id: auction.card_id || auctionId,
                name: auction.card_name,
                price: finalAmount,
                quantity: 1,
                image_url: auction.image_url,
                is_auction: true,
                auction_id: auctionId,
            }],
            total_amount: finalAmount,
            discount_amount: 0,
            cashback_earned: finalAmount * 0.05,
            payment_method: 'credits',
            mp_payment_id: `auction-${auctionId}`,
            shipping_address: shippingAddress,
            status: 'approved',
        });

        if (purchaseError) {
            console.error('Erro ao salvar histÃ³rico de compra do leilÃ£o:', purchaseError);
        }

        await supabaseAdmin
            .from('auctions')
            .update({ status: 'finished' })
            .eq('id', auctionId);

        await supabaseAdmin.rpc('add_cashback', {
            p_user_id: userId,
            p_amount: finalAmount * 0.05,
        });

        return NextResponse.json({ success: true, status: 'approved' });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro ao finalizar leilÃ£o';
        console.error('Finalizar LeilÃ£o Error:', error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
