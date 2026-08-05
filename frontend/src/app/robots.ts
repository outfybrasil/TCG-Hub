import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const base = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://tcg.tonicoimbra.com';
    return {
        rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/minha-conta/', '/api/'] }],
        sitemap: `${base}/sitemap.xml`, host: base,
    };
}
