import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/server-auth';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
    console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is perfectly missing in the environment. RLS bypass will fail.');
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost',
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'
);

// Initialize MP using the generic credentials
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
    userId?: string;
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

        const {
            userId, useCashback, discountAmount, payer,
            items = [], totalAmount, shippingAddress, shippingCost
        } = body;

        if (!userId || (userId !== auth.user.id && !auth.isAdmin)) {
            return NextResponse.json({ error: 'Usuario invalido para criar checkout.' }, { status: 403 });
        }

        const numericDiscountAmount = Number(discountAmount) || 0;

        let email = payer?.email;

        if (!email) {
            email = 'guest@tcghub.com.br'; // Safe fallback that won't trigger self-payment blocks
        }

        // Get robust BASE_URL (Next.js server environments often strip or alter origin on internal fetch, returning 'null')
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');

        let BASE_URL = `${protocol}://${host}`;
        if (BASE_URL.includes('null')) BASE_URL = 'http://localhost:3000';

        // Workaround: Mercado Pago's back_urls validation fails with http://localhost URLs.
        // The checkout returns through back_urls in production, so we keep a valid public URL in local tests.
        if (BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1')) {
            BASE_URL = 'https://tcg-hub.tonicoimbra.com';
        }

        // 100% cashback: no MP payment needed, just return a success signal handled by frontend
        const totalWithShipping = Number(totalAmount) + (Number(shippingCost) || 0);
        const mpPaymentId = 'cashback-' + Date.now();
        const isCashbackOnly = totalWithShipping === 0 || (useCashback && numericDiscountAmount >= totalWithShipping);

        // Deduct cashback immediately if applicable
        if (useCashback && numericDiscountAmount > 0 && userId) {
            const { data: success, error: deductError } = await supabaseAdmin.rpc('deduct_cashback', {
                p_user_id: userId,
                p_amount: numericDiscountAmount
            });
            if (deductError || !success) {
                return NextResponse.json({ error: 'Erro ao descontar cashback. Saldo insuficiente?' }, { status: 400 });
            }
        }

        // Create the purchase record in pending status (or approved if cashback only)
        let purchaseId = null;
        if (userId) {
            const { data: purchaseData, error: purchaseError } = await supabaseAdmin.from('purchases').insert({
                user_id: userId,
                items: items || [],
                total_amount: totalAmount,
                discount_amount: numericDiscountAmount,
                cashback_earned: 0,
                payment_method: isCashbackOnly ? 'wallet' : 'mercadopago_checkout',
                mp_payment_id: isCashbackOnly ? mpPaymentId : null, // will be updated by webhook for MP
                shipping_address: shippingAddress || null,
                status: isCashbackOnly ? 'approved' : 'pending'
            }).select('id').single();

            if (purchaseError) {
                console.error('💥 FATAL ERROR ao salvar compra preliminar:', purchaseError);
                return NextResponse.json({ error: 'Erro no Banco de Dados', details: purchaseError.message || purchaseError }, { status: 500 });
            } else if (purchaseData) {
                purchaseId = purchaseData.id;
                console.log('✅ Purchase ID created:', purchaseId);

                if (isCashbackOnly) {
                    // Decrement inventory immediately since payment is already approved
                    for (const item of items || []) {
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
        } else {
            console.error('💥 FATAL ERROR: No userId provided to Preference API');
            return NextResponse.json({ error: 'Erro crítico: userId ausente.' }, { status: 400 });
        }

        if (isCashbackOnly) {
            return NextResponse.json({
                isCashbackOnly: true,
                message: 'Pagamento 100% coberto pelo cashback',
                purchaseId: purchaseId
            });
        }

        // Apply discount to items if useCashback
        const mpItems = items.map((item: PreferenceItemInput) => ({
            id: item.id || `item-${Date.now()}`,
            title: item.title || item.card_name || 'Produto TCG Hub',
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || Number(item.price) || 0,
            currency_id: 'BRL',
        }));

        if (Number(shippingCost) > 0) {
            mpItems.push({
                id: 'shipping-cost',
                title: 'Custo de Envio (Frete)',
                quantity: 1,
                unit_price: Number(shippingCost),
                currency_id: 'BRL'
            });
        }

        if (useCashback && numericDiscountAmount > 0) {
            mpItems.push({
                id: 'cashback-discount',
                title: 'Desconto de Saldo/Cashback',
                quantity: 1,
                unit_price: -numericDiscountAmount,
                currency_id: 'BRL'
            });
        }

        // We assume the user profile name and document will be collected by Mercado Pago checkout
        const preferenceRequest = {
            body: {
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [],
                    installments: 12
                },
                items: mpItems,
                payer: {
                    email: email,
                    name: payer?.name?.split(' ')[0] || 'Cliente',
                    surname: payer?.name?.split(' ').slice(1).join(' ') || 'Site',
                    // Let Mercado Pago handle the address input during checkout for simplicity
                },
                back_urls: {
                    success: buildRedirectUrl(BASE_URL, '/minha-conta/pedidos', { status: 'success', purchaseId }),
                    pending: buildRedirectUrl(BASE_URL, '/minha-conta/pedidos', { status: 'pending', purchaseId }),
                    failure: buildRedirectUrl(BASE_URL, '/pagamento', { status: 'failure', purchaseId })
                },
                auto_return: 'approved',
                statement_descriptor: 'TCG HUB',
                notification_url: `${BASE_URL}/api/webhook/mercadopago`,
                external_reference: purchaseId ? `purchase_${purchaseId}` : (userId ? `user_${userId}_${Date.now()}` : `guest_${Date.now()}`),
                metadata: {
                    user_id: userId,
                    purchase_id: purchaseId,
                    use_cashback: useCashback ? 'true' : 'false',
                    discount_amount: String(numericDiscountAmount),
                    shipping_address: JSON.stringify(shippingAddress)
                }
            }
        };

        const result = await preference.create(preferenceRequest);

        return NextResponse.json({ id: result.id, init_point: result.init_point, purchaseId: purchaseId });

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
