import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { markPurchaseCanceled } from '@/lib/purchase-status';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(req: Request) {
    try {
        const { purchaseId, paymentId } = await req.json();

        if (!purchaseId || !paymentId) {
            return NextResponse.json({ error: 'Dados insuficientes para o reembolso.' }, { status: 400 });
        }

        const auth = await requireAdmin(req);
        if ('response' in auth) {
            return auth.response;
        }

        const { data: purchaseData, error: fetchError } = await supabaseAdmin
            .from('purchases')
            .select('status')
            .eq('id', purchaseId)
            .single();

        if (fetchError || !purchaseData) {
            return NextResponse.json({ error: 'Compra nao encontrada para o reembolso.' }, { status: 404 });
        }

        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `refund_${purchaseId}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Erro MP Refund:', result);
            return NextResponse.json({
                error: 'Erro no Mercado Pago ao processar reembolso.',
                details: result.message || 'Erro desconhecido',
            }, { status: response.status });
        }

        try {
            await markPurchaseCanceled(supabaseAdmin, purchaseId, 'canceled');
        } catch (inventoryError) {
            console.error('Erro ao restaurar inventario no reembolso:', inventoryError);
            return NextResponse.json({
                error: 'Reembolso feito no Mercado Pago, mas a carta nao voltou ao estoque.',
                details: inventoryError instanceof Error ? inventoryError.message : 'Falha desconhecida',
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Reembolso processado com sucesso.',
            result,
        });
    } catch (error) {
        console.error('Reembolso Error:', error);
        return NextResponse.json({ error: 'Ocorreu um erro interno no servidor.' }, { status: 500 });
    }
}
