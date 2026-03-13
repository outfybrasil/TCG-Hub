import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { markPurchaseApproved, markPurchaseCanceled } from '@/lib/purchase-status';

export const dynamic = 'force-dynamic';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
    const msg = 'ERROR: SUPABASE_SERVICE_ROLE_KEY is missing! Webhook cannot bypass RLS.';
    console.error(msg);
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceRoleKey || 'missing-key'
);

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
        const purchaseId = externalReference.startsWith('purchase_')
            ? externalReference.replace('purchase_', '')
            : (metadata.purchase_id || metadata.purchaseId);
        const userIdMetadata = metadata.user_id || metadata.userId;
        const paymentIdValue = String(mpPayment.id || paymentId);

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
    return handleWebhook(req);
}
