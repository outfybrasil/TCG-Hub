import type { MetadataRoute } from 'next';

import { supabaseAdmin } from '@/lib/supabase-admin';

export const revalidate = 86_400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://tcg.tonicoimbra.com';
    const staticPaths = ['', '/precos', '/marketplace', '/edicoes', '/leilao', '/lives', '/comunidade'];
    const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
        url: `${base}${path}`, lastModified: new Date(),
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : path === '/precos' ? 0.95 : 0.8,
    }));
    try {
        const { data } = await supabaseAdmin.from('pokemon_cards').select('id, updated_at').order('updated_at', { ascending: false }).limit(45_000);
        for (const card of data || []) entries.push({
            url: `${base}/edicoes/card/${encodeURIComponent(card.id)}`,
            lastModified: card.updated_at ? new Date(card.updated_at) : undefined,
            changeFrequency: 'weekly', priority: 0.7,
        });
    } catch {
        // Static entries remain valid during a temporary database outage.
    }
    return entries;
}
