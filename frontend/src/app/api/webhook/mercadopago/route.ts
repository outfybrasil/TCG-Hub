import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'
);

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

        // External reference format: purchase_ID, user_ID_TIMESTAMP, guest_TIMESTAMP
        const externalReference = mpPayment.external_reference || '';
        const metadata = mpPayment.metadata || {};

        const purchaseId = externalReference.startsWith('purchase_')
            ? externalReference.replace('purchase_', '')
            : metadata.purchase_id;

        const isCredit = !purchaseId && (externalReference.startsWith('user_') || metadata.type === 'credit' || description.toLowerCase().includes('créditos'));

        if (isCredit) {
            // This is an auction credit deposit
            const userId = externalReference.startsWith('user_') ? externalReference.split('_')[1] : metadata.user_id;

            if (userId) {
                await supabaseAdmin.rpc('deposit_auction_credits', {
                    p_user_id: userId,
                    p_amount: mpPayment.transaction_amount,
                    p_mp_payment_id: String(data.id)
                });

                console.log(`Credits deposited: ${mpPayment.transaction_amount} for user ${userId}`);
            }
        } else if (purchaseId) {
            // This is a regular store order
            if (purchaseId) {
                const { error: updateError } = await supabaseAdmin
                    .from('purchases')
                    .update({
                        status: 'approved',
                        mp_payment_id: String(data.id)
                    })
                    .eq('id', purchaseId);

                if (updateError) {
                    console.error(`Error updating purchase ${purchaseId}:`, updateError);
                } else {
                    console.log(`Purchase ${purchaseId} approved via webhook. MP ID: ${data.id}`);
                }
            }
        } else {
            console.log(`Payment approved but not categorized: ${description} (Ref: ${externalReference})`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
