import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            const { data: card, error } = await supabaseAdmin
                .from('user_collections')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

            return NextResponse.json({ 
                card: {
                    ...card,
                    currentValue: card.market_price || 0,
                    lastSync: card.last_valuation_at,
                    marketSite: card.market_price_site
                }
            });
        }

        const { data: collection, error } = await supabaseAdmin
            .from('user_collections')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map collection to include cached prices
        const enrichedCollection = collection.map(card => ({
            ...card,
            currentValue: card.market_price || 0,
            lastSync: card.last_valuation_at,
            marketSite: card.market_price_site
        }));

        return NextResponse.json({ collection: enrichedCollection });
    } catch (error: any) {
        console.error('[User Inventory API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const items = Array.isArray(body) ? body : [body];

        if (items.length === 0) {
            return NextResponse.json({ error: 'Nenhum item fornecido' }, { status: 400 });
        }

        // Validate all items
        for (const item of items) {
            if (!item.name || !item.set_name) {
                return NextResponse.json({ error: 'Nome e coleção são obrigatórios para todos os itens' }, { status: 400 });
            }
        }

        const itemsToInsert = items.map(item => ({
            user_id: user.id,
            card_id: item.card_id,
            name: item.name,
            set_name: item.set_name,
            number: item.number,
            purchase_price: item.purchase_price || 0,
            quantity: item.quantity || 1,
            image_url: item.image_url,
            condition: item.condition || 'NM',
            finish: item.finish || 'Normal',
            language: item.language || 'Português',
            last_valuation_at: null
        }));

        const { data, error } = await supabaseAdmin // Changed to supabaseAdmin for consistency with other handlers
            .from('user_collections')
            .insert(itemsToInsert)
            .select();

        if (error) {
            console.error('Erro ao inserir no inventário:', error);
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[User Inventory API POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('user_collections')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Ensure user can only delete their own cards

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[User Inventory API DELETE] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, updates } = body;

        if (!id || !updates) {
            return NextResponse.json({ error: 'Card ID and updates are required' }, { status: 400 });
        }

        // We specifically want to allow updating the purchase_price safely
        const allowedUpdates = {
            ...(updates.purchase_price !== undefined && { purchase_price: updates.purchase_price })
        };

        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('user_collections')
            .update(allowedUpdates)
            .eq('id', id)
            .eq('user_id', user.id); // Ensure user can only update their own cards

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[User Inventory API PATCH] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
