import { lookupBrazilianMarketPrices } from './src/lib/market-pricing';
import * as fs from 'fs';

async function run() {
    const result = await lookupBrazilianMarketPrices({
        cardName: 'Pikachu ex',
        cardSet: 'Heróis Excelsos',
        language: 'pt',
        condition: 'nm',
        finish: 'normal'
    });
    fs.writeFileSync('test-out.json', JSON.stringify(result.sites.ligaPokemon, null, 2), 'utf-8');
}

run();
