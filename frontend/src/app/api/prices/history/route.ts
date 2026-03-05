import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');

    if (!cardId) {
        return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('price_history')
            .select('*')
            .eq('card_id', cardId)
            .order('recorded_at', { ascending: true });

        if (error) throw error;

        // Group by date for Recharts format:
        // [ { date: '2023-10-01', Liga: 10.5, MYP: 11.0 }, ... ]
        const chartDataMap: Record<string, Record<string, string | number>> = {};

        data.forEach((row) => {
            const date = new Date(row.recorded_at).toLocaleDateString('pt-BR');
            if (!chartDataMap[date]) {
                chartDataMap[date] = { date };
            }
            chartDataMap[date][row.store_name] = Number(row.price);
        });

        const formattedData = Object.values(chartDataMap);

        return NextResponse.json({ success: true, data: formattedData });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
