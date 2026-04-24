const https = require('https');

https.get('https://api.tcgdex.net/v2/pt/sets', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            const found = parsedData.filter(s => 
                s.name.toLowerCase().includes('equilibrio') || 
                s.name.toLowerCase().includes('perfeito') ||
                s.name.toLowerCase().includes('parceiros') ||
                s.name.toLowerCase().includes('iniciais') ||
                s.name.toLowerCase().includes('jornada') ||
                s.name.toLowerCase().includes('conjunto')
            );
            console.log("Found sets:", found);
        } catch (e) {
            console.error(e.message);
        }
    });
});
