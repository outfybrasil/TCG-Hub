import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '@/lib/supabase';

// Initialize MP using the generic credentials
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const payment = new Payment(client);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            transactionAmount, token, description, installments, paymentMethodId,
            issuerId, payerEmail, userId, useCashback, discountAmount, payer,
            items = [], totalAmount
        } = body;

        if (transactionAmount === undefined) {
            return NextResponse.json({ error: 'Valor da transação obrigatório' }, { status: 400 });
        }

        let email = payerEmail || payer?.email;

        // Mercado Pago sandbox: for TEST tokens, the payer email must belong to the test account owner.
        if (process.env.MP_ACCESS_TOKEN?.includes('TEST-')) {
            email = 'gustavolanconi@outlook.com';
        }

        if (!email) {
            return NextResponse.json({ error: 'Email do pagador é obrigatório' }, { status: 400 });
        }

        // Deduct cashback if requested
        if (useCashback && discountAmount > 0 && userId) {
            const { data: success, error: deductError } = await supabase.rpc('deduct_cashback', {
                p_user_id: userId,
                p_amount: discountAmount
            });
            if (deductError || !success) {
                return NextResponse.json({ error: 'Erro ao descontar cashback. Saldo insuficiente?' }, { status: 400 });
            }
        }

        // 100% cashback: no MP payment needed
        if (transactionAmount === 0 && useCashback && discountAmount > 0) {
            if (userId) {
                await supabase.from('purchases').insert({
                    user_id: userId,
                    items,
                    total_amount: totalAmount || 0,
                    discount_amount: discountAmount,
                    cashback_earned: 0,
                    payment_method: 'cashback',
                    mp_payment_id: 'cashback-' + Date.now(),
                    status: 'approved'
                });
            }
            return NextResponse.json({ id: 'cashback-' + Date.now(), status: 'approved', status_detail: 'accredited' });
        }

        const paymentRequest = {
            body: {
                transaction_amount: Number(transactionAmount),
                token: token,
                description: description || 'Pgto - TCG Mega Store',
                installments: Number(installments) || 1,
                payment_method_id: paymentMethodId,
                issuer_id: issuerId,
                payer: { email }
            }
        };

        const result = await payment.create(paymentRequest);

        // Post-payment: add cashback + save purchase history
        if (result.id && userId) {
            const cashbackAmount = Number(transactionAmount) * 0.05;

            const { error: rpcError } = await supabase.rpc('add_cashback', {
                p_user_id: userId,
                p_amount: cashbackAmount
            });
            if (rpcError) {
                console.error('Erro ao adicionar cashback:', rpcError);
            } else {
                console.log(`Cashback de R$ ${cashbackAmount.toFixed(2)} adicionado para usuário ${userId}`);

                const { error: purchaseError } = await supabase.from('purchases').insert({
                    user_id: userId,
                    items,
                    total_amount: totalAmount || transactionAmount,
                    discount_amount: discountAmount || 0,
                    cashback_earned: cashbackAmount,
                    payment_method: paymentMethodId || 'credit_card',
                    mp_payment_id: String(result.id),
                    status: result.status || 'approved'
                });
                if (purchaseError) {
                    console.error('Erro ao salvar histórico de compra:', purchaseError);
                }

                // ATOMIC STOCK DECREMENT
                const { error: stockError } = await supabase.rpc('purchase_items', {
                    p_items: items.map((i: { id: string; quantity: number }) => ({ id: i.id, quantity: i.quantity }))
                });
                if (stockError) {
                    console.error('Erro ao baixar estoque:', stockError);
                    // Note: In a production app, you might want to handle this more gracefully
                    // (e.g., flagging the order for manual review if payment was already processed)
                }
            }
        }

        return NextResponse.json({
            id: result.id,
            status: result.status,
            status_detail: result.status_detail,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Houve um erro no pagamento';
        console.error('Erro Cartão MP:', error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
