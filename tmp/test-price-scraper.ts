import { lookupBrazilianMarketPrices } from '../frontend/src/lib/market-pricing';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
    const card = {
        cardName: 'Pikachu ex',
        cardSet: 'Surging Sparks',
        cardNumber: '052/191',
        condition: 'Near Mint',
        finish: 'Normal',
        language: 'Portuguese'
    };

    console.log('Testing lookup for:', card);
    try {
        const result = await lookupBrazilianMarketPrices(card);
        const outputPath = path.join(__dirname, 'scraper-result.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log('Result saved to:', outputPath);
    } catch (error) {
        console.error('Lookup failed:', error);
    }
}

test();
