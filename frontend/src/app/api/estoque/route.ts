import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/estoque?ids[]=uuid1&ids[]=uuid2
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ids = searchParams.getAll('ids[]');

        if (!ids || ids.length === 0) {
            return NextResponse.json({ error: 'IDs de produto são obrigatórios' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('inventory')
            .select('id, quantity')
            .in('id', ids);

        if (error) throw error;

        // Return map of id -> available quantity
        const stockMap: Record<string, number> = {};
        for (const item of (data || [])) {
            stockMap[item.id] = item.quantity;
        }

        return NextResponse.json(stockMap);
    } catch (error: any) {
        console.error('Erro API estoque:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
