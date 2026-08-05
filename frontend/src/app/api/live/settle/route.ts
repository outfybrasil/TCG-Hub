import { NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    const rate = checkRateLimit(`live-settle:${request.headers.get('x-forwarded-for') || 'unknown'}`, 30, 60_000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);
    const body = await request.json().catch(() => ({}));
    const liveId = typeof body.liveId === 'string' ? body.liveId : '';
    if (!/^[0-9a-f-]{36}$/i.test(liveId)) return NextResponse.json({ error: 'Live inválida.' }, { status: 400 });
    const { data, error } = await supabaseAdmin.rpc('settle_expired_live_lot', { p_live_id: liveId });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(data);
}
