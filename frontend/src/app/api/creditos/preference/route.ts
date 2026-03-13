import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const preference = new Preference(client);

interface CreditsPreferenceBody {
    amount?: number;
    payerEmail?: string;
    payerFirstName?: string;
    payerLastName?: string;
    userId?: string;
}

interface MercadoPagoRouteError {
    apiResponse?: { body?: { message?: string } };
    cause?: Array<{ description?: string }>;
    message?: string;
    status?: number;
}

export async function POST(req: Request) {
    try {
        const body = await req.json() as CreditsPreferenceBody;
        const { amount, userId, payerEmail, payerFirstName, payerLastName } = body;

        if (!amount || !userId) {
            return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 });
        }

        if (amount < 0.01) {
            return NextResponse.json({ error: 'Valor minimo para deposito e R$ 0,01.' }, { status: 400 });
        }

        let email = payerEmail;
        if (!email) {
            email = 'guest@tcghub.com.br';
        }

        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
        let BASE_URL = `${protocol}://${host}`;
        if (BASE_URL.includes('null')) BASE_URL = 'http://localhost:3000';

        // Workaround: Mercado Pago's back_urls validation fails with http://localhost URLs
        // Since we are using redirectMode: 'modal', the actual redirect does not happen,
        // so we can safely use the production URL purely to pass validation when testing locally.
        if (BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1')) {
            BASE_URL = 'https://tcg-hub.tonicoimbra.com';
        }


        const mpItems = [{
            id: 'creditos-tcg-hub',
            title: 'Depósito de Créditos TCG Hub',
            quantity: 1,
            unit_price: Number(amount),
            currency_id: 'BRL',
        }];

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
                    name: payerFirstName || 'Cliente',
                    surname: payerLastName || 'Site',
                },
                back_urls: {
                    success: `${BASE_URL}/minha-conta/creditos?status=success`,
                    pending: `${BASE_URL}/minha-conta/creditos?status=pending`,
                    failure: `${BASE_URL}/minha-conta/creditos?status=failure`
                },
                auto_return: 'approved',
                statement_descriptor: 'TCG HUB CREDITOS',
                external_reference: userId, // CRITICAL: The MP webhook reads this exact field to credit the user
                metadata: {
                    user_id: userId,
                    type: 'deposit_credits'
                }
            }
        };

        console.log('Creating Preference with Mercado Pago for Credits:', JSON.stringify(preferenceRequest.body, null, 2));

        const result = await preference.create(preferenceRequest);

        return NextResponse.json({ id: result.id, init_point: result.init_point });

    } catch (error: unknown) {
        const mpError = error as MercadoPagoRouteError;
        console.error('Mercado Pago Preference Error for Credits:', mpError);
        const detail = mpError.cause?.[0]?.description || mpError.apiResponse?.body?.message || mpError.message || 'Erro ao gerar Checkout do Mercado Pago';
        return NextResponse.json({ error: detail }, { status: mpError.status || 500 });
    }
}
