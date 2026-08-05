import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export async function GET(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const userId = auth.user.id;

        // Buscar todas as purchases que contenham itens onde seller_id seja o userId
        // Usamos filter com 'cs' (@> JSONB contains) com JSON string correta
        const { data: purchases, error } = await supabaseAdmin
            .from('purchases')
            .select('*')
            .filter('items', 'cs', JSON.stringify([{ seller_id: userId }]))
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar vendas do usuario:', error);
            return NextResponse.json({ error: 'Erro ao buscar vendas: ' + error.message }, { status: 500 });
        }

        if (!purchases || purchases.length === 0) {
            return NextResponse.json({ purchases: [] });
        }

        // Buscar nomes dos compradores via auth.admin (service role tem acesso)
        const buyerIds = [...new Set(purchases.map((p: any) => p.user_id))];
        const buyerNames: Record<string, string> = {};

        for (const buyerId of buyerIds) {
            try {
                const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(buyerId);
                buyerNames[buyerId] = user?.user_metadata?.full_name 
                    || user?.user_metadata?.name 
                    || user?.email?.split('@')[0] 
                    || 'Comprador';
            } catch {
                buyerNames[buyerId] = 'Comprador';
            }
        }

        // Filtra apenas os itens deste vendedor e calcula totais
        const filteredPurchases = purchases.map((p: any) => {
            const myItems = p.items?.filter((i: any) => i.seller_id === userId) || [];
            const myTotal = myItems.reduce((acc: number, item: any) => acc + (Number(item.price) * (item.quantity || 1)), 0);

            return {
                ...p,
                items: myItems,
                my_total_amount: myTotal,
                buyer_name: buyerNames[p.user_id] || 'Comprador'
            };
        }).filter((p: any) => p.items.length > 0);

        return NextResponse.json({ purchases: filteredPurchases });
    } catch (error) {
        console.error('User Vendas API Error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) return auth.response;

    try {
        const userId = auth.user.id;
        const { purchaseId, trackingCode } = await req.json();

        // Verify this user is the seller of this purchase
        const { data: purchase, error: purchaseError } = await supabaseAdmin
            .from('purchases')
            .select('id, items, status')
            .eq('id', purchaseId)
            .single();

        if (purchaseError || !purchase) {
            return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
        }

        const isSeller = purchase.items?.some((i: any) => i.seller_id === userId);
        if (!isSeller && !auth.isAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        if (!['approved', 'paid', 'processing'].includes(String(purchase.status))) {
            return NextResponse.json({ error: 'Esta venda nao pode ser marcada como enviada.' }, { status: 409 });
        }

        const normalizedTrackingCode = String(trackingCode || '').trim().toUpperCase();
        if (!/^[A-Z0-9-]{3,40}$/.test(normalizedTrackingCode)) {
            return NextResponse.json({ error: 'Codigo de rastreio invalido.' }, { status: 400 });
        }

        const { error: updateError } = await supabaseAdmin.from('purchases').update({
            tracking_code: normalizedTrackingCode,
            status: 'shipped',
            carrier: 'Correios',
            updated_at: new Date().toISOString()
        }).eq('id', purchaseId).eq('status', purchase.status);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('User Vendas Update API Error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
