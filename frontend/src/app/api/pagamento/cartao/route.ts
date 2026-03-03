import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '@/lib/supabase';

// Initialize MP using the generic credentials
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const payment = new Payment(client);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { transactionAmount, token, description, installments, paymentMethodId, issuerId, payerEmail, userId, useCashback, discountAmount } = body;

        if (transactionAmount === undefined || !token || !payerEmail) {
            return NextResponse.json({ error: 'Faltam dados obrigatórios' }, { status: 400 });
        }

        if (useCashback && discountAmount > 0 && userId) {
            const { data: success, error: deductError } = await supabase.rpc('deduct_cashback', {
                p_user_id: userId,
                p_amount: discountAmount
            });
            if (deductError || !success) {
                return NextResponse.json({ error: 'Erro ao descontar cashback. Saldo insuficiente?' }, { status: 400 });
            }
        }

        // Se o valor final for 0 (100% cashback), não processar no Mercado Pago
        if (transactionAmount === 0 && useCashback && discountAmount > 0) {
            return NextResponse.json({
                id: 'cashback-' + Date.now(),
                status: 'approved',
                status_detail: 'accredited',
            });
        }

        const paymentRequest = {
            body: {
                transaction_amount: Number(transactionAmount),
                token: token,
                description: description || 'Pgto Cartão - TCG Mega Store',
                installments: Number(installments) || 1,
                payment_method_id: paymentMethodId,
                issuer_id: issuerId,
                payer: {
                    email: payerEmail,
                }
            }
        };

        const result = await payment.create(paymentRequest);

        // Se o pagamento foi criado/aprovado e temos um userId, aplicar 5% de cashback
        if (result.id && userId) {
            const cashbackAmount = Number(transactionAmount) * 0.05;

            // Chamar a RPC para incrementar de forma segura
            const { error: rpcError } = await supabase.rpc('add_cashback', {
                p_user_id: userId,
                p_amount: cashbackAmount
            });

            if (rpcError) {
                console.error('Erro ao adicionar cashback (Cartão):', rpcError);
            } else {
                console.log(`Cashback de R$ ${cashbackAmount} adicionado para usuário ${userId}`);
            }
        }

        return NextResponse.json({
            id: result.id,
            status: result.status,
            status_detail: result.status_detail,
        });
    } catch (error: any) {
        console.error('Erro Cartão MP:', error);
        return NextResponse.json({ error: error.message || 'Houve um erro no pagamento' }, { status: 500 });
    }
}
