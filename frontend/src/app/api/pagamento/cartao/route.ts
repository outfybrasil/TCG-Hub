import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '@/lib/supabase';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const payment = new Payment(client);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            token,
            issuerId,
            paymentMethodId,
            transactionAmount,
            installments,
            payerEmail,
            userId,
            auction_id
        } = body;

        if (!token || !transactionAmount || !paymentMethodId) {
            return NextResponse.json({ error: 'Faltam dados do cartão' }, { status: 400 });
        }

        const paymentRequest = {
            body: {
                token,
                issuer_id: issuerId,
                payment_method_id: paymentMethodId,
                transaction_amount: Number(transactionAmount),
                installments: Number(installments),
                description: auction_id ? `Arremate de Leilão #${auction_id}` : (body.description || 'Compra TCG Hub'),
                payer: {
                    email: payerEmail || body.payer?.email,
                    identification: body.payer?.identification
                }
            }
        };

        const result = await payment.create(paymentRequest);

        // Se for leilão e o pagamento foi aprovado, podemos marcar como pago
        if (result.status === 'approved' && auction_id) {
            // Logica específica de leilão pode ser executada aqui ou via webhook
            console.log(`Pagamento aprovado para leilão ${auction_id}`);
        }

        // Salvar compra se houver userId
        if (userId && result.id) {
            await supabase.from('purchases').insert({
                user_id: userId,
                items: body.items || [],
                total_amount: transactionAmount,
                payment_method: 'card',
                mp_payment_id: String(result.id),
                status: result.status,
                metadata: { auction_id }
            });
        }

        return NextResponse.json({
            id: result.id,
            status: result.status,
            status_detail: result.status_detail
        });

    } catch (error: any) {
        console.error('Erro Cartão:', error);
        const msg = error.cause?.[0]?.description || error.message || 'Erro ao processar cartão';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
