import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { purchaseId, paymentId } = await req.json();

        if (!purchaseId || !paymentId) {
            return NextResponse.json({ error: 'Dados insuficientes para o reembolso.' }, { status: 400 });
        }

        // 1. Verify admin permissions
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Não autorizado. Token ausente.' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado. Sessão inválida.' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        // If is_admin doesn't exist yet, we check user role and emails
        if (!profile?.is_admin) {
            const allowedEmails = ['contato@tcgmegastore.com.br', 'admin@tcghub.com.br'];
            const userEmail = user.email || '';

            if (user.user_metadata?.role !== 'admin' && !allowedEmails.includes(userEmail)) {
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

        // 3. Get purchase items to restore inventory
        const { data: purchaseData, error: fetchError } = await supabaseAdmin
            .from('purchases')
            .select('items')
            .eq('id', purchaseId)
            .single();

        // 4. Update Purchase status in Supabase
        const { error: updateError } = await supabaseAdmin
            .from('purchases')
            .update({
                status: 'canceled', // Changed from refunded to canceled per user request
                updated_at: new Date().toISOString()
            })
            .eq('id', purchaseId);

        // 5. Restore inventory if successful
        if (!updateError && purchaseData?.items) {
            for (const item of purchaseData.items) {
                if (item.id && !item.is_auction) {
                    await supabaseAdmin.rpc('restore_inventory', {
                        p_item_id: item.id,
                        p_quantity: item.quantity || 1
                    });
                }
            }
        }

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
