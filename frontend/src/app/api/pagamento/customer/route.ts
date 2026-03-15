import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/lib/server-auth';

// POST /api/pagamento/customer
// Creates or retrieves a Mercado Pago customer linked to the authenticated user
export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const email = auth.user.email;

        if (!email) {
            return NextResponse.json({ error: 'UsuÃ¡rio nÃ£o identificado.' }, { status: 400 });
        }

        const mpUrl = `https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email)}`;
        const mpCustomerRes = await fetch(mpUrl, {
            headers: {
                Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
            },
        });

        const mpCustomerData = await mpCustomerRes.json();
        let customerId: string | undefined;

        if (mpCustomerData.results && mpCustomerData.results.length > 0) {
            customerId = mpCustomerData.results[0].id;
        } else {
            const createRes = await fetch('https://api.mercadopago.com/v1/customers', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            const createData = await createRes.json();
            if (!createRes.ok) {
                throw new Error(createData.message || 'Erro ao criar Customer no Mercado Pago');
            }

            customerId = createData.id;
        }

        return NextResponse.json({ customerId });
    } catch (error: unknown) {
        console.error('Erro na rota de Customer MP:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro interno.' },
            { status: 500 }
        );
    }
}
