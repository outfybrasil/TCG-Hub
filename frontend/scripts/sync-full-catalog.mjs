import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import { readFile } from 'node:fs/promises';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.');

const supabase = createClient(url, key, { auth: { persistSession: false } });
const api = 'https://api.tcgdex.net/v2';

async function getJson(path, attempts = 4) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(`${api}/${path}`, { signal: AbortSignal.timeout(45_000) });
            if (response.ok) return response.json();
            if (response.status === 404) return null;
            if (attempt === attempts) throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            if (attempt === attempts) throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 600));
    }
}

const candidates = new Map();
const source = await readFile(new URL('../src/app/[locale]/edicoes/_data.ts', import.meta.url), 'utf8');
for (const match of source.matchAll(/\["[^"]+","([^"]+)"(?:,"([^"]*)")?\]/g)) {
    candidates.set(match[1], { id: match[1] });
    if (match[2]) candidates.set(match[2], { id: match[2] });
}
const limit = pLimit(4);
let saved = 0;
let failed = 0;

await Promise.all([...candidates.keys()].map((setId) => limit(async () => {
    try {
        const [pt, en] = await Promise.all([
            getJson(`pt/sets/${encodeURIComponent(setId)}`).catch(() => null),
            getJson(`en/sets/${encodeURIComponent(setId)}`).catch(() => null),
        ]);
        const primary = pt || en;
        if (!primary?.cards?.length) return;
        const enNames = new Map((en?.cards || []).map((card) => [card.id, card.name]));
        const official = Number(primary.cardCount?.official || 0);
        const rows = primary.cards.map((card) => ({
            id: card.id,
            local_id: official ? `${card.localId}/${official}` : card.localId || null,
            name: card.name,
            name_en: enNames.get(card.id) || card.name,
            image_url: card.image ? `${card.image}/high.webp` : null,
            set_id: primary.id,
            set_name: pt?.name || primary.name,
            set_name_en: en?.name || primary.name,
            updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase.from('pokemon_cards').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
        saved += rows.length;
        console.log(`${setId}: ${rows.length} cartas (${saved} processadas)`);
    } catch (error) {
        failed += 1;
        console.error(`${setId}: ${error instanceof Error ? error.message : String(error)}`);
    }
})));

console.log(JSON.stringify({ success: failed === 0, saved, failedSets: failed, totalSets: candidates.size }));
if (failed) process.exitCode = 2;
