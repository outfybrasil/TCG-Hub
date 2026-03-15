import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuthenticatedUser } from '@/lib/server-auth';

interface InventoryDeleteBody {
    id?: string;
    ids?: string[];
    set_name?: string;
}

export async function GET(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            const { data: card, error } = await supabaseAdmin
                .from('user_collections')
                .select('*')
                .eq('id', id)
                .eq('user_id', auth.user.id)
                .single();

            if (error) throw error;
            if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

            return NextResponse.json({
                card: {
                    ...card,
                    currentValue: card.market_price || 0,
                    lastSync: card.last_valuation_at,
                    marketSite: card.market_price_site,
                },
            });
        }

        const { data: collection, error } = await supabaseAdmin
            .from('user_collections')
            .select('*')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const enrichedCollection = (collection || []).map((card) => ({
            ...card,
            currentValue: card.market_price || 0,
            lastSync: card.last_valuation_at,
            marketSite: card.market_price_site,
        }));

        return NextResponse.json({ collection: enrichedCollection });
    } catch (error: unknown) {
        console.error('[User Inventory API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const body = await request.json();
        const items = Array.isArray(body) ? body : [body];

        if (items.length === 0) {
            return NextResponse.json({ error: 'Nenhum item fornecido' }, { status: 400 });
        }

        for (const item of items) {
            if (!item.name || !item.set_name) {
                return NextResponse.json({ error: 'Nome e coleÃ§Ã£o sÃ£o obrigatÃ³rios para todos os itens' }, { status: 400 });
            }
        }

        const itemsToInsert = items.map((item) => ({
            user_id: auth.user.id,
            card_id: item.card_id,
            name: item.name,
            set_name: item.set_name,
            number: item.number,
            purchase_price: item.purchase_price || 0,
            quantity: item.quantity || 1,
            image_url: item.image_url,
            condition: item.condition || 'NM',
            finish: item.finish || 'Normal',
            language: item.language || 'PortuguÃªs',
            last_valuation_at: null,
        }));

        const { data, error } = await supabaseAdmin
            .from('user_collections')
            .insert(itemsToInsert)
            .select();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('[User Inventory API POST] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const { searchParams } = new URL(request.url);
        const body = request.headers.get('content-type')?.includes('application/json')
            ? await request.json().catch(() => ({}))
            : {} as InventoryDeleteBody;

        const singleId = body.id || searchParams.get('id');
        const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
        const setName = typeof body.set_name === 'string' ? body.set_name.trim() : '';

        let query = supabaseAdmin
            .from('user_collections')
            .delete()
            .eq('user_id', auth.user.id)
            .select('id');

        if (singleId) {
            query = query.eq('id', singleId);
        } else if (ids.length > 0) {
            query = query.in('id', ids);
        } else if (setName) {
            query = query.eq('set_name', setName);
        } else {
            return NextResponse.json({ error: 'Card ID, IDs ou nome da coleÃ§Ã£o Ã© obrigatÃ³rio' }, { status: 400 });
        }

        const { data: deletedRows, error } = await query;
        if (error) throw error;

        if (!deletedRows || deletedRows.length === 0) {
            return NextResponse.json({ error: 'Nenhum item encontrado para remover.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, deletedCount: deletedRows.length });
    } catch (error: unknown) {
        console.error('[User Inventory API DELETE] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) {
        return auth.response;
    }

    try {
        const body = await request.json();
        const { id, updates } = body;

        if (!id || !updates) {
            return NextResponse.json({ error: 'Card ID and updates are required' }, { status: 400 });
        }

        const allowedUpdates = {
            ...(updates.purchase_price !== undefined && { purchase_price: updates.purchase_price }),
        };

        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('user_collections')
            .update(allowedUpdates)
            .eq('id', id)
            .eq('user_id', auth.user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[User Inventory API PATCH] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
