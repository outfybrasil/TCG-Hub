import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const POKEMONTCG_API = 'https://api.pokemontcg.io/v2/cards';
const CACHE_HOURS = 24;

// Approx exchange rates (updated periodically)
const USD_TO_BRL = 5.50;
const EUR_TO_BRL = 6.00;

function buildSearchKey(name: string, set?: string, number?: string): string {
    return [name, set, number].filter(Boolean).join('|').toLowerCase().trim();
}

export async function POST(request: Request) {
    try {
        const { cardName, cardSet, cardNumber } = await request.json();

        if (!cardName) {
            return NextResponse.json({ error: 'cardName is required' }, { status: 400 });
        }

        const searchKey = buildSearchKey(cardName, cardSet, cardNumber);

        // 1. Check cache first
        const cacheExpiry = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();
        const { data: cached } = await supabaseAdmin
            .from('card_prices')
            .select('*')
            .eq('search_key', searchKey)
            .gte('fetched_at', cacheExpiry)
            .single();

        if (cached) {
            return NextResponse.json({
                source: 'cache',
                prices: formatPriceResponse(cached),
            });
        }

        // 2. Query pokemontcg.io API
        const queryParts: string[] = [];
        if (cardName) queryParts.push(`name:"${cardName}"`);
        if (cardSet) queryParts.push(`set.name:"${cardSet}"`);
        if (cardNumber) queryParts.push(`number:"${cardNumber.split('/')[0]}"`);

        const q = queryParts.join(' ');
        const url = `${POKEMONTCG_API}?q=${encodeURIComponent(q)}&pageSize=5&select=id,name,set,tcgplayer,cardmarket`;

        const apiRes = await fetch(url, {
            headers: { 'X-Api-Key': process.env.POKEMONTCG_API_KEY || '' },
            next: { revalidate: 3600 },
        });

        if (!apiRes.ok) {
            console.error('pokemontcg.io error:', apiRes.status, await apiRes.text());
            return NextResponse.json({
                source: 'fallback',
                prices: getFallbackPrices(cardName, cardSet),
            });
        }

        const apiData = await apiRes.json();
        const cards = apiData.data || [];

        if (cards.length === 0) {
            return NextResponse.json({
                source: 'not_found',
                prices: getFallbackPrices(cardName, cardSet),
            });
        }

        // Pick best match (first result is usually most relevant)
        const card = cards[0];
        const tcgplayer = card.tcgplayer?.prices?.holofoil || card.tcgplayer?.prices?.normal || card.tcgplayer?.prices?.reverseHolofoil || {};
        const cardmarket = card.cardmarket?.prices || {};

        const priceRow = {
            card_name: cardName,
            card_set: cardSet || null,
            card_number: cardNumber || null,
            search_key: searchKey,
            tcgplayer_low: tcgplayer.low || null,
            tcgplayer_mid: tcgplayer.mid || null,
            tcgplayer_high: tcgplayer.high || null,
            tcgplayer_market: tcgplayer.market || null,
            tcgplayer_url: card.tcgplayer?.url || null,
            cardmarket_avg: cardmarket.averageSellPrice || null,
            cardmarket_low: cardmarket.lowPrice || null,
            cardmarket_trend: cardmarket.trendPrice || null,
            cardmarket_url: card.cardmarket?.url || null,
            currency_usd_to_brl: USD_TO_BRL,
            currency_eur_to_brl: EUR_TO_BRL,
            fetched_at: new Date().toISOString(),
        };

        // 3. Upsert cache
        await supabaseAdmin
            .from('card_prices')
            .upsert(priceRow, { onConflict: 'search_key' });

        return NextResponse.json({
            source: 'api',
            prices: formatPriceResponse(priceRow),
        });

    } catch (error) {
        console.error('Price search error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function formatPriceResponse(row: any) {
    return {
        tcgplayer: {
            low: row.tcgplayer_low,
            mid: row.tcgplayer_mid,
            high: row.tcgplayer_high,
            market: row.tcgplayer_market,
            url: row.tcgplayer_url,
            currency: 'USD',
            brl: {
                low: row.tcgplayer_low ? +(row.tcgplayer_low * (row.currency_usd_to_brl || USD_TO_BRL)).toFixed(2) : null,
                mid: row.tcgplayer_mid ? +(row.tcgplayer_mid * (row.currency_usd_to_brl || USD_TO_BRL)).toFixed(2) : null,
                high: row.tcgplayer_high ? +(row.tcgplayer_high * (row.currency_usd_to_brl || USD_TO_BRL)).toFixed(2) : null,
                market: row.tcgplayer_market ? +(row.tcgplayer_market * (row.currency_usd_to_brl || USD_TO_BRL)).toFixed(2) : null,
            },
        },
        cardmarket: {
            avg: row.cardmarket_avg,
            low: row.cardmarket_low,
            trend: row.cardmarket_trend,
            url: row.cardmarket_url,
            currency: 'EUR',
            brl: {
                avg: row.cardmarket_avg ? +(row.cardmarket_avg * (row.currency_eur_to_brl || EUR_TO_BRL)).toFixed(2) : null,
                low: row.cardmarket_low ? +(row.cardmarket_low * (row.currency_eur_to_brl || EUR_TO_BRL)).toFixed(2) : null,
                trend: row.cardmarket_trend ? +(row.cardmarket_trend * (row.currency_eur_to_brl || EUR_TO_BRL)).toFixed(2) : null,
            },
        },
        manualLinks: {
            ligaPokemon: `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(row.card_number || row.card_name)}`,
            mypCards: `https://mypcards.com/pokemon/busca?q=${encodeURIComponent(row.card_number || row.card_name)}`,
        },
        fetchedAt: row.fetched_at,
    };
}

function getFallbackPrices(name: string, set?: string) {
    return {
        tcgplayer: { low: null, mid: null, high: null, market: null, url: null, currency: 'USD', brl: { low: null, mid: null, high: null, market: null } },
        cardmarket: { avg: null, low: null, trend: null, url: null, currency: 'EUR', brl: { avg: null, low: null, trend: null } },
        manualLinks: {
            ligaPokemon: `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(name)}`,
            mypCards: `https://mypcards.com/pokemon/busca?q=${encodeURIComponent(name)}`,
        },
        fetchedAt: null,
    };
}
