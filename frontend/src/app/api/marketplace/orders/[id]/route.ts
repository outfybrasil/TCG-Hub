import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) return auth.response;

    const userId = auth.user.id;
    const { id: orderId } = await params;

    const { data: order } = await supabaseAdmin
        .from('seller_orders')
        .select('seller_id, buyer_id, status')
        .eq('id', orderId)
        .single();

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

    const body = await req.json();
    const { action } = body;

    // Vendedor envia código de rastreio
    if (action === 'ship') {
        if (order.seller_id !== userId) {
            return NextResponse.json({ error: 'Apenas o vendedor pode marcar como enviado.' }, { status: 403 });
        }

        if (order.status !== 'paid') {
            return NextResponse.json({ error: 'Pedido precisa estar pago para ser enviado.' }, { status: 400 });
        }

        const { tracking_code } = body;
        if (!tracking_code || String(tracking_code).trim().length < 3) {
            return NextResponse.json({ error: 'Código de rastreio inválido.' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('seller_orders')
            .update({
                status: 'shipped',
                tracking_code: String(tracking_code).trim().toUpperCase(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ order: data });
    }

    // Comprador confirma recebimento
    if (action === 'confirm_delivery') {
        if (order.buyer_id !== userId) {
            return NextResponse.json({ error: 'Apenas o comprador pode confirmar recebimento.' }, { status: 403 });
        }

        if (order.status !== 'shipped') {
            return NextResponse.json({ error: 'Pedido precisa estar enviado.' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('seller_orders')
            .update({ status: 'delivered', updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Liberar saldo do vendedor após confirmação
        await supabaseAdmin.rpc('release_seller_balance', {
            p_seller_id: order.seller_id,
            p_amount: data.seller_net_amount,
        });

        return NextResponse.json({ order: data });
    }

    // Comprador deixa avaliação
    if (action === 'review') {
        if (order.buyer_id !== userId) {
            return NextResponse.json({ error: 'Apenas o comprador pode avaliar.' }, { status: 403 });
        }

        if (order.status !== 'delivered') {
            return NextResponse.json({ error: 'Só é possível avaliar após recebimento confirmado.' }, { status: 400 });
        }

        const { rating, comment } = body;
        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Avaliação deve ser entre 1 e 5.' }, { status: 400 });
        }

        const { error: reviewErr } = await supabaseAdmin.from('seller_reviews').insert({
            order_id: orderId,
            reviewer_id: userId,
            seller_id: order.seller_id,
            rating: parseInt(String(rating)),
            comment: comment ? String(comment).substring(0, 500) : null,
        });

        if (reviewErr) {
            if (reviewErr.code === '23505') {
                return NextResponse.json({ error: 'Você já avaliou este pedido.' }, { status: 400 });
            }
            return NextResponse.json({ error: reviewErr.message }, { status: 500 });
        }

        // Recalcular média do vendedor
        await supabaseAdmin.rpc('update_seller_rating', { p_seller_id: order.seller_id });

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}
