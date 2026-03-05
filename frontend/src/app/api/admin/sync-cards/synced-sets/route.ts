import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin.rpc('get_unique_set_ids');

        if (error) {
            // Fallback to normal distinct query if RPC isn't available
            const { data: fallbackData, error: fallbackError } = await supabaseAdmin
                .from('pokemon_cards')
                .select('set_id');

            if (fallbackError) throw fallbackError;

            // Manual distinct
            const uniqueIds = Array.from(new Set((fallbackData || []).map(Card => Card.set_id)));
            return NextResponse.json({ success: true, synced_sets: uniqueIds });
        }

        return NextResponse.json({ success: true, synced_sets: data?.map((d: any) => d.set_id) || [] });

    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
