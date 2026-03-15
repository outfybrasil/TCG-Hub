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
            amount,
            paymentMethod,
            payerEmail,
            payerFirstName,
            payerLastName,
            docType,
            docNumber,
            token,
            installments,
        } = body;

        const paymentMethodId = body.paymentMethodId || body.payment_method_id;
        const issuerId = body.issuerId || body.issuer_id;
        const userId = auth.user.id;

        if (!amount || !payerEmail) {
            return NextResponse.json({ error: 'Dados obrigatÃ³rios ausentes.' }, { status: 400 });
        }

        if (amount < 10) {
            return NextResponse.json({ error: 'Valor mÃ­nimo para depÃ³sito Ã© R$ 10,00.' }, { status: 400 });
        }

        let email = typeof payerEmail === 'string' ? payerEmail : auth.user.email;
        if (process.env.MP_ACCESS_TOKEN?.includes('TEST-') && !email?.includes('@')) {
            email = 'test_user_1476974797@testuser.com';
        }

        const paymentBody = paymentMethod === 'pix'
            ? {
                transaction_amount: Number(amount),
                description: 'DepÃ³sito de CrÃ©ditos - LeilÃ£o TCG Mega Store',
                payment_method_id: 'pix',
                payer: {
                    email,
                    first_name: payerFirstName,
                    last_name: payerLastName,
                    identification: { type: docType || 'CPF', number: docNumber || '12345678909' },
                },
            }
            : {
                transaction_amount: Number(amount),
                token,
                description: 'DepÃ³sito de CrÃ©ditos - LeilÃ£o TCG Mega Store',
                installments: Number(installments) || 1,
                payment_method_id: paymentMethodId,
                issuer_id: issuerId,
                payer: {
                    email,
                    identification: { type: docType || 'CPF', number: docNumber || '11804338907' },
                },
            };

        const result = await payment.create({ body: paymentBody });

        if (result.status === 'approved' && result.id) {
            await supabaseAdmin.rpc('deposit_auction_credits', {
                p_user_id: userId,
                p_amount: Number(amount),
                p_mp_payment_id: String(result.id),
            });
        }

        return NextResponse.json({
            id: result.id,
            status: result.status,
            qr_code: result.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
            credits_added: result.status === 'approved' ? Number(amount) : 0,
        });
    } catch (error: unknown) {
        const paymentError = error as {
            message?: string;
            stack?: string;
            cause?: unknown;
            response?: { data?: { message?: string } } | unknown;
        };

        console.error('Deposit credits error detail:', {
            message: paymentError.message,
            stack: paymentError.stack,
            cause: paymentError.cause,
            response: typeof paymentError.response === 'object' && paymentError.response && 'data' in paymentError.response
                ? (paymentError.response as { data?: unknown }).data
                : paymentError.response,
        });

        const responseData =
            typeof paymentError.response === 'object' && paymentError.response && 'data' in paymentError.response
                ? (paymentError.response as { data?: { message?: string } }).data
                : undefined;
        const errorMessage = responseData?.message || paymentError.message || 'Erro ao processar depÃ³sito';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
