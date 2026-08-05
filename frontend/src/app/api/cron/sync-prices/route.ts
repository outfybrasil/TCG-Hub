import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { lookupBrazilianMarketPrices } from '@/lib/market-pricing';
import {
    buildMarketInputFromCard,
    buildMarketSearchKeyFromCard,
    buildPriceHistoryRows,
    type MarketCardLike,
} from '@/lib/market-cache';
import { closeBrowser } from '@/lib/browser-pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHUNK_SIZE = 2; // Process 2 cards at a time to not overwhelm Puppeteer

interface InventorySyncCard extends MarketCardLike {
    card_id?: string | null;
    created_at?: string;
    quantity?: number;
}

export async function GET(request: Request) {
    // Basic security for cron (configurable via env)
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    
    if (!secret || authHeader !== `Bearer ${secret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('[CRON] Starting daily market prices sync...');
        
        // Fetch all distinct cards in inventory that have quantity > 0
        const { data, error } = await supabaseAdmin
            .from('inventory')
            .select('id, card_id, name, set, number, grade, finish, language, created_at, quantity')
            .gt('quantity', 0)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const cards = (data || []) as InventorySyncCard[];
        
        // Deduplicate cards so we don't fetch the exact same inputs twice
        const uniqueCardsMap = new Map<string, InventorySyncCard>();
        for (const card of cards) {
            const key = buildMarketSearchKeyFromCard(card);
            if (!uniqueCardsMap.has(key)) {
                uniqueCardsMap.set(key, card);
            }
        }
        
        const uniqueCards = Array.from(uniqueCardsMap.values());
        console.log(`[CRON] Found ${uniqueCards.length} unique items to sync.`);

        let synced = 0;
        let failed = 0;
        const errors: string[] = [];

        // Note: In VPS, this background processing will keep running even if the response completes early.
        // We will return a response immediately and process in the background to avoid HTTP timeout.
        
        const syncTask = async () => {
            for (let i = 0; i < uniqueCards.length; i += CHUNK_SIZE) {
                const chunk = uniqueCards.slice(i, i + CHUNK_SIZE);
                
                await Promise.all(
                    chunk.map(async (card) => {
                        try {
                            const input = buildMarketInputFromCard(card);
                            if (!input.cardName) return;

                            const prices = await lookupBrazilianMarketPrices(input);
                            const searchKey = buildMarketSearchKeyFromCard(card);

                            await supabaseAdmin
                                .from('card_prices')
                                .upsert({
                                    search_key: searchKey,
                                    card_name: input.cardName,
                                    card_set: input.cardSet,
                                    card_number: input.cardNumber,
                                    card_condition: input.condition,
                                    card_finish: input.finish,
                                    card_language: input.language,
                                    result: prices,
                                    fetched_at: new Date().toISOString(),
                                }, { onConflict: 'search_key' });

                            const historyRows = buildPriceHistoryRows(card.card_id, prices);
                            if (historyRows.length > 0) {
                                await supabaseAdmin.from('price_history').insert(historyRows);
                            }
                            
                            // Also update last_valuation_at in user_collections
                            if (card.card_id && card.grade && card.finish && card.language) {
                                let marketUrl = '';
                                if (prices.sites.ligaPokemon.selectedPrice !== null) marketUrl = prices.sites.ligaPokemon.url;
                                else if (prices.sites.mypCards.selectedPrice !== null) marketUrl = prices.sites.mypCards.url;

                                await supabaseAdmin
                                    .from('user_collections')
                                    .update({
                                        market_price: prices.bestMatched.price || prices.bestAvailable.price,
                                        market_price_site: marketUrl,
                                        last_valuation_at: new Date().toISOString()
                                    })
                                    .eq('card_id', card.card_id)
                                    .eq('condition', card.grade)
                                    .eq('finish', card.finish)
                                    .eq('language', card.language);
                            }

                            synced++;
                        } catch (err: any) {
                            failed++;
                            errors.push(`${card.name}: ${err.message}`);
                        }
                    })
                );
                
                // Throttle to respect Liga/MYP rate limits and avoid browser crash
                console.log(`[CRON] Progress: ${Math.min(i + CHUNK_SIZE, uniqueCards.length)}/${uniqueCards.length}`);
                await new Promise(r => setTimeout(r, 2000));
            }
            
            console.log(`[CRON] Finish! Synced: ${synced}, Failed: ${failed}`);
            await closeBrowser();
        };

        // Start background process
        syncTask().catch(console.error);

        return NextResponse.json({
            success: true,
            message: 'Sync started in the background.',
            totalToSync: uniqueCards.length
        });
        
    } catch (error: any) {
        console.error('[CRON] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
