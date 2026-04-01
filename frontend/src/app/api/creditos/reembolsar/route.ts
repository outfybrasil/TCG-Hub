import { NextResponse } from 'next/server';

import { calculateCreditRefundFee, calculateCreditRefundNet } from '@/lib/business-rules';
import { getBusinessRules } from '@/lib/business-rules-server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const { userId, amount, mpPaymentId } = await req.json();
        const requestedAmount = Number(amount);

        if (!userId || !requestedAmount || !mpPaymentId) {
            return NextResponse.json({ error: 'Dados obrigatorios ausentes.' }, { status: 400 });
        }

        if (auth.user.id !== userId) {
            return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
        }

        const rules = await getBusinessRules();
        const feeAmount = calculateCreditRefundFee(requestedAmount, rules);
        const refundAmount = calculateCreditRefundNet(requestedAmount, rules);

        if (refundAmount <= 0) {
            return NextResponse.json({
                error: 'O valor solicitado nao cobre a taxa administrativa de estorno.',
            }, { status: 400 });
        }

        const { data: creditRow, error: creditError } = await supabaseAdmin
            .from('auction_credits')
            .select('balance, locked')
            .eq('user_id', userId)
            .single();

        if (creditError || !creditRow) {
            return NextResponse.json({ error: 'Carteira de creditos nao encontrada.' }, { status: 404 });
        }

        const availableBalance = Number(creditRow.balance) - Number(creditRow.locked || 0);
        if (availableBalance < requestedAmount) {
            return NextResponse.json({ error: 'Saldo disponivel insuficiente para estorno.' }, { status: 400 });
        }

        const response = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}/refunds`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `credit_refund_${userId}_${Date.now()}`,
            },
            body: JSON.stringify({ amount: refundAmount }),
        });

        const mpResult = await response.json();

        if (!response.ok) {
            return NextResponse.json({
                error: 'Erro no Mercado Pago ao processar reembolso.',
                details: mpResult.message,
            }, { status: response.status });
        }

        const updatedBalance = Number(creditRow.balance) - requestedAmount;
        const { error: updateError } = await supabaseAdmin
            .from('auction_credits')
            .update({ balance: updatedBalance })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Credit refund balance update error:', updateError);
            return NextResponse.json({
                error: 'O estorno foi solicitado, mas o saldo de creditos nao foi atualizado.',
            }, { status: 500 });
        }

        const timestamp = new Date().toISOString();
        const transactions = [
            {
                user_id: userId,
                type: 'withdrawal',
                amount: refundAmount,
                note: `Estorno solicitado. Previsao de conclusao em ate ${rules.creditRefundProcessingHours}h. Mercado Pago: ${mpPaymentId}.`,
                created_at: timestamp,
            },
        ];

        if (feeAmount > 0) {
            transactions.push({
                user_id: userId,
                type: 'fee',
                amount: feeAmount,
                note: `Taxa administrativa de ${rules.creditRefundFeePercentage}% aplicada ao estorno.`,
                created_at: timestamp,
            });
        }

        const { error: transactionError } = await supabaseAdmin
            .from('credit_transactions')
            .insert(transactions);

        if (transactionError) {
            console.error('Credit refund transaction insert error:', transactionError);
        }

        return NextResponse.json({
            success: true,
            message: `Estorno solicitado com sucesso. O valor liquido de R$ ${refundAmount.toFixed(2).replace('.', ',')} sera devolvido em ate ${rules.creditRefundProcessingHours}h.`,
            grossAmount: requestedAmount,
            feeAmount,
            refundAmount,
            processingHours: rules.creditRefundProcessingHours,
        });
    } catch (error) {
        console.error('Credit refund error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
    }
}
