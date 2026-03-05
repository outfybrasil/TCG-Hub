import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '@/lib/supabase';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const payment = new Payment(client);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, paymentMethod, userId, payerEmail, payerFirstName, payerLastName, docType, docNumber, token, installments, paymentMethodId, issuerId } = body;

        if (!amount || !userId || !payerEmail) {
            return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 });
        }

        if (amount < 10) {
            return NextResponse.json({ error: 'Valor mínimo para depósito é R$ 10,00.' }, { status: 400 });
        }

        let email = payerEmail;
        if (process.env.MP_ACCESS_TOKEN?.includes('TEST-')) {
            // Using a strictly test user email pattern for Sandbox
            email = 'test_user_678@testuser.com';
        }

        let paymentBody: any;

        if (paymentMethod === 'pix') {
            paymentBody = {
                transaction_amount: Number(amount),
                description: 'Depósito de Créditos - Leilão TCG Mega Store',
                payment_method_id: 'pix',
                payer: {
                    email,
                    first_name: payerFirstName,
                    last_name: payerLastName,
                    identification: { type: docType || 'CPF', number: docNumber || '12345678909' }
                }
            };
        } else {
            // Credit/debit card
            paymentBody = {
                transaction_amount: Number(amount),
                token,
                description: 'Depósito de Créditos - Leilão TCG Mega Store',
                installments: Number(installments) || 1,
                payment_method_id: paymentMethodId,
                issuer_id: issuerId,
                payer: { email }
            };
        }

        console.log('Sending payment to Mercado Pago:', JSON.stringify(paymentBody, null, 2));

        const result = await payment.create({ body: paymentBody });

        // For card payments (immediate approval), add credits right away
        if (result.status === 'approved' && result.id) {
            await supabase.rpc('deposit_auction_credits', {
                p_user_id: userId,
                p_amount: Number(amount),
                p_mp_payment_id: String(result.id)
            });
        }
        // For PIX (pending), the webhook will confirm and add credits

        return NextResponse.json({
            id: result.id,
            status: result.status,
            qr_code: result.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
            credits_added: result.status === 'approved' ? Number(amount) : 0
        });

    } catch (error: any) {
        console.error('Deposit credits error detail:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause,
            response: error.response?.data || error.response,
        });

        const errorMessage = error.response?.data?.message || error.message || 'Erro ao processar depósito';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
