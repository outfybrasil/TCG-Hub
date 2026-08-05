import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { MercadoPagoConfig, Preference } from 'mercadopago';
import { supabaseAdmin } from '@/lib/supabase-admin';

import { requireAuthenticatedUser } from '@/lib/server-auth';
import { getSiteUrl } from '@/lib/site-url';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const preference = new Preference(client);

interface PreferenceItemInput {
    card_name?: string;
    id?: string;
    imageUrl?: string;
    is_auction?: boolean;
    price?: number;
    quantity?: number;
    title?: string;
    unit_price?: number;
}

interface PreferenceRequestBody {
    discountAmount?: number;
    items?: PreferenceItemInput[];
    payer?: {
        email?: string;
        name?: string;
    };
    shippingAddress?: unknown;
    shippingCost?: number;
    totalAmount?: number;
    useCashback?: boolean;
}

function buildRedirectUrl(baseUrl: string, path: string, params: Record<string, string | null | undefined>) {
    const url = new URL(path, baseUrl);

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });

    return url.toString();
}

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const body = await req.json() as PreferenceRequestBody;
        const { useCashback, discountAmount, payer, items = [], shippingAddress, shippingCost } = body;
        const userId = auth.user.id;

        if (!items.length || items.some((item) => !item.id || item.is_auction)) {
            return NextResponse.json({ error: 'Itens invalidos para checkout.' }, { status: 400 });
        }
        const requestedQuantities = new Map(items.map((item) => [String(item.id), Math.min(Math.max(Number(item.quantity) || 1, 1), 100)]));
        const { data: inventoryItems, error: inventoryError } = await supabaseAdmin
            .from('inventory')
            .select('id, name, price, quantity, image_url')
            .in('id', [...requestedQuantities.keys()]);
        if (inventoryError || !inventoryItems || inventoryItems.length !== requestedQuantities.size) {
            return NextResponse.json({ error: 'Um ou mais itens nao estao disponiveis.' }, { status: 409 });
        }
        const serverItems = inventoryItems.map((item) => {
            const quantity = requestedQuantities.get(String(item.id)) || 1;
            if (quantity > Number(item.quantity) || Number(item.price) <= 0) throw new Error('Quantidade ou preco indisponivel.');
            return { id: item.id, title: item.name, card_name: item.name, imageUrl: item.image_url, quantity, unit_price: Number(item.price), price: Number(item.price) };
        });
        const safeShippingCost = Number(shippingCost);
        if (!Number.isFinite(safeShippingCost) || safeShippingCost < 0 || safeShippingCost > 1000) {
            return NextResponse.json({ error: 'Frete invalido.' }, { status: 400 });
        }
        const itemsTotal = serverItems.reduce((total, item) => total + item.unit_price * item.quantity, 0);
        const totalWithShipping = Number((itemsTotal + safeShippingCost).toFixed(2));
        const numericDiscountAmount = Math.min(Math.max(Number(discountAmount) || 0, 0), totalWithShipping);
        let email = payer?.email || auth.user.email;

        if (!email) {
            email = 'guest@tcg-megastore.com.br';
        }

        const baseUrl = getSiteUrl();
        const mpPaymentId = `cashback-${Date.now()}`;
        const isCashbackOnly = totalWithShipping === 0 || (useCashback && numericDiscountAmount >= totalWithShipping);

        if (useCashback && numericDiscountAmount > 0) {
            const { data: success, error: deductError } = await supabaseAdmin.rpc('deduct_cashback', {
                p_user_id: userId,
                p_amount: numericDiscountAmount,
            });
            if (deductError || !success) {
                return NextResponse.json({ error: 'Erro ao descontar cashback. Saldo insuficiente?' }, { status: 400 });
            }
        }

        const { data: purchaseData, error: purchaseError } = await supabaseAdmin.from('purchases').insert({
            user_id: userId,
            items: serverItems,
            total_amount: totalWithShipping,
            discount_amount: numericDiscountAmount,
            cashback_earned: 0,
            payment_method: isCashbackOnly ? 'wallet' : 'mercadopago_checkout',
            mp_payment_id: isCashbackOnly ? mpPaymentId : null,
            shipping_address: shippingAddress || null,
            status: isCashbackOnly ? 'approved' : 'pending',
        }).select('id').single();

        if (purchaseError) {
            console.error('FATAL ERROR ao salvar compra preliminar:', purchaseError);
            return NextResponse.json({ error: 'Erro no Banco de Dados', details: purchaseError.message || purchaseError }, { status: 500 });
        }

        const purchaseId = purchaseData?.id || null;

        if (isCashbackOnly) {
            for (const item of serverItems) {
                if (item.id) {
                    const { error: rpcError } = await supabaseAdmin.rpc('decrement_inventory', {
                        p_item_id: item.id,
                        p_quantity: item.quantity || 1,
                    });
                    if (rpcError) {
                        console.error(`Error decrementing inventory for item ${item.id}:`, rpcError);
                    }
                }
            }

            return NextResponse.json({
                isCashbackOnly: true,
                message: 'Pagamento 100% coberto pelo cashback',
                purchaseId,
            });
        }

        const mpItems = serverItems.map((item) => ({
            id: item.id || `item-${Date.now()}`,
            title: item.title || item.card_name || 'Produto TCG MEGASTORE',
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || Number(item.price) || 0,
            currency_id: 'BRL',
        }));

        if (safeShippingCost > 0) {
            mpItems.push({
                id: 'shipping-cost',
                title: 'Custo de Envio (Frete)',
                quantity: 1,
                unit_price: safeShippingCost,
                currency_id: 'BRL',
            });
        }

        if (useCashback && numericDiscountAmount > 0) {
            mpItems.push({
                id: 'cashback-discount',
                title: 'Desconto de Saldo/Cashback',
                quantity: 1,
                unit_price: -numericDiscountAmount,
                currency_id: 'BRL',
            });
        }

        const preferenceRequest = {
            body: {
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [],
                    installments: 12,
                },
                items: mpItems,
                payer: {
                    email,
                    name: payer?.name?.split(' ')[0] || 'Cliente',
                    surname: payer?.name?.split(' ').slice(1).join(' ') || 'Site',
                },
                back_urls: {
                    success: buildRedirectUrl(baseUrl, '/minha-conta/pedidos', { status: 'success', purchaseId }),
                    pending: buildRedirectUrl(baseUrl, '/minha-conta/pedidos', { status: 'pending', purchaseId }),
                    failure: buildRedirectUrl(baseUrl, '/pagamento', { status: 'failure', purchaseId }),
                },
                auto_return: 'approved',
                statement_descriptor: 'TCG MEGASTORE',
                notification_url: `${baseUrl}/api/webhook/mercadopago`,
                external_reference: purchaseId ? `purchase_${purchaseId}` : `user_${userId}_${Date.now()}`,
                metadata: {
                    user_id: userId,
                    purchase_id: purchaseId,
                    use_cashback: useCashback ? 'true' : 'false',
                    discount_amount: String(numericDiscountAmount),
                    shipping_address: JSON.stringify(shippingAddress),
                },
            },
        };

        const result = await preference.create(preferenceRequest);

        return NextResponse.json({ id: result.id, init_point: result.init_point, purchaseId });
    } catch (error: unknown) {
        const mpError = error as {
            apiResponse?: { body?: { message?: string } } | unknown;
            cause?: Array<{ description?: string }>;
            message?: string;
            status?: number;
        };

        console.error('Mercado Pago Preference Error:', JSON.stringify({
            message: mpError.message,
            cause: mpError.cause,
            status: mpError.status,
            apiResponse: mpError.apiResponse && typeof mpError.apiResponse === 'object' && 'body' in mpError.apiResponse
                ? (mpError.apiResponse as { body?: unknown }).body
                : mpError.apiResponse,
        }, null, 2));

        const apiMessage =
            mpError.apiResponse &&
            typeof mpError.apiResponse === 'object' &&
            'body' in mpError.apiResponse &&
            typeof (mpError.apiResponse as { body?: { message?: string } }).body?.message === 'string'
                ? (mpError.apiResponse as { body?: { message?: string } }).body?.message
                : undefined;

        const detail = mpError.cause?.[0]?.description || apiMessage || mpError.message || 'Erro ao gerar Checkout do Mercado Pago';
        return NextResponse.json({ error: detail }, { status: mpError.status || 500 });
    }
}
