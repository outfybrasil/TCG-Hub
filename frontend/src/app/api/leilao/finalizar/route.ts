import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { auctionId, userId, amount, shippingAddress, shippingCost, paymentMethod, mpPaymentId } = body;

        if (!auctionId || !userId || !amount) {
            return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
        }

        // 1. Atomically consume credits
        const { data: creditRes, error: creditError } = await supabase.rpc('finalize_auction_purchase', {
            p_user_id: userId,
            p_auction_id: auctionId,
            p_amount: amount
        });

        if (creditError || !creditRes) {
            console.error('Credit finalize error:', creditError);
            return NextResponse.json({ error: 'Erro ao processar créditos do leilão. Saldo bloqueado insuficiente.' }, { status: 400 });
        }

        // 2. Fetch auction details to record purchase accurately
        const { data: auction, error: auctionFetchError } = await supabase
            .from('auctions')
            .select('*')
            .eq('id', auctionId)
            .single();

        if (auctionFetchError || !auction) {
            return NextResponse.json({ error: 'Erro ao buscar detalhes do leilão.' }, { status: 400 });
        }

        // 3. Create purchase record
        const { error: purchaseError } = await supabase.from('purchases').insert({
            user_id: userId,
            items: [{
                id: auction.card_id || auctionId,
                name: auction.card_name,
                price: amount,
                quantity: 1,
                image_url: auction.image_url,
                is_auction: true,
                auction_id: auctionId
            }],
            total_amount: amount + (shippingCost || 0),
            discount_amount: 0,
            cashback_earned: amount * 0.05,
            payment_method: paymentMethod || 'credits',
            mp_payment_id: mpPaymentId || `auction-${auctionId}-${Date.now()}`,
            shipping_address: shippingAddress,
            status: 'approved'
        });

        if (purchaseError) {
            console.error('Erro ao salvar histórico de compra do leilão:', purchaseError);
        }

        // 4. Update auction status
        await supabase.from('auctions')
            .update({ status: 'finished' })
            .eq('id', auctionId);

        // 5. Add cashback
        await supabase.rpc('add_cashback', {
            p_user_id: userId,
            p_amount: amount * 0.05
        });

        return NextResponse.json({ success: true, status: 'approved' });

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro ao finalizar leilão';
        console.error('Finalizar Leilão Error:', error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
