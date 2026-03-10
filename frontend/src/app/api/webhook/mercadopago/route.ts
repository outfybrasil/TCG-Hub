import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
    const msg = '❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing! Webhook cannot bypass RLS.';
    console.error(msg);
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceRoleKey || 'missing-key'
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

        const validStatuses = ['approved', 'refunded', 'cancelled'];
        if (!validStatuses.includes(mpPayment.status)) {
            // Unhandled payment status
            return NextResponse.json({ received: true });
        }

        const description: string = mpPayment.description || '';

        // External reference format: purchase_ID, user_ID_TIMESTAMP, guest_TIMESTAMP
        const externalReference = mpPayment.external_reference || '';
        const metadata = mpPayment.metadata || {};

        const purchaseId = externalReference.startsWith('purchase_')
            ? externalReference.replace('purchase_', '')
            : (metadata.purchase_id || metadata.purchaseId);

        const userIdMetadata = metadata.user_id || metadata.userId;

        const isCredit = !purchaseId && (externalReference.startsWith('user_') || metadata.type === 'credit' || description.toLowerCase().includes('créditos'));

        if (isCredit) {
            // This is an auction credit deposit
            const userId = externalReference.startsWith('user_') ? externalReference.split('_')[1] : userIdMetadata;

            if (userId) {
                const { error: rpcError } = await supabaseAdmin.rpc('deposit_auction_credits', {
                    p_user_id: userId,
                    p_amount: mpPayment.transaction_amount,
                    p_mp_payment_id: String(data.id)
                });

                if (rpcError) {
                    console.error('💥 ERROR ao depositar creditos (Possivel RLS Block by missing Service Key):', rpcError);
                } else {
                    console.log(`Credits deposited: ${mpPayment.transaction_amount} for user ${userId}`);
                }
            }
        } else if (purchaseId) {
            // This is a regular store order
            if (purchaseId) {
                if (mpPayment.status === 'approved') {
                    // Fetch the purchase items first to know what to decrement
                    const { data: purchaseData, error: fetchError } = await supabaseAdmin
                        .from('purchases')
                        .select('items, status')
                        .eq('id', purchaseId)
                        .single();

                    if (fetchError || !purchaseData) {
                        console.error(`Error fetching purchase ${purchaseId} for inventory update:`, fetchError);
                    } else if (purchaseData.status !== 'approved') {
                        // Update purchase status
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

                            // Decrement inventory for each item
                            const items = purchaseData.items || [];
                            for (const item of items) {
                                if (item.id && !item.is_auction) {
                                    const { error: rpcError } = await supabaseAdmin.rpc('decrement_inventory', {
                                        p_item_id: item.id,
                                        p_quantity: item.quantity || 1
                                    });
                                    if (rpcError) {
                                        console.error(`Error decrementing inventory for item ${item.id}:`, rpcError);
                                    }
                                }
                            }
                        }
                    }
                } else if (mpPayment.status === 'refunded' || mpPayment.status === 'cancelled') {
                    // Handle Refunds or Cancellations from MP Webhook
                    const { data: purchaseData, error: fetchError } = await supabaseAdmin
                        .from('purchases')
                        .select('items, status')
                        .eq('id', purchaseId)
                        .single();

                    if (fetchError || !purchaseData) {
                        console.error(`Error fetching purchase ${purchaseId} for refund/cancelation:`, fetchError);
                    } else if (purchaseData.status !== 'canceled' && purchaseData.status !== 'refunded') {
                        // Mark as canceled
                        const { error: updateError } = await supabaseAdmin
                            .from('purchases')
                            .update({
                                status: 'canceled',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', purchaseId);

                        if (updateError) {
                            console.error(`Error canceling purchase ${purchaseId}:`, updateError);
                        } else {
                            console.log(`Purchase ${purchaseId} canceled/refunded via webhook. MP ID: ${data.id}`);

                            // Restore inventory
                            const items = purchaseData.items || [];
                            for (const item of items) {
                                if (item.id && !item.is_auction) {
                                    const { error: rpcError } = await supabaseAdmin.rpc('restore_inventory', {
                                        p_item_id: item.id,
                                        p_quantity: item.quantity || 1
                                    });
                                    if (rpcError) {
                                        console.error(`Error restoring inventory for item ${item.id}:`, rpcError);
                                    }
                                }
                            }
                        }
                    }
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
