import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/pagamento/cartao/salvar
// Takes a frontend MP card token, saves it to the MP Customer, and stores reference in Supabase
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, customerId, userId, cardHolderName } = body;

        if (!token || !customerId || !userId) {
            return NextResponse.json({ error: 'Dados incompletos para salvar cartão.' }, { status: 400 });
        }

        // Attach Card Token to MP Customer
        const mpRes = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const cardData = await mpRes.json();
        if (!mpRes.ok) {
            throw new Error(cardData.message || 'Erro ao atrelar cartão ao Customer Mercado Pago.');
        }

        // The card is now permanently saved in Mercado Pago.
        // We save only the harmless reference in our database.
        const { error: dbError } = await supabaseAdmin.from('saved_cards').insert({
            user_id: userId,
            mp_customer_id: customerId,
            mp_card_id: cardData.id,
            last_four_digits: cardData.last_four_digits,
            card_brand: cardData.payment_method.id,
            expiration_month: cardData.expiration_month.toString(),
            expiration_year: cardData.expiration_year.toString(),
            is_default: false
        });

        if (dbError) {
            throw new Error('Cartão salvo no MP, mas erro ao salvar referência no banco: ' + dbError.message);
        }

        return NextResponse.json({ success: true, cardId: cardData.id });

    } catch (error: any) {
        console.error('Erro na rota de Salvar Cartão:', error);
        return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
    }
}
