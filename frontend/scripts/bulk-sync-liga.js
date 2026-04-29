const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase (Prioriza ENV, fallback para hardcoded)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kdwzyvfqcspuqvfpnvml.supabase.co';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser'
];

function findChrome() {
    // Se o puppeteer já tiver um caminho padrão ou se estiver no Linux e instalado
    for (const p of CHROME_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    // Fallback: se não encontrar nos caminhos comuns, tenta o padrão do sistema
    return null; 
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeSetCards(page, setCode, setName) {
    console.log(`\n--- Iniciando raspagem para: ${setName} (${setCode}) ---`);
    
    try {
        // Passo 1: Ir para a página de edições
        await page.goto('https://www.ligapokemon.com.br/?view=cards/edicoes', { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Passo 2: Digitar o nome da edição na busca interna
        await page.waitForSelector('#mainsearch, #busca-edicoes');
        await page.type('#mainsearch, #busca-edicoes', setName);
        await delay(2000);

        // Passo 3: Encontrar o link da edição (filtra por links que realmente levam para buscas de edições)
        const editionUrl = await page.evaluate((name, code) => {
            const links = Array.from(document.querySelectorAll('a[href*="view=cards/search&card=edid="]'));
            
            // Tenta primeiro match pelo código (exato)
            let match = links.find(a => {
                const href = a.href.toLowerCase();
                return href.includes(`ed=${code.toLowerCase()}`);
            });
            
            // Se não achou pelo código, tenta pelo nome
            if (!match) {
                match = links.find(a => {
                    const text = a.textContent.trim().toLowerCase();
                    const target = name.toLowerCase();
                    return text === target || text.includes(target);
                });
            }
            
            return match ? match.href : null;
        }, setName, setCode);

        if (editionUrl) {
            console.log(`Edição encontrada! Acessando: ${editionUrl}`);
            await page.goto(editionUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForSelector('figure, .card-item', { timeout: 15000 }).catch(() => {});
        } else {
            // Fallback para busca direta se não achar na lista
            console.log('Edição não encontrada na lista. Tentando busca direta...');
            await page.goto(`https://www.ligapokemon.com.br/?view=cards/search&card=${encodeURIComponent(setName)}`, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForSelector('figure, .card-item', { timeout: 15000 }).catch(() => {});
        }
    } catch (err) {
        console.log(`Erro na navegação: ${err.message}`);
    }

    let data = await page.evaluate(() => {
        const results = [];
        const cardElements = document.querySelectorAll('figure, .card-item, .card-list-item');
        
        cardElements.forEach(el => {
            const nameEl = el.querySelector('.card-name, .title-card, a.main-link-card, a[href*="?view=cards/card"]');
            const imgEl = el.querySelector('img');
            const idEl = el.querySelector('.card-id, .card-number, .card-num');
            
            if (nameEl || imgEl) {
                const name = nameEl ? nameEl.textContent.trim() : (imgEl ? imgEl.alt : 'Unknown');
                const image_url = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || imgEl.src) : null;
                const link = nameEl ? nameEl.href : '';
                
                // Tenta extrair o ID da URL ou do texto
                let local_id = null;
                if (link) {
                    const numMatch = link.match(/num=([^&]+)/);
                    if (numMatch) local_id = numMatch[1];
                }
                
                if (!local_id && idEl) {
                    local_id = idEl.textContent.trim().replace(/[^0-9a-zA-Z/]/g, '');
                }
                
                results.push({
                    name: name,
                    image_url: image_url,
                    local_id: local_id,
                    rarity: 'Common'
                });
            }
        });
        
        return results;
    });

    // Fallback: se algum card não tem local_id, usa o índice
    data.forEach((c, i) => {
        if (!c.local_id) c.local_id = (i + 1).toString();
    });

    return data;
}

async function bulkSync() {
    const reportPath = path.join(__dirname, '../../tmp/syncable_sets_report.json');
    const progressPath = path.join(__dirname, '../../tmp/sync_progress.json');
    
    if (!fs.existsSync(reportPath)) {
        console.error('Relatório de sets não encontrado em tmp/syncable_sets_report.json');
        return;
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const setsToSync = report.notInTcgdex;
    
    // Carregar progresso anterior
    let progress = { processed: [] };
    if (fs.existsSync(progressPath)) {
        progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    }

    const pendingSets = setsToSync.filter(s => !progress.processed.includes(s.code));
    console.log(`Total de sets: ${setsToSync.length}`);
    console.log(`Sets pendentes: ${pendingSets.length}`);

    if (pendingSets.length === 0) {
        console.log('Todos os sets já foram processados!');
        return;
    }

    const launchOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    const chromePath = findChrome();
    if (chromePath) {
        launchOptions.executablePath = chromePath;
    }

    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Processar em lotes de 20 por vez para evitar sobrecarga (50 se estiver no GitHub Actions)
    const BATCH_SIZE = process.env.GITHUB_ACTIONS ? 50 : 20;
    const currentBatch = pendingSets.slice(0, BATCH_SIZE);
    
    console.log(`\nIniciando processamento de lote de ${currentBatch.length} sets...`);

    for (const set of currentBatch) {
        try {
            const cards = await scrapeSetCards(page, set.code, set.name);
            
            if (cards.length > 0) {
                console.log(`Encontrados ${cards.length} cards para ${set.name}. Enviando ao Supabase...`);
                
                const cardsToInsert = cards.map(c => ({
                    id: `${set.code}-${c.local_id}`,
                    local_id: c.local_id,
                    name: c.name,
                    image_url: c.image_url,
                    set_id: set.code,
                    set_name: set.name,
                    rarity: c.rarity,
                    updated_at: new Date().toISOString()
                }));

                const { error } = await supabase
                    .from('pokemon_cards')
                    .upsert(cardsToInsert, { onConflict: 'id' });

                if (error) {
                    console.error(`Erro no Supabase para ${set.name}:`, error.message);
                } else {
                    console.log(`Sincronização concluída: ${set.name}`);
                }
            } else {
                console.log(`Aviso: Nenhum card extraído para ${set.name}.`);
            }
            
            // Marcar como processado (mesmo que tenha falhado, para não travar o loop)
            progress.processed.push(set.code);
            fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));

        } catch (err) {
            console.error(`Erro fatal no set ${set.name}:`, err.message);
        }
        
        await delay(3000); // Pausa entre sets
    }

    await browser.close();
    console.log(`\nLote de ${currentBatch.length} concluído. Rode o script novamente para o próximo lote.`);
}

bulkSync().catch(console.error);
