import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';

// POST /api/leilao/notificacoes
export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) return auth.response;

    try {
        const body = await req.json();
        const email = auth.user.email;

        if (!email) {
            return NextResponse.json({ error: 'E-mail é obrigatório para notificações.' }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('auction_subscribers').insert({
            email,
            user_id: auth.user.id
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
