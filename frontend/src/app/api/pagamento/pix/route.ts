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
            transactionAmount,
            shippingCost,
            description,
            payerEmail,
            payerFirstName,
            payerLastName,
            docType,
            docNumber,
            useCashback,
            discountAmount,
        } = body;

        const userId = auth.user.id;

        if (transactionAmount === undefined) {
            return NextResponse.json({ error: 'Faltam dados obrigatÃ³rios' }, { status: 400 });
        }

        const finalTransactionAmount = Number(transactionAmount) + (Number(shippingCost) || 0);

        if (useCashback && discountAmount > 0) {
            const { data: success, error: deductError } = await supabaseAdmin.rpc('deduct_cashback', {
                p_user_id: userId,
                p_amount: discountAmount,
            });
            if (deductError || !success) {
                return NextResponse.json({ error: 'Erro ao descontar cashback. Saldo insuficiente?' }, { status: 400 });
            }
        }

        if (transactionAmount === 0 && useCashback && discountAmount > 0) {
            return NextResponse.json({
                id: `cashback-${Date.now()}`,
                status: 'approved',
                status_detail: 'accredited',
                qr_code_base64: null,
                ticket_url: null,
            });
        }

        const paymentRequest = {
            body: {
                transaction_amount: Number(finalTransactionAmount),
                description: description || 'Pgto PIX - TCG Mega Store',
                payment_method_id: 'pix',
                payer: {
                    email: payerEmail || auth.user.email,
                    first_name: payerFirstName,
                    last_name: payerLastName,
                    identification: {
                        type: docType || 'CPF',
                        number: docNumber || '12345678909',
                    },
                },
            },
        };

        const result = await payment.create(paymentRequest);

        if (result.id) {
            const { error: purchaseError } = await supabaseAdmin.from('purchases').insert({
                user_id: userId,
                items: body.items || [],
                total_amount: body.totalAmount || transactionAmount,
                discount_amount: discountAmount || 0,
                cashback_earned: 0,
                payment_method: 'pix',
                mp_payment_id: String(result.id),
                shipping_address: body.shippingAddress || null,
                status: result.status || 'pending',
            });

            if (purchaseError) {
                console.error('Erro ao salvar compra PIX:', purchaseError);
            }
        }

        return NextResponse.json({
            id: result.id,
            status: result.status,
            qr_code: result.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Houve um erro no pagamento';
        console.error('Erro PIX:', error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
