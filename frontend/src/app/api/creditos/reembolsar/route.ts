import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { userId, amount, mpPaymentId } = await req.json();

        if (!userId || !amount || !mpPaymentId) {
            return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 });
        }

        // Verify user matches session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== userId) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        // Call Mercado Pago refund API
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}/refunds`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `credit_refund_${userId}_${Date.now()}`
            },
            body: JSON.stringify({ amount: Number(amount) })
        });

        const mpResult = await response.json();

        if (!response.ok) {
            return NextResponse.json({
                error: 'Erro no Mercado Pago ao processar reembolso.',
                details: mpResult.message
            }, { status: response.status });
        }

        // Deduct from auction_credits balance via RPC
        const { data: success } = await supabase.rpc('refund_auction_credits', {
            p_user_id: userId,
            p_amount: Number(amount),
            p_mp_payment_id: mpPaymentId
        });

        if (!success) {
            return NextResponse.json({ error: 'Saldo insuficiente para reembolso.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Reembolso de créditos processado com sucesso!' });

    } catch (error) {
        console.error('Credit refund error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
    }
}
