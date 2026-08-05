import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assessListingPrice } from '@/lib/tcg-hub-price-index';
import { getTcgHubReference } from '@/lib/tcg-hub-price-server';

export const dynamic = 'force-dynamic';

const PLATFORM_FEE_PCT = 8.0;
const MAX_LISTINGS_PER_HOUR = 10;
const MIN_PRICE = 0.5;

export async function GET(req: Request) {
    const url = new URL(req.url);
    const cardId = url.searchParams.get('card_id');
    const cardName = url.searchParams.get('card_name');
    const sellerId = url.searchParams.get('seller_id');
    const status = url.searchParams.get('status') || 'active';
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50') || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0') || 0, 0);

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

    if (isNaN(validatedQuantity) || validatedQuantity < 1 || validatedQuantity > 1000) {
        return NextResponse.json({ error: 'Quantidade mínima é 1.' }, { status: 400 });
    }

    const reference = await getTcgHubReference({
        cardId: card_id || null,
        cardName: String(card_name).trim(),
        cardNumber: card_number ? String(card_number).trim() : null,
        condition: String(condition),
        finish: String(finish || 'Normal'),
        language: String(language),
    });
    const priceRisk = assessListingPrice(validatedPrice, reference);

    // Criar perfil de vendedor se não existe ANTES da listagem (Foreign Key match)
    await supabaseAdmin
        .from('seller_profiles')
        .upsert({ 
            user_id: userId, 
            display_name: defaultDisplayName 
        }, { onConflict: 'user_id', ignoreDuplicates: true });

    const listingPayload = {
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
        price_risk_level: priceRisk.level,
        price_risk_reason: priceRisk.reason,
        reference_price: reference.price,
        index_eligible: priceRisk.level === 'normal',
        risk_assessed_at: new Date().toISOString(),
        moderation_status: priceRisk.level === 'normal' ? 'clear' : 'pending',
    };

    let { data, error } = await supabaseAdmin
        .from('seller_listings')
        .insert(listingPayload)
        .select()
        .single();

    if (error?.code === 'PGRST204' || error?.message?.includes('price_risk_level')) {
        const {
            price_risk_level: _riskLevel,
            price_risk_reason: _riskReason,
            reference_price: _referencePrice,
            index_eligible: _indexEligible,
            risk_assessed_at: _riskAssessedAt,
            ...legacyPayload
        } = listingPayload;
        const fallback = await supabaseAdmin.from('seller_listings').insert(legacyPayload).select().single();
        data = fallback.data;
        error = fallback.error;
    }

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listing: data, priceAnalysis: { reference, ...priceRisk } }, { status: 201 });
}
