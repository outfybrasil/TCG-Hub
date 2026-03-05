import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '@/lib/supabase';

// Initialize MP using the generic credentials
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const payment = new Payment(client);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { transactionAmount, description, payerEmail, payerFirstName, payerLastName, docType, docNumber, userId, useCashback, discountAmount } = body;

        if (transactionAmount === undefined || !payerEmail) {
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

        // Se o valor final for 0 (100% pago com cashback), ignorar MP
        if (transactionAmount === 0 && useCashback && discountAmount > 0) {
            return NextResponse.json({
                id: 'cashback-' + Date.now(),
                status: 'approved',
                status_detail: 'accredited',
                qr_code_base64: null,
                ticket_url: null
            });
        }

        const paymentRequest = {
            body: {
                transaction_amount: Number(transactionAmount),
                description: description || 'Pgto PIX - TCG Mega Store',
                payment_method_id: 'pix',
                payer: {
                    email: payerEmail,
                    first_name: payerFirstName,
                    last_name: payerLastName,
                    identification: {
                        type: docType || 'CPF',
                        number: docNumber || '12345678909' // Default/Mock if missing for test
                    }
                }
            }
        };

        const result = await payment.create(paymentRequest);

        // ✅ Salvar compra com mp_payment_id real — necessário para reembolso e créditos de leilão
        if (result.id && userId) {
            const { error: purchaseError } = await supabase.from('purchases').insert({
                user_id: userId,
                items: body.items || [],
                total_amount: body.totalAmount || transactionAmount,
                discount_amount: discountAmount || 0,
                cashback_earned: 0,
                payment_method: 'pix',
                mp_payment_id: String(result.id),
                shipping_address: body.shippingAddress || null,
                status: result.status || 'pending'
            });

            if (purchaseError) {
                console.error('Erro ao salvar compra PIX:', purchaseError);
            }
        }

        // Se o PIX foi gerado e temos um userId, conceder o cashback para demonstração
        // Em um ambiente de produção real, faríamos isso no Webhook quando o PIX fosse pago de verdade.
        if (result.id && userId) {
            const cashbackAmount = Number(transactionAmount) * 0.05;
            const { error: rpcError } = await supabase.rpc('add_cashback', {
                p_user_id: userId,
                p_amount: cashbackAmount
            });

            if (rpcError) {
                console.error('Erro ao adicionar cashback (PIX):', rpcError);
            } else {
                console.log(`Cashback de R$ ${cashbackAmount} adicionado para usuário ${userId}`);
            }
        }

        return NextResponse.json({
            id: result.id,
            status: result.status,
            qr_code: result.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: result.point_of_interaction?.transaction_data?.ticket_url
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Houve um erro no pagamento';
        console.error('Erro PIX:', error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
