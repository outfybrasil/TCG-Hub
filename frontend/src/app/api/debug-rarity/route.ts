import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Rota TEMPORÁRIA de diagnóstico — sem autenticação
// Remova este arquivo após resolver o problema de raridades
export async function GET(request: Request) {
    const url = new URL(request.url);
    const setId = url.searchParams.get('setId') || 'me03';

    const { data, error } = await supabaseAdmin
        .from('pokemon_cards')
        .select('id, rarity, types')
        .eq('set_id', setId)
        .order('id');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rarityCounts: Record<string, number> = {};
    data?.forEach(c => {
        const key = c.rarity ?? 'NULL';
        rarityCounts[key] = (rarityCounts[key] || 0) + 1;
    });

    const sample = data?.slice(0, 10).map(c => ({
        id: c.id,
        rarity: c.rarity,
        types: c.types
    }));

    return NextResponse.json({ setId, total: data?.length, rarityCounts, sample });
}
