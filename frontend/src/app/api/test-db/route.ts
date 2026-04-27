import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    const { data, error } = await supabaseAdmin.from('live_auction_history').select('*').limit(1);
    return NextResponse.json({ data, error });
}
