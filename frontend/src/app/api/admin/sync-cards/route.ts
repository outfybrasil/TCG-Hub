import { NextResponse } from 'next/server';
import TCGdex from '@tcgdex/sdk';
import pLimit from 'p-limit';

import { requireAdmin } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 300;
export const runtime = 'nodejs';

const LANGUAGES = ['pt-br', 'pt', 'en', 'es', 'it', 'de', 'fr'] as const;
type Language = typeof LANGUAGES[number];
const sdks = Object.fromEntries(LANGUAGES.map((lang) => [lang, new TCGdex(lang)])) as Record<Language, TCGdex>;
const detailLimit = pLimit(8);

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function retry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            await sleep(300 * 2 ** attempt);
        }
    }
    throw lastError;
}

function validSetId(value: unknown): value is string {
    return typeof value === 'string' && /^[a-z0-9._-]{1,32}$/i.test(value);
}

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if ('response' in auth) return auth.response;

    try {
        const body = await request.json().catch(() => ({}));
        if (body.setId !== undefined && !validSetId(body.setId)) {
            return NextResponse.json({ success: false, error: 'ID de conjunto invalido.' }, { status: 400 });
        }

        if (body.setId) {
            const result = await syncSet(body.setId);
            return NextResponse.json(result, { status: result.success ? 200 : 502 });
        }

        const resumes = await retry(() => sdks.pt.set.list());
        const candidates = await Promise.all((resumes || []).slice(-12).map((set) => detailLimit(async () => {
            const detail = await sdks.pt.set.get(set.id).catch(() => sdks.en.set.get(set.id));
            return { id: set.id, name: set.name, releaseDate: detail?.releaseDate || '' };
        })));
        const latest = candidates.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).slice(0, 5);
        const results = [];
        for (const set of latest) results.push(await syncSet(set.id));

        return NextResponse.json({
            success: results.every((result) => result.success),
            sets: latest,
            results,
            count: results.reduce((total, result) => total + (result.count || 0), 0),
        });
    } catch (error) {
        console.error('[cards-sync] fatal:', error);
        return NextResponse.json({ success: false, error: 'Falha ao consultar a TCGdex.' }, { status: 502 });
    }
}

async function syncSet(setId: string) {
    try {
        const setEntries = await Promise.all(LANGUAGES.map(async (lang) => [
            lang,
            await retry(() => sdks[lang].set.get(setId), 2).catch(() => undefined),
        ] as const));
        const setByLanguage = Object.fromEntries(setEntries) as Record<Language, Awaited<ReturnType<TCGdex['set']['get']>>>;
        const primarySet = setByLanguage.pt || setByLanguage['pt-br'] || setByLanguage.en || setEntries.find(([, value]) => value)?.[1];
        if (!primarySet) throw new Error(`Conjunto ${setId} nao encontrado.`);

        const namesByLanguage = new Map<Language, Map<string, string>>();
        for (const lang of LANGUAGES) {
            namesByLanguage.set(lang, new Map((setByLanguage[lang]?.cards || []).map((card) => [card.id, card.name])));
        }

        const rows = await Promise.all(primarySet.cards.map((brief) => detailLimit(async () => {
            let detail: Awaited<ReturnType<TCGdex['card']['get']>> | undefined;
            let imageUrl: string | null = null;
            for (const lang of ['pt', 'pt-br', 'en'] as const) {
                const candidate = await retry(() => sdks[lang].card.get(brief.id), 2).catch(() => undefined);
                if (!detail && candidate) detail = candidate;
                if (candidate?.image) {
                    imageUrl = candidate.getImageURL('high', 'webp');
                    break;
                }
            }

            if (!imageUrl && brief.image) imageUrl = brief.getImageURL('high', 'webp');
            return {
                id: brief.id,
                local_id: primarySet.cardCount.official > 0 ? `${brief.localId}/${primarySet.cardCount.official}` : brief.localId,
                name: namesByLanguage.get('pt-br')?.get(brief.id) || namesByLanguage.get('pt')?.get(brief.id) || brief.name,
                name_en: namesByLanguage.get('en')?.get(brief.id) || brief.name,
                name_es: namesByLanguage.get('es')?.get(brief.id) || null,
                name_it: namesByLanguage.get('it')?.get(brief.id) || null,
                name_de: namesByLanguage.get('de')?.get(brief.id) || null,
                name_fr: namesByLanguage.get('fr')?.get(brief.id) || null,
                image_url: imageUrl,
                set_id: primarySet.id,
                set_name: setByLanguage.pt?.name || setByLanguage['pt-br']?.name || primarySet.name,
                set_name_en: setByLanguage.en?.name || primarySet.name,
                set_name_es: setByLanguage.es?.name || null,
                set_name_it: setByLanguage.it?.name || null,
                set_name_de: setByLanguage.de?.name || null,
                set_name_fr: setByLanguage.fr?.name || null,
                rarity: detail?.rarity || null,
                types: detail?.types || [],
                updated_at: new Date().toISOString(),
            };
        })));

        const errors: string[] = [];
        let saved = 0;
        for (let index = 0; index < rows.length; index += 100) {
            const batch = rows.slice(index, index + 100);
            const { error } = await supabaseAdmin.from('pokemon_cards').upsert(batch, { onConflict: 'id' });
            if (error) errors.push(`cards ${index + 1}-${index + batch.length}: ${error.message}`);
            else saved += batch.length;
        }

        return {
            success: errors.length === 0,
            setId,
            setName: primarySet.name,
            releaseDate: primarySet.releaseDate,
            officialCount: primarySet.cardCount.official,
            totalCount: primarySet.cardCount.total,
            count: saved,
            missingRarity: rows.filter((row) => !row.rarity).length,
            errors,
        };
    } catch (error) {
        console.error(`[cards-sync] ${setId}:`, error);
        return { success: false, setId, count: 0, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
}
