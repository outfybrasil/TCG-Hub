import { NextResponse } from 'next/server';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { supabaseAdmin } from '@/lib/supabase';

chromium.use(stealth());

// Scrape both MYPCards and Liga Pokemon using Playwright Stealth
async function scrapeCardPrices(cardName: string, cardCode?: string) {
    let debugLogs: string[] = [];
    debugLogs.push('Iniciando scraper...');

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
        ],
    });

    // Randomize user agent slightly to avoid fingerprinting
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    const context = await browser.newContext({
        userAgent: randomUA,
        viewport: { width: 1920, height: 1080 },
    });

    const prices: { store: string; price: number }[] = [];

    try {
        const searchQuery = cardCode ? cardCode : cardName;

        // --- MYP Cards Scraper ---
        try {
            const pageMyp = await context.newPage();
            // Block tracking and resources to speed up
            await pageMyp.route('**/*.{png,jpg,jpeg,gif,webp,css,font,woff,woff2}', route => route.abort());

            await pageMyp.goto(`https://mypcards.com/pokemon/busca?q=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await pageMyp.waitForTimeout(4000);

            const mypHtml = await pageMyp.content();
            const $myp = cheerio.load(mypHtml);

            let lowestMypPrice = Infinity;
            $myp('.price, .preco, [class*="price"]').each((_, el) => {
                const text = $myp(el).text().trim();
                const match = text.match(/R\$\s*(\d+[,.]\d+)/i);
                if (match) {
                    const priceValue = parseFloat(match[1].replace(',', '.'));
                    if (priceValue > 0 && priceValue < lowestMypPrice) {
                        lowestMypPrice = priceValue;
                    }
                }
            });

            if (lowestMypPrice !== Infinity) {
                prices.push({ store: 'MYP Cards', price: lowestMypPrice });
            }
        } catch (e) {
            console.error('Error scraping MYP:', e);
            debugLogs.push('MYP Scrape Error');
        }

        // --- Liga Pokemon Scraper ---
        const pageLiga = await context.newPage();
        await pageLiga.route('**/*.{png,jpg,jpeg,gif,webp,css,font,woff,woff2}', route => route.abort());

        await pageLiga.goto(`https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });

        await pageLiga.waitForTimeout(5000); // Let JS execute / Cloudflare pass

        const ligaHtml = await pageLiga.content();
        const $liga = cheerio.load(ligaHtml);

        let lowestLigaPrice = Infinity;
        // LigaPokemon usually has `.price`, `#min-price`, or similar class for the lowest offering
        $liga('.precos-desktop .preco-menor, .price-min, .prc-min').each((_, el) => {
            const text = $liga(el).text().trim();
            const match = text.match(/R\$\s*(\d+[,.]\d+)/i);
            if (match) {
                const priceValue = parseFloat(match[1].replace(',', '.'));
                if (priceValue > 0 && priceValue < lowestLigaPrice) {
                    lowestLigaPrice = priceValue;
                }
            }
        });

        if (lowestLigaPrice !== Infinity) {
            prices.push({ store: 'Liga Pokémon', price: lowestLigaPrice });
        }

    } catch (e) {
        console.error('Scraping error:', e);
        debugLogs.push(`Scraping overall error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
        await browser.close();
        debugLogs.push('Browser closed.');
    }

    return { prices, debugLogs };
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cardId, cardName, cardCode } = body;

        if (!cardId || (!cardName && !cardCode)) {
            return NextResponse.json({ error: 'cardId and either cardName or cardCode are required' }, { status: 400 });
        }

        // Scrape prices
        const result = await scrapeCardPrices(cardName, cardCode);
        const scrapedPrices = result.prices;

        if (scrapedPrices.length === 0) {
            return NextResponse.json({ error: 'No prices found or bot blocked', debugLogs: result.debugLogs }, { status: 404 });
        }

        // Insert into Supabase
        const insertData = scrapedPrices.map(p => ({
            card_id: cardId,
            store_name: p.store,
            price: p.price
        }));

        const { error } = await supabaseAdmin.from('price_history').insert(insertData);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, inserted: insertData });

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
