import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/leilao/notificacoes
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, userId } = body;

        if (!email) {
            return NextResponse.json({ error: 'E-mail é obrigatório para notificações.' }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('auction_subscribers').insert({
            email,
            user_id: userId || null
        });

        if (error) {
            // If unique violation
            if (error.code === '23505') {
                return NextResponse.json({ success: true, message: 'Já está inscrito!' });
            }
            throw new Error(error.message);
        }

        return NextResponse.json({ success: true, message: 'Notificações ativadas com sucesso!' });

    } catch (error: any) {
        console.error('Erro na rota de Notificações de Leilão:', error);
        return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
    }
}
