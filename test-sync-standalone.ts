
const { lookupBrazilianMarketPrices } = require('./frontend/src/lib/market-pricing');

async function test() {
    const cases = [
        { name: 'Pikachu', number: '056/94', expected: '056/094' },
        { name: 'Pikachu', number: '#160/159', expected: '160/159' },
        { name: 'Charizard', number: '4/102', expected: '004/102' }
    ];

    for (const c of cases) {
        const input = { cardName: c.name, cardNumber: c.number, condition: 'NM' };
        console.log(`\n--- Testing ${c.name} ${c.number} ---`);
        try {
            const result = await lookupBrazilianMarketPrices(input);
            console.log('Final Search URL:', result.manualLinks.ligaPokemon);
            // Search for the encoded number in the URL
            const encodedExpected = encodeURIComponent(c.expected).replace(/%2F/g, '/');
            if (result.manualLinks.ligaPokemon.includes(encodeURIComponent(c.expected))) {
                console.log('SUCCESS: Number correctly formatted in URL');
            } else {
                console.log('FAILURE: Number not correctly formatted');
            }
        } catch (e) { console.error(e); }
    }
}

test();
