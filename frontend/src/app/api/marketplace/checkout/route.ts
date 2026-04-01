import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const PLATFORM_FEE_PCT = 8.0;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const mpPreference = new Preference(mpClient);

interface CheckoutBody {
    listing_id: string;
    quantity: number;
    shipping_address?: {
        street?: string;
        number?: string;
        city?: string;
        state?: string;
        cep?: string;
    };
}

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) return auth.response;

    const userId = auth.user.id;
    const email = auth.user.email || 'comprador@tcghub.com.br';

    const body: CheckoutBody = await req.json();
    const { listing_id, quantity = 1, shipping_address } = body;

    if (!listing_id) {
        return NextResponse.json({ error: 'listing_id é obrigatório.' }, { status: 400 });
    }

    // Buscar a listing (fonte da verdade: servidor, nunca o cliente)
    const { data: listing, error: listingErr } = await supabaseAdmin
        .from('seller_listings')
        .select('*')
        .eq('id', listing_id)
        .eq('status', 'active')
        .single();

    if (listingErr || !listing) {
        return NextResponse.json({ error: 'Listagem não encontrada ou indisponível.' }, { status: 404 });
    }

    // Vendedor não pode comprar a própria carta
    if (listing.seller_id === userId) {
        return NextResponse.json({ error: 'Você não pode comprar sua própria listagem.' }, { status: 400 });
    }

    // Validar quantidade
    const validQty = Math.min(parseInt(String(quantity)), listing.quantity);
    if (validQty < 1) {
        return NextResponse.json({ error: 'Quantidade inválida ou esgotada.' }, { status: 400 });
    }

    // Calcular valores server-side (nunca confiamos no cliente)
    const unitPrice = Number(listing.price);
    const totalAmount = unitPrice * validQty;
    const platformFeeAmount = Number((totalAmount * (PLATFORM_FEE_PCT / 100)).toFixed(2));
    const sellerNetAmount = Number((totalAmount - platformFeeAmount).toFixed(2));

    // URL base
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    let baseUrl = `${protocol}://${host}`;
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        baseUrl = 'https://tcg-hub.tonicoimbra.com';
    }

    // Criar registro de pedido (pending)
    const { data: orderData, error: orderErr } = await supabaseAdmin
        .from('seller_orders')
        .insert({
            listing_id,
            buyer_id: userId,
            seller_id: listing.seller_id,
            quantity: validQty,
            unit_price: unitPrice,
            platform_fee_pct: PLATFORM_FEE_PCT,
            platform_fee_amount: platformFeeAmount,
            seller_net_amount: sellerNetAmount,
            shipping_address: shipping_address || null,
            status: 'pending',
        })
        .select('id')
        .single();

    if (orderErr || !orderData) {
        return NextResponse.json({ error: 'Erro ao criar pedido.', details: orderErr?.message }, { status: 500 });
    }

    const orderId = orderData.id;

    // Criar preferência no Mercado Pago
    try {
        const result = await mpPreference.create({
            body: {
                payment_methods: {
                    excluded_payment_types: [],
                    installments: 6,
                },
                items: [
                    {
                        id: listing.card_id || listing_id,
                        title: `${listing.card_name} (${listing.condition}) — Vendedor P2P`,
                        quantity: validQty,
                        unit_price: unitPrice,
                        currency_id: 'BRL',
                        picture_url: listing.image_url || undefined,
                    },
                ],
                payer: { email },
                back_urls: {
                    success: `${baseUrl}/minha-conta/pedidos?type=p2p&status=success&orderId=${orderId}`,
                    pending: `${baseUrl}/minha-conta/pedidos?type=p2p&status=pending&orderId=${orderId}`,
                    failure: `${baseUrl}/marketplace?status=failure&orderId=${orderId}`,
                },
                auto_return: 'approved',
                statement_descriptor: 'TCG HUB P2P',
                notification_url: `${baseUrl}/api/webhook/mercadopago`,
                external_reference: `seller_order_${orderId}`,
                metadata: {
                    order_id: orderId,
                    order_type: 'seller_p2p',
                    buyer_id: userId,
                    seller_id: listing.seller_id,
                    listing_id,
                    platform_fee_amount: String(platformFeeAmount),
                    seller_net_amount: String(sellerNetAmount),
                },
            },
        });

        // Atualizar pedido com preference_id
        await supabaseAdmin
            .from('seller_orders')
            .update({ mp_preference_id: result.id })
            .eq('id', orderId);

        return NextResponse.json({
            id: result.id,
            init_point: result.init_point,
            orderId,
            summary: {
                unit_price: unitPrice,
                quantity: validQty,
                total: totalAmount,
                platform_fee: platformFeeAmount,
                seller_receives: sellerNetAmount,
                fee_pct: PLATFORM_FEE_PCT,
            },
        });
    } catch (error: unknown) {
        // Reverter pedido criado se o MP falhar
        await supabaseAdmin.from('seller_orders').update({ status: 'cancelled' }).eq('id', orderId);
        const mpError = error as { message?: string; status?: number };
        return NextResponse.json(
            { error: mpError.message || 'Erro ao gerar checkout.' },
            { status: mpError.status || 500 }
        );
    }
}
