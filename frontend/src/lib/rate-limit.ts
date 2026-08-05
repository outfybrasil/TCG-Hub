import 'server-only';

type Entry = { count: number; resetAt: number };
const globalStore = globalThis as typeof globalThis & { __tcgRateLimits?: Map<string, Entry> };
const store = globalStore.__tcgRateLimits || (globalStore.__tcgRateLimits = new Map());

export function checkRateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = store.get(key);
    if (!current || current.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfter: 0 };
    }
    current.count += 1;
    if (current.count > limit) return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
    return { allowed: true, retryAfter: 0 };
}

export function rateLimitResponse(retryAfter: number) {
    return new Response(JSON.stringify({ error: 'Muitas tentativas. Tente novamente em instantes.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
    });
}
