import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;

function safeSearchTerm(value: string) {
    return value.trim().replace(/[,().%]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
}

function quotePostgrestValues(values: string[]) {
    return values.map((value) => `"${value.replace(/["\\]/g, '')}"`).join(',');
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const offset = Math.max(Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') || `${DEFAULT_PAGE_SIZE}`, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const search = safeSearchTerm(url.searchParams.get('q') || '');
    const sets = url.searchParams.getAll('set').filter(Boolean).slice(0, 20);
    const rarities = url.searchParams.getAll('rarity').filter(Boolean).slice(0, 20);
    const setCode = url.searchParams.get('setCode')?.trim().toLowerCase() || '';
    const sort = url.searchParams.get('sort') || 'price_desc';

    let query = supabaseAdmin
        .from('enriched_inventory')
        .select('*', { count: 'exact' });

    if (search) {
        const pattern = `*${search}*`;
        query = query.or(`name.ilike.${pattern},official_name.ilike.${pattern},set.ilike.${pattern},official_set_name.ilike.${pattern},number.ilike.${pattern},local_id.ilike.${pattern}`);
    }

    if (setCode) query = query.in('set', setCode.split(',').map((value) => value.trim()).filter(Boolean));
    if (sets.length > 0) {
        const values = quotePostgrestValues(sets);
        query = query.or(`official_set_name.in.(${values}),set.in.(${values})`);
    }
    if (rarities.length > 0) {
        const values = quotePostgrestValues(rarities);
        query = query.or(`rarity.in.(${values}),finish.in.(${values})`);
    }

    if (sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (sort === 'newest') query = query.order('id', { ascending: false });
    else query = query.order('price', { ascending: false });

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
        console.error('Falha ao carregar catalogo:', error.message);
        return NextResponse.json({ error: 'Nao foi possivel carregar o catalogo.' }, { status: 500 });
    }

    let facets: { sets: string[]; rarities: string[] } | undefined;
    if (url.searchParams.get('facets') === '1') {
        const { data: facetRows, error: facetError } = await supabaseAdmin
            .from('enriched_inventory')
            .select('official_set_name,set,rarity,finish');

        if (!facetError) {
            facets = {
                sets: Array.from(new Set((facetRows || []).map((card) => card.official_set_name || card.set).filter(Boolean))).sort(),
                rarities: Array.from(new Set((facetRows || []).map((card) => card.rarity || card.finish).filter(Boolean))).sort(),
            } as { sets: string[]; rarities: string[] };
        }
    }

    return NextResponse.json({ cards: data || [], total: count || 0, facets });
}
