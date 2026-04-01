import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const PLATFORM_FEE_PCT = 8.0;
const MAX_LISTINGS_PER_HOUR = 10;
const MIN_PRICE = 0.5;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function GET(req: Request) {
    const url = new URL(req.url);
    const cardId = url.searchParams.get('card_id');
    const cardName = url.searchParams.get('card_name');
    const sellerId = url.searchParams.get('seller_id');
    const status = url.searchParams.get('status') || 'active';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabaseAdmin
        .from('seller_listings')
        .select(`
            *,
            seller_profiles (
                display_name,
                rating_avg,
                rating_count,
                total_sales,
                is_verified,
                ships_from_state
            )
        `)
        .order('price', { ascending: true })
        .range(offset, offset + limit - 1);

    if (status !== 'all') {
        query = query.eq('status', status);
    }

    if (cardId) query = query.eq('card_id', cardId);
    if (cardName) query = query.ilike('card_name', `%${cardName}%`);
    if (sellerId) query = query.eq('seller_id', sellerId);

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listings: data });
}

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) return auth.response;

    const userId = auth.user.id;
    const userEmail = auth.user.email || '';
    const userMetaName = auth.user.user_metadata?.full_name || auth.user.user_metadata?.name || '';
    const defaultDisplayName = userMetaName || (userEmail ? userEmail.split('@')[0] : `Vendedor_${userId.substring(0, 5)}`);

    // Rate limiting: max 10 listagens por hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
        .from('seller_listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .gte('created_at', oneHourAgo);

    if ((count ?? 0) >= MAX_LISTINGS_PER_HOUR) {
        return NextResponse.json(
            { error: `Limite de ${MAX_LISTINGS_PER_HOUR} listagens por hora atingido.` },
            { status: 429 }
        );
    }

    const body = await req.json();
    const {
        card_id,
        card_name,
        card_set,
        card_number,
        image_url,
        condition,
        language,
        finish,
        grade,
        price,
        quantity,
        ships_from_state,
        free_shipping,
        notes,
    } = body;

    // Validação server-side dos campos obrigatórios
    if (!card_name || !card_set || !condition || !language || !price || !quantity) {
        return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    // Validação de preço mínimo (nunca confiar no cliente)
    const validatedPrice = Number(price);
    const validatedQuantity = parseInt(String(quantity));

    if (isNaN(validatedPrice) || validatedPrice < MIN_PRICE) {
        return NextResponse.json({ error: `Preço mínimo é R$ ${MIN_PRICE.toFixed(2)}.` }, { status: 400 });
    }

    if (isNaN(validatedQuantity) || validatedQuantity < 1) {
        return NextResponse.json({ error: 'Quantidade mínima é 1.' }, { status: 400 });
    }

    // Anti-fraude: preço suspeitosamente baixo vs. mercado → criamos a listing mas marcamos para revisão
    // (implementação futura: integrar com API de preços)

    // Criar perfil de vendedor se não existe ANTES da listagem (Foreign Key match)
    await supabaseAdmin
        .from('seller_profiles')
        .upsert({ 
            user_id: userId, 
            display_name: defaultDisplayName 
        }, { onConflict: 'user_id', ignoreDuplicates: true });

    const { data, error } = await supabaseAdmin
        .from('seller_listings')
        .insert({
            seller_id: userId,
            card_id: card_id || null,
            card_name: String(card_name).trim(),
            card_set: String(card_set).trim(),
            card_number: card_number ? String(card_number).trim() : null,
            image_url: image_url || null,
            condition: String(condition),
            language: String(language),
            finish: String(finish || 'Normal'),
            grade: grade || null,
            price: validatedPrice,
            quantity: validatedQuantity,
            ships_from_state: ships_from_state || null,
            free_shipping: Boolean(free_shipping),
            notes: notes ? String(notes).substring(0, 500) : null,
            platform_fee_pct: PLATFORM_FEE_PCT,
            status: 'active',
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listing: data }, { status: 201 });
}
