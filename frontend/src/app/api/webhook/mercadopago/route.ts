import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { markPurchaseApproved, markPurchaseCanceled } from '@/lib/purchase-status';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function extractPaymentIdFromResource(resource: string | null | undefined) {
    if (!resource) {
        return null;
    }

    const match = resource.match(/\/payments\/(\d+)/);
    return match?.[1] || null;
}

async function parseNotification(req: Request) {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const body = await req.json().catch(() => ({}));

    const resource =
        (typeof body.resource === 'string' ? body.resource : null) ||
        searchParams.get('resource');
    const topic =
        (typeof body.type === 'string' ? body.type : null) ||
        (typeof body.topic === 'string' ? body.topic : null) ||
        searchParams.get('type') ||
        searchParams.get('topic');
    const paymentId =
        (typeof body.data?.id === 'string' || typeof body.data?.id === 'number' ? String(body.data.id) : null) ||
        (typeof body.id === 'string' || typeof body.id === 'number' ? String(body.id) : null) ||
        searchParams.get('data.id') ||
        searchParams.get('id') ||
        extractPaymentIdFromResource(resource);

    const normalizedTopic =
        topic === 'payment' || resource?.includes('/payments/')
            ? 'payment'
            : topic;

    return {
        body,
        topic: normalizedTopic,
        paymentId,
    };
}

async function handleWebhook(req: Request) {
    try {
        const { topic, paymentId } = await parseNotification(req);

        const signature = req.headers.get('x-signature');
        const requestId = req.headers.get('x-request-id');
        const webhookSecret = process.env.MP_WEBHOOK_SECRET;
        const parts = Object.fromEntries((signature || '').split(',').map((part) => part.trim().split('=', 2)));
        const timestamp = parts.ts;
        const receivedHash = parts.v1;
        if (!webhookSecret || !requestId || !timestamp || !receivedHash || !paymentId) {
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        }
        const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
        const expectedHash = createHmac('sha256', webhookSecret).update(manifest).digest('hex');
        const validSignature = receivedHash.length === expectedHash.length && timingSafeEqual(
            Buffer.from(receivedHash, 'utf8'),
            Buffer.from(expectedHash, 'utf8'),
        );
        if (!validSignature) {
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        }

        if (topic !== 'payment' || !paymentId) {
            return NextResponse.json({ received: true });
        }

        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        });

        if (!mpResponse.ok) {
            console.error('Failed to fetch payment from MP:', paymentId);
            return NextResponse.json({ error: 'MP fetch failed' }, { status: 500 });
        }

        const mpPayment = await mpResponse.json();
        const validStatuses = ['approved', 'refunded', 'cancelled'];

        if (!validStatuses.includes(mpPayment.status)) {
            return NextResponse.json({ received: true });
        }

        const description: string = mpPayment.description || '';
        const externalReference = mpPayment.external_reference || '';
        const metadata = mpPayment.metadata || {};
        const paymentIdValue = String(mpPayment.id || paymentId);

        // --- P2P Seller Order ---
        const isSellerOrder = externalReference.startsWith('seller_order_') ||
            metadata.order_type === 'seller_p2p';

        if (isSellerOrder) {
            const orderId = externalReference.startsWith('seller_order_')
                ? externalReference.replace('seller_order_', '')
                : metadata.order_id;

            if (orderId && mpPayment.status === 'approved') {
                const { error: rpcErr } = await supabaseAdmin.rpc('approve_seller_order', {
                    p_order_id: orderId,
                    p_mp_payment_id: paymentIdValue,
                });
                if (rpcErr) {
                    console.error('Error approving seller order:', rpcErr);
                }
            } else if (orderId && ['refunded', 'cancelled'].includes(mpPayment.status)) {
                await supabaseAdmin
                    .from('seller_orders')
                    .update({ status: mpPayment.status === 'refunded' ? 'refunded' : 'cancelled' })
                    .eq('id', orderId)
                    .eq('status', 'pending');
            }

            return NextResponse.json({ received: true });
        }

        // --- Credit deposit or standard purchase ---
        const purchaseId = externalReference.startsWith('purchase_')
            ? externalReference.replace('purchase_', '')
            : (metadata.purchase_id || metadata.purchaseId);
        const userIdMetadata = metadata.user_id || metadata.userId;

        const isCredit = !purchaseId && (
            externalReference.startsWith('user_') ||
            metadata.type === 'credit' ||
            description.toLowerCase().includes('creditos')
        );

        if (isCredit) {
            const userId = externalReference.startsWith('user_')
                ? externalReference.split('_')[1]
                : userIdMetadata;

            if (userId) {
                const { error: rpcError } = await supabaseAdmin.rpc('deposit_auction_credits', {
                    p_user_id: userId,
                    p_amount: mpPayment.transaction_amount,
                    p_mp_payment_id: paymentIdValue,
                });

                if (rpcError) {
                    console.error('Error depositing credits via webhook:', rpcError);
                }
            }

            return NextResponse.json({ received: true });
        }

        if (!purchaseId) {
            console.log(`Payment approved but not categorized: ${description} (Ref: ${externalReference})`);
            return NextResponse.json({ received: true });
        }

        if (mpPayment.status === 'approved') {
            const { data: purchaseData, error: fetchError } = await supabaseAdmin
                .from('purchases')
                .select('id, status')
                .eq('id', purchaseId)
                .single();

            if (fetchError || !purchaseData) {
                console.error(`Error fetching purchase ${purchaseId} for inventory update:`, fetchError);
                return NextResponse.json({ received: true });
            }

            if (purchaseData.status !== 'approved') {
                await markPurchaseApproved(supabaseAdmin, purchaseId, paymentIdValue);
            }

            return NextResponse.json({ received: true });
        }

        const { data: purchaseData, error: fetchError } = await supabaseAdmin
            .from('purchases')
            .select('status')
            .eq('id', purchaseId)
            .single();

        if (fetchError || !purchaseData) {
            console.error(`Error fetching purchase ${purchaseId} for refund/cancelation:`, fetchError);
            return NextResponse.json({ received: true });
        }

        if (purchaseData.status !== 'canceled' && purchaseData.status !== 'refunded') {
            await markPurchaseCanceled(
                supabaseAdmin,
                purchaseId,
                mpPayment.status === 'refunded' ? 'refunded' : 'canceled'
            );
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    return handleWebhook(req);
}

export async function GET(req: Request) {
    void req;
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
}
