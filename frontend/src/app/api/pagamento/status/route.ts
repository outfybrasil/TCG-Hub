import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { markPurchaseApproved, type PurchaseStatusRow } from '@/lib/purchase-status';
import { supabaseAdmin as sharedSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const runtime = 'nodejs';

function buildSupabaseAdmin() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        throw new Error('System configuration error: Service key missing');
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        serviceRoleKey
    ) as typeof sharedSupabaseAdmin;
}

async function fetchMercadoPagoPayment(purchaseId: string, mpPaymentId: string | null) {
    const headers = { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` };

    if (mpPaymentId) {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, { headers });
        if (res.ok) {
            return await res.json();
        }
    }

    const searchRes = await fetch(
        `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference=purchase_${purchaseId}`,
        { headers }
    );

    if (!searchRes.ok) {
        return null;
    }

    const searchJson = await searchRes.json();
    return searchJson.results?.[0] || null;
}

async function loadPurchase(
    supabaseAdmin: typeof sharedSupabaseAdmin,
    purchaseId: string
) {
    const { data, error } = await supabaseAdmin
        .from('purchases')
        .select('id, user_id, status, mp_payment_id, items')
        .eq('id', purchaseId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data as PurchaseStatusRow | null;
}

async function handleStatus(req: Request, shouldReconcile: boolean) {
    try {
        const { searchParams } = new URL(req.url);
        const purchaseId = searchParams.get('id');

        if (!purchaseId) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const auth = await requireAuthenticatedUser(req);
        if ('response' in auth) {
            return auth.response;
        }

        const supabaseAdmin = buildSupabaseAdmin();
        const purchase = await loadPurchase(supabaseAdmin, purchaseId);

        if (!purchase) {
            return NextResponse.json({ error: 'Compra nao encontrada.' }, { status: 404 });
        }

        if (!auth.isAdmin && purchase.user_id !== auth.user.id) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        if (purchase.status === 'approved') {
            return NextResponse.json({ status: 'approved', source: 'database' });
        }

        if (!shouldReconcile) {
            return NextResponse.json({ status: purchase.status || 'unknown', source: 'database' });
        }

        const mpPayment = await fetchMercadoPagoPayment(purchaseId, purchase.mp_payment_id);
        if (!mpPayment) {
            return NextResponse.json({ status: purchase.status || 'unknown', source: 'database' });
        }

        if (mpPayment.status === 'approved') {
            await markPurchaseApproved(supabaseAdmin, purchase.id, String(mpPayment.id));
            return NextResponse.json({ status: 'approved', source: 'mercadopago' });
        }

        return NextResponse.json({
            status: purchase.status || mpPayment.status || 'unknown',
            mercadoPagoStatus: mpPayment.status || null,
            source: 'database',
        });
    } catch (err) {
        console.error('Status API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return handleStatus(req, false);
}

export async function POST(req: Request) {
    return handleStatus(req, true);
}
