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
        const { liveId, winnerId, winnerName, itemName, itemType, itemImage } = body;

        // Check ownership
        const { data: liveData } = await supabaseAdmin
            .from('live_auctions')
            .select('streamer_id, current_bid, winning_user_id, winning_user_name, status, is_demo')
            .eq('id', liveId)
            .single();
            
        if (!liveData || (liveData.streamer_id !== auth.user.id && !auth.isAdmin)) {
            return NextResponse.json({ error: 'Acesso negado. Apenas o dono da live ou admin pode finalizá-la.' }, { status: 403 });
        }
        if (liveData.is_demo) {
            return NextResponse.json({ error: 'Lives de demonstração não geram cobrança ou pedido.' }, { status: 409 });
        }

        if (!liveId || !winnerId || !itemName) {
            return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
        }

        // 1. Efetivar cobrança (debitar créditos do vencedor)
        if (!liveData.winning_user_id || liveData.winning_user_id !== winnerId) {
            return NextResponse.json({ error: 'O vencedor informado nao corresponde ao lance registrado.' }, { status: 409 });
        }
        const authoritativeWinnerId = liveData.winning_user_id;
        const authoritativeWinnerName = liveData.winning_user_name || winnerName || 'Vencedor';
        const finalAmount = Number(liveData.current_bid);
        if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
            return NextResponse.json({ error: 'Valor final invalido.' }, { status: 400 });
        }

        const { error: rpcError } = await supabaseAdmin.rpc('finalize_live_item_sale', {
            p_live_id: liveId,
            p_winner_id: authoritativeWinnerId,
            p_amount: finalAmount
        });

        if (rpcError) {
            console.error('Erro no finalize_live_item_sale:', rpcError);
            return NextResponse.json({ error: 'Nao foi possivel debitar os creditos do vencedor.' }, { status: 409 });
            // Continua mesmo com erro pra não perder o pedido
        }

        // 1.5 Gravar histórico da live no painel ao vivo
        const { error: historyError } = await supabaseAdmin.from('live_auction_history').insert({
            live_id: liveId,
            item_name: itemName,
            item_type: itemType || 'Carta',
            item_image: itemImage,
            winner_id: authoritativeWinnerId,
            winner_name: authoritativeWinnerName,
            final_bid: finalAmount
        });

        if (historyError) {
            console.error('Erro ao salvar histórico do leilão:', historyError);
        }

        // 2. Criar pedido na tabela purchases (usando supabaseAdmin para bypass RLS)
        const { data: purchase, error: purchaseError } = await supabaseAdmin.from('purchases').insert({
            user_id: authoritativeWinnerId,
            items: [{
                name: itemName,
                price: finalAmount,
                quantity: 1,
                image_url: itemImage || '',
                is_auction: true,
                is_live: true,
                live_id: liveId,
                item_type: itemType || 'Carta',
                seller_id: liveData.streamer_id
            }],
            total_amount: finalAmount,
            discount_amount: 0,
            cashback_earned: finalAmount * 0.05,
            payment_method: 'live_credits',
            mp_payment_id: `live-${liveId}-${Date.now()}`,
            status: 'approved'
        }).select('id').single();

        if (purchaseError) {
            console.error('Erro ao criar pedido do arremate:', purchaseError);
            return NextResponse.json({ error: 'Erro ao criar pedido: ' + purchaseError.message }, { status: 500 });
        }

        // 3. Dar cashback ao vencedor (5%)
        try {
            await supabaseAdmin.rpc('add_cashback', {
                p_user_id: authoritativeWinnerId,
                p_amount: finalAmount * 0.05
            });
        } catch (cashbackErr) {
            console.error('Cashback error (non-blocking):', cashbackErr);
        }

        console.log(`[live-sale] ${itemName} -> ${authoritativeWinnerId} por R$${finalAmount}`);

        return NextResponse.json({ 
            success: true, 
            purchaseId: purchase?.id,
            message: 'Pedido criado com sucesso!' 
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro ao finalizar arremate';
        console.error('Finalizar Arremate Error:', error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
