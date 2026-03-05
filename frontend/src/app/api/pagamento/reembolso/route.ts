import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { purchaseId, paymentId } = await req.json();

        if (!purchaseId || !paymentId) {
            return NextResponse.json({ error: 'Dados insuficientes para o reembolso.' }, { status: 400 });
        }

        // 1. Verify admin permissions
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        // If is_admin doesn't exist yet, we might need to check user_metadata or similar
        // For now, let's assume is_admin is the way.
        if (!profile?.is_admin) {
            // Check user metadata as fallback if is_admin column isn't fully ready
            if (user.user_metadata?.role !== 'admin' && user.email !== 'contato@tcgmegastore.com.br') {
                return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem reembolsar.' }, { status: 403 });
            }
        }

        // 2. Call Mercado Pago Refund API
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `refund_${purchaseId}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Erro MP Refund:', result);
            return NextResponse.json({
                error: 'Erro no Mercado Pago ao processar reembolso.',
                details: result.message || 'Erro desconhecido'
            }, { status: response.status });
        }

        // 3. Update Purchase status in Supabase
        const { error: updateError } = await supabase
            .from('purchases')
            .update({
                status: 'refunded',
                updated_at: new Date().toISOString()
            })
            .eq('id', purchaseId);

        if (updateError) {
            console.error('Erro ao atualizar status da compra:', updateError);
            // Even if DB update fails, the refund happened at MP.
            return NextResponse.json({
                warning: 'Reembolso processado no MP, mas falha ao atualizar banco de dados.',
                mpResult: result
            }, { status: 200 });
        }

        return NextResponse.json({
            success: true,
            message: 'Reembolso processado com sucesso!',
            result
        });

    } catch (error) {
        console.error('Reembolso Error:', error);
        return NextResponse.json({ error: 'Ocorreu um erro interno no servidor.' }, { status: 500 });
    }
}
