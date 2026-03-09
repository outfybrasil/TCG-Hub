import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const purchaseId = searchParams.get('id');

        if (!purchaseId) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'System configuration error: Service key missing' }, { status: 500 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            serviceRoleKey
        );

        const { data, error } = await supabaseAdmin
            .from('purchases')
            .select('status')
            .eq('id', purchaseId)
            .single();

        if (error) {
            console.error('Error fetching purchase status:', error);
            return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
        }

        return NextResponse.json({ status: data?.status || 'unknown' });
    } catch (err) {
        console.error('Status API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
