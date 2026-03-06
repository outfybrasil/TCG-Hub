import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Parse Brazilian price string like "R$ 14,99" to number 14.99
function parseBRL(text: string): number | null {
    const match = text.replace(/\s/g, '').match(/R?\$?\s*(\d+[\.,]\d+)/);
    if (!match) return null;
    return parseFloat(match[1].replace('.', '').replace(',', '.'));
}

async function scrapeLigaPokemon(cardName: string, cardCode?: string): Promise<{ min: number | null; max: number | null; avg: number | null }> {
    const searchQuery = cardCode || cardName;
    const url = `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(searchQuery)}`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) return { min: null, max: null, avg: null };

        const html = await res.text();

        // Extract min price from .avgp-minprc
        const minMatch = html.match(/class="avgp-minprc"[^>]*>([^<]+)/);
        const maxMatch = html.match(/class="avgp-maxprc"[^>]*>([^<]+)/);

        const min = minMatch ? parseBRL(minMatch[1]) : null;
        const max = maxMatch ? parseBRL(maxMatch[1]) : null;
        const avg = (min !== null && max !== null) ? +((min + max) / 2).toFixed(2) : null;

        return { min, max, avg };
    } catch (e) {
        console.error('Liga Pokemon scrape error:', e);
        return { min: null, max: null, avg: null };
    }
}

async function scrapeMYPCards(cardName: string, cardCode?: string): Promise<number | null> {
    const searchQuery = cardCode || cardName;
    const url = `https://mypcards.com/pokemon/busca?q=${encodeURIComponent(searchQuery)}`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) return null;

        const html = await res.text();

        // Try to extract any price pattern
        const priceMatches = html.matchAll(/R\$\s*(\d+[,\.]\d{2})/g);
        let lowestPrice = Infinity;

        for (const match of priceMatches) {
            const price = parseFloat(match[1].replace('.', '').replace(',', '.'));
            if (price > 0 && price < lowestPrice) {
                lowestPrice = price;
            }
        }

        return lowestPrice !== Infinity ? lowestPrice : null;
    } catch (e) {
        console.error('MYP Cards scrape error:', e);
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cardId, cardName, cardCode } = body;

        if (!cardId || (!cardName && !cardCode)) {
            return NextResponse.json({ error: 'cardId e cardName ou cardCode são obrigatórios' }, { status: 400 });
        }

        // Scrape Brazilian sites concurrently
        const [liga, mypPrice] = await Promise.all([
            scrapeLigaPokemon(cardName, cardCode),
            scrapeMYPCards(cardName, cardCode),
        ]);

        const scrapedPrices: { store: string; price: number }[] = [];

        if (liga.min !== null) {
            scrapedPrices.push({ store: 'Liga Pokémon', price: liga.min });
        }
        if (mypPrice !== null) {
            scrapedPrices.push({ store: 'MYP Cards', price: mypPrice });
        }

        if (scrapedPrices.length === 0) {
            // Fallback: try pokemontcg.io for international reference
            const POKEMONTCG_API = 'https://api.pokemontcg.io/v2/cards';
            const queryParts: string[] = [];
            if (cardName) queryParts.push(`name:"${cardName}"`);
            if (cardCode) queryParts.push(`number:"${cardCode.split('/')[0]}"`);

            const q = queryParts.join(' ');
            const apiUrl = `${POKEMONTCG_API}?q=${encodeURIComponent(q)}&pageSize=1&select=id,name,tcgplayer,cardmarket`;

            try {
                const apiRes = await fetch(apiUrl, {
                    headers: { 'X-Api-Key': process.env.POKEMONTCG_API_KEY || '' },
                });

                if (apiRes.ok) {
                    const apiData = await apiRes.json();
                    const card = apiData.data?.[0];
                    if (card) {
                        const tcgp = card.tcgplayer?.prices?.holofoil || card.tcgplayer?.prices?.normal || {};
                        const cm = card.cardmarket?.prices || {};
                        if (tcgp.market) scrapedPrices.push({ store: 'TCGPlayer (USD→BRL)', price: +(tcgp.market * 5.50).toFixed(2) });
                        if (cm.averageSellPrice) scrapedPrices.push({ store: 'Cardmarket (EUR→BRL)', price: +(cm.averageSellPrice * 6.00).toFixed(2) });
                    }
                }
            } catch (_) { /* silently fail fallback */ }
        }

        if (scrapedPrices.length === 0) {
            return NextResponse.json({
                error: 'Nenhum preço encontrado nos sites brasileiros. Tente buscar manualmente.',
                manualLinks: {
                    liga: `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(cardCode || cardName)}`,
                    myp: `https://mypcards.com/pokemon/busca?q=${encodeURIComponent(cardCode || cardName)}`,
                }
            }, { status: 404 });
        }

        // Insert into price_history for the chart
        const insertData = scrapedPrices.map(p => ({
            card_id: cardId,
            store_name: p.store,
            price: p.price
        }));

        const { error } = await supabaseAdmin.from('price_history').insert(insertData);
        if (error) throw error;

        return NextResponse.json({ success: true, inserted: insertData });

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}
