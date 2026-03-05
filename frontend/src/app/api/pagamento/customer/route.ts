import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/pagamento/customer
// Creates or retrieves a Mercado Pago customer linked to the Supabase user
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, email } = body;

        if (!userId || !email) {
            return NextResponse.json({ error: 'Usuário não identificado.' }, { status: 400 });
        }

        // 1. Ver se já temos o customer salvo em profiles (adicionar coluna ou table aux)
        // Wait, since we don't have mp_customer_id in profiles, we can search by email in MP API.

        const mpUrl = `https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email)}`;
        let mpCustomerRes = await fetch(mpUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
            }
        });

        let mpCustomerData = await mpCustomerRes.json();
        let customerId;

        if (mpCustomerData.results && mpCustomerData.results.length > 0) {
            customerId = mpCustomerData.results[0].id;
        } else {
            // Create a new customer
            const createRes = await fetch('https://api.mercadopago.com/v1/customers', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            const createData = await createRes.json();
            if (!createRes.ok) throw new Error(createData.message || 'Erro ao criar Customer no Mercado Pago');
            customerId = createData.id;
        }

        return NextResponse.json({ customerId });

    } catch (error: any) {
        console.error('Erro na rota de Customer MP:', error);
        return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
    }
}
