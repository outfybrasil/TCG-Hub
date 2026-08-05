import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { calculateTcgHubPriceIndex, type PriceObservation } from '@/lib/tcg-hub-price-index';
import { getTcgHubReference } from '@/lib/tcg-hub-price-server';

export const dynamic = 'force-dynamic';

type SaleRow = {
    unit_price: number;
    updated_at: string;
    status: string;
    seller_listings: {
        card_id?: string | null;
        condition?: string | null;
        finish?: string | null;
        language?: string | null;
    } | Array<{
        card_id?: string | null;
        condition?: string | null;
        finish?: string | null;
        language?: string | null;
    }> | null;
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const cardId = url.searchParams.get('cardId')?.trim().slice(0, 120);
    if (!cardId) return NextResponse.json({ error: 'cardId is required' }, { status: 400 });

    const clientAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = checkRateLimit(`public-price-index:${clientAddress}`, 60, 10 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

    const { data: card, error: cardError } = await supabaseAdmin
        .from('pokemon_cards')
        .select('id, name, local_id, set_name')
        .eq('id', cardId)
        .single();
    if (cardError || !card) return NextResponse.json({ error: 'Carta não encontrada.' }, { status: 404 });

    const condition = cleanFilter(url.searchParams.get('condition'));
    const finish = cleanFilter(url.searchParams.get('finish'));
    const language = cleanFilter(url.searchParams.get('language'));

    const [{ data: saleData, error: salesError }, { data: snapshots }] = await Promise.all([
        supabaseAdmin
            .from('seller_orders')
            .select('unit_price, updated_at, status, seller_listings!inner(card_id, condition, finish, language)')
            .eq('seller_listings.card_id', cardId)
            .in('status', ['paid', 'shipped', 'delivered'])
            .order('updated_at', { ascending: false })
            .limit(200),
        supabaseAdmin
            .from('tcg_hub_price_snapshots')
            .select('index_price, fair_low, fair_high, confidence, sample_size, verified_sales, excluded_outliers, calculated_at')
            .eq('card_id', cardId)
            .order('calculated_at', { ascending: true })
            .limit(365),
    ]);

    const sales = salesError ? [] : ((saleData || []) as SaleRow[]).filter((sale) => {
        const relation = Array.isArray(sale.seller_listings) ? sale.seller_listings[0] : sale.seller_listings;
        return matches(relation?.condition, condition)
            && matches(relation?.finish, finish)
            && matches(relation?.language, language);
    });
    const observations: PriceObservation[] = sales.map((sale) => ({
        price: Number(sale.unit_price),
        kind: 'verified_sale',
        source: 'TCG Hub',
        observedAt: sale.updated_at,
    }));
    const current = await getTcgHubReference({
        cardId,
        cardName: card.name,
        cardNumber: card.local_id,
        condition,
        finish,
        language,
    });

    return NextResponse.json({
        card,
        filters: { condition, finish, language },
        current,
        periods: {
            days7: periodIndex(observations, 7),
            days30: periodIndex(observations, 30),
            days90: periodIndex(observations, 90),
        },
        recentSales: sales.slice(0, 12).map((sale) => {
            const relation = Array.isArray(sale.seller_listings) ? sale.seller_listings[0] : sale.seller_listings;
            return {
                price: Number(sale.unit_price),
                soldAt: sale.updated_at,
                condition: relation?.condition || null,
                finish: relation?.finish || null,
                language: relation?.language || null,
                verification: 'Pagamento confirmado pelo TCG Hub',
            };
        }),
        history: (snapshots || []).map((snapshot) => ({
            price: snapshot.index_price === null ? null : Number(snapshot.index_price),
            fairLow: snapshot.fair_low === null ? null : Number(snapshot.fair_low),
            fairHigh: snapshot.fair_high === null ? null : Number(snapshot.fair_high),
            confidence: snapshot.confidence,
            sampleSize: snapshot.sample_size,
            verifiedSales: snapshot.verified_sales,
            excludedOutliers: snapshot.excluded_outliers,
            calculatedAt: snapshot.calculated_at,
        })),
        methodology: {
            version: 'weighted_median_v1',
            summary: 'Mediana ponderada com prioridade para vendas verificadas, redução do peso de dados antigos e remoção de valores anormais por intervalo interquartil.',
            rules: [
                'Venda paga dentro do TCG Hub tem o maior peso.',
                'Anúncios externos são referências secundárias, não vendas confirmadas.',
                'Ofertas suspeitas não influenciam o índice antes de uma venda real.',
                'Condição, acabamento e idioma podem ser filtrados separadamente.',
            ],
        },
        generatedAt: new Date().toISOString(),
    });
}

function periodIndex(observations: PriceObservation[], days: number) {
    const cutoff = Date.now() - days * 86_400_000;
    return calculateTcgHubPriceIndex(observations.filter((item) => {
        const timestamp = item.observedAt ? new Date(item.observedAt).getTime() : 0;
        return timestamp >= cutoff;
    }));
}

function cleanFilter(value: string | null) {
    const cleaned = value?.trim().slice(0, 40);
    return cleaned || null;
}

function normalize(value?: string | null) {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function matches(actual: string | null | undefined, expected: string | null) {
    return !expected || normalize(actual) === normalize(expected);
}
