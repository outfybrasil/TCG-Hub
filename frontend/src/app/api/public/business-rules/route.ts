import { NextResponse } from 'next/server';

import { getBusinessRules } from '@/lib/business-rules-server';

export async function GET() {
    try {
        const rules = await getBusinessRules();
        return NextResponse.json(rules);
    } catch (error) {
        console.error('Public business rules GET error:', error);
        return NextResponse.json({ error: 'Erro ao carregar regras comerciais.' }, { status: 500 });
    }
}
