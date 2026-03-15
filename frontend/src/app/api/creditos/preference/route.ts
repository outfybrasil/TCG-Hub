import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

import { requireAuthenticatedUser } from '@/lib/server-auth';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const preference = new Preference(client);

interface CreditsPreferenceBody {
    amount?: number;
    payerFirstName?: string;
    payerLastName?: string;
}

interface MercadoPagoRouteError {
    apiResponse?: { body?: { message?: string } };
    cause?: Array<{ description?: string }>;
    message?: string;
    status?: number;
}

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const body = await req.json() as CreditsPreferenceBody;
        const { amount, payerFirstName, payerLastName } = body;

        if (!amount) {
            return NextResponse.json({ error: 'Dados obrigatÃ³rios ausentes.' }, { status: 400 });
        }

        if (amount < 0.01) {
            return NextResponse.json({ error: 'Valor minimo para deposito e R$ 0,01.' }, { status: 400 });
        }

        const userId = auth.user.id;
        const email = auth.user.email || 'guest@tcghub.com.br';

        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
        let baseUrl = `${protocol}://${host}`;
        if (baseUrl.includes('null')) baseUrl = 'http://localhost:3000';

        if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
            baseUrl = 'https://tcg-hub.tonicoimbra.com';
        }

        const preferenceRequest = {
            body: {
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [],
                    installments: 12,
                },
                items: [{
                    id: 'creditos-tcg-hub',
                    title: 'DepÃ³sito de CrÃ©ditos TCG Hub',
                    quantity: 1,
                    unit_price: Number(amount),
                    currency_id: 'BRL',
                }],
                payer: {
                    email,
                    name: payerFirstName || 'Cliente',
                    surname: payerLastName || 'Site',
                },
                back_urls: {
                    success: `${baseUrl}/minha-conta/creditos?status=success`,
                    pending: `${baseUrl}/minha-conta/creditos?status=pending`,
                    failure: `${baseUrl}/minha-conta/creditos?status=failure`,
                },
                auto_return: 'approved',
                statement_descriptor: 'TCG HUB CREDITOS',
                external_reference: userId,
                metadata: {
                    user_id: userId,
                    type: 'deposit_credits',
                },
            },
        };

        const result = await preference.create(preferenceRequest);

        return NextResponse.json({ id: result.id, init_point: result.init_point });
    } catch (error: unknown) {
        const mpError = error as MercadoPagoRouteError;
        console.error('Mercado Pago Preference Error for Credits:', mpError);
        const detail = mpError.cause?.[0]?.description || mpError.apiResponse?.body?.message || mpError.message || 'Erro ao gerar Checkout do Mercado Pago';
        return NextResponse.json({ error: detail }, { status: mpError.status || 500 });
    }
}
