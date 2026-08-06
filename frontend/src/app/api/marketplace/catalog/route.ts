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
    const languages = url.searchParams.getAll('language').filter(Boolean).slice(0, 20);
    const conditions = url.searchParams.getAll('condition').filter(Boolean).slice(0, 20);
    const grades = url.searchParams.getAll('grade').filter(Boolean).slice(0, 20);
    const finishes = url.searchParams.getAll('finish').filter(Boolean).slice(0, 20);
    const minPrice = Math.max(Number(url.searchParams.get('minPrice')) || 0, 0);
    const maxPrice = Math.max(Number(url.searchParams.get('maxPrice')) || 0, 0);
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
        query = query.in('rarity', values ? rarities : []);
    }
    if (languages.length > 0) query = query.in('language', languages);
    if (conditions.length > 0) query = query.in('condition', conditions);
    if (grades.length > 0) query = query.in('grading_score', grades.map(Number));
    if (finishes.length > 0) query = query.in('finish', finishes);
    if (minPrice > 0) query = query.gte('price', minPrice);
    if (maxPrice > 0) query = query.lte('price', maxPrice);
    if (url.searchParams.get('available') === '1') query = query.gt('quantity', 0);

    if (sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (sort === 'newest') query = query.order('id', { ascending: false });
    else query = query.order('price', { ascending: false });

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
        console.error('Falha ao carregar catalogo:', error.message);
        return NextResponse.json({ error: 'Nao foi possivel carregar o catalogo.' }, { status: 500 });
    }

    let facets: { sets: string[]; rarities: string[]; languages: string[]; conditions: string[]; grades: string[]; finishes: string[] } | undefined;
    if (url.searchParams.get('facets') === '1') {
        const { data: facetRows, error: facetError } = await supabaseAdmin
            .from('enriched_inventory')
            .select('official_set_name,set,rarity,language,condition,grading_score,finish');

        if (!facetError) {
            facets = {
                sets: Array.from(new Set((facetRows || []).map((card) => card.official_set_name || card.set).filter(Boolean))).sort(),
                rarities: Array.from(new Set((facetRows || []).map((card) => card.rarity).filter(Boolean))).sort(),
                languages: Array.from(new Set((facetRows || []).map((card) => card.language).filter(Boolean))).sort(),
                conditions: Array.from(new Set((facetRows || []).map((card) => card.condition).filter(Boolean))).sort(),
                grades: Array.from(new Set((facetRows || []).map((card) => card.grading_score).filter((value) => value != null).map(String))).sort((a, b) => Number(b) - Number(a)),
                finishes: Array.from(new Set((facetRows || []).map((card) => card.finish).filter(Boolean))).sort(),
            } as { sets: string[]; rarities: string[]; languages: string[]; conditions: string[]; grades: string[]; finishes: string[] };
        }
    }

    return NextResponse.json({ cards: data || [], total: count || 0, facets });
}
