import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const MELHOR_ENVIO_API = 'https://melhorenvio.com.br/api/v2/me';
const MELHOR_ENVIO_SANDBOX = 'https://sandbox.melhorenvio.com.br/api/v2/me';

async function getMelhorEnvioToken() {
    const { data } = await supabaseAdmin
        .from('admin_settings')
        .select('value')
        .eq('key', 'melhor_envio_token')
        .single();
    return data?.value ? String(data.value).replace(/"/g, '') : null;
}

async function getOriginAddress() {
    const { data } = await supabaseAdmin
        .from('admin_settings')
        .select('value')
        .eq('key', 'origin_address')
        .single();
    return data?.value || null;
}

function getBaseUrl(token: string | null) {
    // Use sandbox if token looks like sandbox or not set
    if (!token || token.includes('sandbox')) return MELHOR_ENVIO_SANDBOX;
    return MELHOR_ENVIO_API;
}

// POST /api/shipping/quote - Get shipping quotes
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        const token = await getMelhorEnvioToken();
        const origin = await getOriginAddress();

        if (!token) {
            return NextResponse.json({
                error: 'Token do Melhor Envio não configurado. Configure nas Configurações do Admin.',
                needsSetup: true
            }, { status: 400 });
        }

        if (!origin || !origin.postal_code) {
            return NextResponse.json({
                error: 'Endereço de origem não configurado. Configure nas Configurações do Admin.',
                needsSetup: true
            }, { status: 400 });
        }

        const baseUrl = getBaseUrl(token);

        switch (action) {
            case 'quote': {
                const { destination_postal_code, weight = 0.1, height = 2, width = 12, length = 17 } = body;

                if (!destination_postal_code) {
                    return NextResponse.json({ error: 'CEP de destino é obrigatório' }, { status: 400 });
                }

                const res = await fetch(`${baseUrl}/shipment/calculate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'User-Agent': 'TCGMegaStore (contato@tcgmegastore.com.br)',
                    },
                    body: JSON.stringify({
                        from: { postal_code: origin.postal_code },
                        to: { postal_code: destination_postal_code },
                        products: [{
                            id: 'card',
                            width, height, length,
                            weight,
                            insurance_value: body.insurance_value || 50,
                            quantity: 1,
                        }],
                    }),
                });

                if (!res.ok) {
                    const err = await res.text();
                    console.error('Melhor Envio quote error:', err);
                    return NextResponse.json({ error: 'Erro ao consultar fretes' }, { status: 502 });
                }

                const quotes = await res.json();
                // Filter only available services
                const available = quotes.filter((q: any) => !q.error);

                return NextResponse.json({ success: true, quotes: available });
            }

            case 'generate_label': {
                const { auction_id, buyer_address, shipping_service_id, card_value } = body;

                if (!auction_id || !buyer_address || !shipping_service_id) {
                    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
                }

                // 1. Create cart on Melhor Envio
                const cartRes = await fetch(`${baseUrl}/cart`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'User-Agent': 'TCGMegaStore (contato@tcgmegastore.com.br)',
                    },
                    body: JSON.stringify({
                        service: shipping_service_id,
                        from: {
                            name: origin.name || 'TCG Mega Store',
                            phone: origin.phone,
                            email: origin.email,
                            company_document: origin.company_document || '',
                            address: origin.address,
                            complement: origin.complement || '',
                            number: origin.number,
                            district: origin.district,
                            city: origin.city,
                            state_abbr: origin.state_abbr,
                            postal_code: origin.postal_code,
                            country_id: 'BR',
                        },
                        to: {
                            name: buyer_address.name,
                            phone: buyer_address.phone,
                            email: buyer_address.email,
                            address: buyer_address.address,
                            complement: buyer_address.complement || '',
                            number: buyer_address.number,
                            district: buyer_address.district,
                            city: buyer_address.city,
                            state_abbr: buyer_address.state_abbr,
                            postal_code: buyer_address.postal_code,
                            country_id: 'BR',
                        },
                        products: [{
                            name: 'Carta Pokémon TCG',
                            quantity: 1,
                            unitary_value: card_value || 50,
                        }],
                        volumes: [{
                            height: 2,
                            width: 12,
                            length: 17,
                            weight: 0.1,
                        }],
                        options: {
                            insurance_value: card_value || 50,
                            receipt: false,
                            own_hand: false,
                        },
                    }),
                });

                if (!cartRes.ok) {
                    const err = await cartRes.text();
                    console.error('Melhor Envio cart error:', err);
                    return NextResponse.json({ error: 'Erro ao criar pedido de envio' }, { status: 502 });
                }

                const cartData = await cartRes.json();
                const orderId = cartData.id;

                // 2. Save to our database
                await supabaseAdmin.from('auction_shipping').upsert({
                    auction_id,
                    buyer_id: body.buyer_id,
                    buyer_name: buyer_address.name,
                    buyer_address,
                    origin_address: origin,
                    shipping_method: `Melhor Envio - ${shipping_service_id}`,
                    shipping_cost: cartData.price || 0,
                    melhor_envio_order_id: orderId,
                    status: 'label_created',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'auction_id' });

                return NextResponse.json({
                    success: true,
                    orderId,
                    message: 'Pedido de envio criado. Acesse o Melhor Envio para pagar e imprimir a etiqueta.',
                    melhorEnvioUrl: `https://melhorenvio.com.br/painel/carrinho`,
                });
            }

            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
        }

    } catch (error) {
        console.error('Shipping API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro interno' },
            { status: 500 }
        );
    }
}
