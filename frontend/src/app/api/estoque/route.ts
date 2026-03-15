import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';

// GET /api/estoque?ids[]=uuid1&ids[]=uuid2
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ids = searchParams.getAll('ids[]');

        if (!ids || ids.length === 0 || ids.length > 100) {
            return NextResponse.json({ error: 'IDs de produto sÃ£o obrigatÃ³rios' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('inventory')
            .select('id, quantity')
            .in('id', ids);

        if (error) throw error;

        const stockMap: Record<string, number> = {};
        for (const item of (data || [])) {
            stockMap[item.id] = item.quantity;
        }

        return NextResponse.json(stockMap);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Erro API estoque:', error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
