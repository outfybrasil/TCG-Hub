import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuthenticatedUser } from '@/lib/server-auth';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const payment = new Payment(client);

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const body = await req.json();
        const {
            token,
            issuerId,
            paymentMethodId,
            transactionAmount,
            installments,
            payerEmail,
            auction_id,
        } = body;

        if (!token || !transactionAmount || !paymentMethodId) {
            return NextResponse.json({ error: 'Faltam dados do cartÃ£o' }, { status: 400 });
        }

        const paymentRequest = {
            body: {
                token,
                issuer_id: issuerId,
                payment_method_id: paymentMethodId,
                transaction_amount: Number(transactionAmount),
                installments: Number(installments),
                description: auction_id ? `Arremate de LeilÃ£o #${auction_id}` : (body.description || 'Compra TCG Hub'),
                payer: {
                    email: payerEmail || body.payer?.email || auth.user.email,
                    identification: body.payer?.identification,
                },
            },
        };

        const result = await payment.create(paymentRequest);

        if (result.status === 'approved' && auction_id) {
            console.log(`Pagamento aprovado para leilÃ£o ${auction_id}`);
        }

        if (!auction_id && result.id) {
            await supabaseAdmin.from('purchases').insert({
                user_id: auth.user.id,
                items: body.items || [],
                total_amount: transactionAmount,
                payment_method: 'card',
                mp_payment_id: String(result.id),
                status: result.status,
                metadata: { auction_id },
            });
        }

        return NextResponse.json({
            id: result.id,
            status: result.status,
            status_detail: result.status_detail,
        });
    } catch (error: unknown) {
        console.error('Erro CartÃ£o:', error);
        const paymentError = error as { cause?: Array<{ description?: string }>; message?: string };
        const msg = paymentError.cause?.[0]?.description || paymentError.message || 'Erro ao processar cartÃ£o';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
