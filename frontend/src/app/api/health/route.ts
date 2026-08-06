import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const startedAt = Date.now();
    const { error } = await supabaseAdmin.from('pokemon_cards').select('id', { count: 'exact', head: true });
    const healthy = !error;

    return NextResponse.json(
        {
            status: healthy ? 'ok' : 'degraded',
            database: healthy ? 'reachable' : 'unavailable',
            responseTimeMs: Date.now() - startedAt,
            checkedAt: new Date().toISOString(),
        },
        {
            status: healthy ? 200 : 503,
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        },
    );
}
