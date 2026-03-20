// Quick standalone test for Liga Pokemon via Puppeteer
const puppeteer = require('puppeteer-core');
const { load } = require('cheerio');

const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

async function findChrome() {
    const fs = require('fs');
    for (const p of CHROME_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('Chrome not found');
}

async function main() {
    const execPath = await findChrome();
    console.log('Using browser:', execPath);

    const browser = await puppeteer.launch({
        executablePath: execPath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    console.log('Navigating to Liga Pokemon search...');
    const url = 'https://www.ligapokemon.com.br/?view=cards/card&card=Pikachu+ex';
    
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await new Promise(r => setTimeout(r, 2000));
        
        const html = await page.content();
        console.log('HTML size:', html.length, 'bytes');
        
        const $ = load(html);
        const cards = [];
        $('.mtg-single').each((_, el) => {
            const item = $(el);
            const title = item.find('.mtg-name a').first().text().trim();
            const numericCode = item.find('.mtg-numeric-code').first().text().trim();
            const minPrice = item.find('.price-min').first().text().trim();
            const avgPrice = item.find('.price-avg').first().text().trim();
            const href = item.find('a.main-link-card').attr('href') || item.find('.mtg-name a').attr('href');
            if (title) {
                cards.push({ title, numericCode, minPrice, avgPrice, href });
            }
        });
        
        console.log(`Found ${cards.length} card candidates`);
        cards.slice(0, 5).forEach((c, i) => {
            console.log(`  ${i+1}. ${c.title} [${c.numericCode}] min=${c.minPrice} avg=${c.avgPrice}`);
        });

        if (cards.length === 0) {
            console.log('No .mtg-single found. Checking alternative selectors...');
            console.log('Page title:', $('title').text());
            console.log('Body text preview:', $('body').text().substring(0, 300));
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
