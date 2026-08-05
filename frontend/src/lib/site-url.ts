import 'server-only';

export function getSiteUrl() {
    const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (configured) {
        const url = new URL(configured);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('SITE_URL invalida.');
        return url.origin;
    }
    if (process.env.NODE_ENV === 'production') throw new Error('SITE_URL e obrigatoria em producao.');
    return 'http://localhost:3000';
}
