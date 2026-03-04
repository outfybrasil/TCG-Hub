import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    try {
        const { count, error } = await supabaseAdmin
            .from('pokemon_cards')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return NextResponse.json({ success: true, count: count || 0 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
