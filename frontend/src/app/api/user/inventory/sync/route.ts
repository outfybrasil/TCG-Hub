import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { buildMarketInputFromCard, buildMarketSearchKeyFromCard, summarizeMarketResult } from '@/lib/market-cache';
import { lookupBrazilianMarketPrices } from '@/lib/market-pricing';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: collection, error } = await supabaseAdmin
            .from('user_collections')
            .select('id, name, set_name, number, language, condition, finish, market_price')
            .eq('user_id', user.id);

        if (error) throw error;
        if (!collection || collection.length === 0) {
            return NextResponse.json({ success: true, message: 'Empty collection' });
        }

        // Fetch valuation for all cards using the internal API logic
        const summaryRes = await fetch(`${new URL(request.url).origin}/api/prices/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cards: collection.map(card => ({
                    id: card.id,
                    name: card.name,
                    set: card.set_name,
                    number: card.number,
                    language: card.language,
                    condition: card.condition,
                    finish: card.finish
                }))
            })
        });

        if (!summaryRes.ok) throw new Error('Failed to fetch price summaries');
        
        const pricingData = await summaryRes.json();
        const summaries = pricingData.summaries || {};

        // Update each card in the database with the new valuation
        const updatePromises = collection.map(async (card) => {
            let pricing = summaries[card.id];
            
            // If pricing wasn't in cache, perform a live lookup
            if (!pricing || (pricing.bestAvailablePrice === null && card.market_price === null)) {
                 try {
                     const lookupInput = buildMarketInputFromCard(card);
                     const liveResult = await lookupBrazilianMarketPrices(lookupInput);
                     pricing = summarizeMarketResult(liveResult);
                     
                     // Optionally, we could also save 'liveResult' back to 'card_prices' cache here
                     await supabaseAdmin.from('card_prices').upsert({
                        search_key: buildMarketSearchKeyFromCard(card),
                        result: liveResult,
                     });
                 } catch (err) {
                     console.error('Live lookup failed for card', card.name, err);
                 }
            }
            
            if (pricing) {
                const updateData: any = {
                    last_valuation_at: new Date().toISOString()
                };

                if (pricing.bestAvailablePrice !== null) {
                    updateData.market_price = pricing.bestAvailablePrice;
                    updateData.market_price_site = pricing.bestAvailableStore;
                }

                return supabaseAdmin
                    .from('user_collections')
                    .update(updateData)
                    .eq('id', card.id);
            }
        });

        await Promise.all(updatePromises);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Inventory Sync API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
