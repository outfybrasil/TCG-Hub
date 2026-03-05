import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE /api/pagamento/cartao/deletar
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID não fornecido.' }, { status: 400 });
        }

        // Technically, we could also unbind the card in Mercado Pago.
        // For now, we are just removing the convenience reference from our database.

        const { error } = await supabaseAdmin.from('saved_cards').delete().eq('id', id);

        if (error) {
            throw new Error(error.message);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Erro ao deletar cartão:', error);
        return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
    }
}
