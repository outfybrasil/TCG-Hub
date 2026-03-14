import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('liga-search-page.html', 'utf8');
const $ = cheerio.load(html);

const results: any[] = [];
$('.mtg-single').each((_, element) => {
    const item = $(element);
    results.push({
        title: item.find('.mtg-name a').first().text().trim(),
        min: item.find('.price-min').first().text().trim(),
        avg: item.find('.price-avg').first().text().trim(),
        max: item.find('.price-max').first().text().trim()
    });
});
console.log(JSON.stringify(results, null, 2));
