import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Mercado Pago sends payment notifications here
// Configure in: https://www.mercadopago.com.br/developers/panel/webhooks
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, data } = body;

        // Only process payment notifications
        if (type !== 'payment' || !data?.id) {
            return NextResponse.json({ received: true });
        }

        // Fetch payment details from MP API
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
            headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
        });

        if (!mpResponse.ok) {
            console.error('Failed to fetch payment from MP:', data.id);
            return NextResponse.json({ error: 'MP fetch failed' }, { status: 500 });
        }

        const mpPayment = await mpResponse.json();

        if (mpPayment.status !== 'approved') {
            // Payment not approved yet, nothing to do
            return NextResponse.json({ received: true });
        }

        const description: string = mpPayment.description || '';
        const isCredit = description.toLowerCase().includes('créditos') || description.toLowerCase().includes('deposito');

        if (isCredit) {
            // This is an auction credit deposit — find the user by external_reference or metadata
            // MP sends the user_id we must store in the payment's external_reference
            const userId = mpPayment.external_reference || mpPayment.metadata?.user_id;

            if (userId) {
                await supabase.rpc('deposit_auction_credits', {
                    p_user_id: userId,
                    p_amount: mpPayment.transaction_amount,
                    p_mp_payment_id: String(data.id)
                });

                console.log(`Credits deposited: ${mpPayment.transaction_amount} for user ${userId}`);
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
