import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { supabase } from '@/lib/supabase';

// Initialize MP using the generic credentials
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const preference = new Preference(client);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log('Raw preference body received:', JSON.stringify(body, null, 2));

        const {
            userId, useCashback, discountAmount, payer,
            items = [], totalAmount, shippingAddress
        } = body;

        let email = payer?.email;

        if (!email) {
            email = 'guest@tcghub.com.br'; // Safe fallback that won't trigger self-payment blocks
        }

        // Get robust BASE_URL (Next.js server environments often strip or alter origin on internal fetch, returning 'null')
        let host = req.headers.get('host') || 'localhost:3000';
        let protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');

        let BASE_URL = `${protocol}://${host}`;
        if (BASE_URL.includes('null')) BASE_URL = 'http://localhost:3000';

        // 100% cashback: no MP payment needed, just return a success signal handled by frontend
        if (totalAmount === 0 || (useCashback && discountAmount >= totalAmount)) {
            return NextResponse.json({
                isCashbackOnly: true,
                message: 'Pagamento 100% coberto pelo cashback'
            });
        }

        // Apply discount to items if useCashback
        const mpItems = items.map((item: any) => ({
            id: item.id || `item-${Date.now()}`,
            title: item.title || item.card_name || 'Produto TCG Hub',
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || Number(item.price) || 0,
            currency_id: 'BRL',
        }));

        if (useCashback && discountAmount > 0) {
            mpItems.push({
                id: 'cashback-discount',
                title: 'Desconto de Saldo/Cashback',
                quantity: 1,
                unit_price: -Number(discountAmount),
                currency_id: 'BRL'
            });
        }

        // We assume the user profile name and document will be collected by Mercado Pago checkout
        const preferenceRequest: any = {
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
                    success: 'https://tcghub.com.br/minha-conta/pedidos?status=success',
                    pending: 'https://tcghub.com.br/minha-conta/pedidos?status=pending',
                    failure: 'https://tcghub.com.br/pagamento?status=failure'
                },
                auto_return: 'approved',
                statement_descriptor: 'TCG HUB',
                external_reference: userId ? `user_${userId}_${Date.now()}` : `guest_${Date.now()}`,
                metadata: {
                    userId: userId,
                    useCashback: useCashback ? 'true' : 'false',
                    discountAmount: String(discountAmount),
                    shippingAddress: JSON.stringify(shippingAddress)
                }
            }
        };

        console.log('Creating Preference with Mercado Pago:', JSON.stringify(preferenceRequest.body, null, 2));

        try {
            const fs = require('fs');
            fs.writeFileSync('C:/Users/Teste/Documents/Projetos/TCG Hub/debug_preference.json', JSON.stringify({
                bodyRecebidoFrontend: body,
                payloadGeradoMecadoPago: preferenceRequest.body
            }, null, 2));
        } catch (e) {
            console.error(e);
        }

        const result = await preference.create(preferenceRequest);

        return NextResponse.json({ id: result.id, init_point: result.init_point });

    } catch (error: any) {
        console.error('Mercado Pago Preference Error:', JSON.stringify({
            message: error.message,
            cause: error.cause,
            status: error.status,
            apiResponse: error.apiResponse?.body || error.apiResponse,
        }, null, 2));

        const detail = error.cause?.[0]?.description || error.apiResponse?.body?.message || error.message || 'Erro ao gerar Checkout do Mercado Pago';
        return NextResponse.json({ error: detail }, { status: error.status || 500 });
    }
}
