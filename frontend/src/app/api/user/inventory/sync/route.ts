import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildMarketInputFromCard, buildMarketSearchKeyFromCard, summarizeMarketResult } from '@/lib/market-cache';
import { lookupBrazilianMarketPrices } from '@/lib/market-pricing';
import { requireAuthenticatedUser } from '@/lib/server-auth';

interface UserCollectionRow {
    id: string;
    name: string;
    set_name: string;
    number: string | null;
    language: string | null;
    condition: string | null;
    finish: string | null;
    market_price: number | null;
    card_id: string | null;
}

interface PokemonCardMetaRow {
    id: string;
    name_en: string | null;
    set_name_en: string | null;
}

export async function POST(request: Request) {
    try {
        const auth = await requireAuthenticatedUser(request);
        if ('response' in auth) {
            return auth.response;
        }
        const user = auth.user;

        const { data: collection, error } = await supabaseAdmin
            .from('user_collections')
            .select('id, name, set_name, number, language, condition, finish, market_price, card_id')
            .eq('user_id', user.id);

        if (error) throw error;
        if (!collection || collection.length === 0) {
            return NextResponse.json({ success: true, message: 'Empty collection' });
        }

        const collectionRows = (collection || []) as UserCollectionRow[];
        const cardIds = Array.from(
            new Set(
                collectionRows
                    .map((card) => card.card_id)
                    .filter((cardId): cardId is string => Boolean(cardId))
            )
        );

        const pokemonCardMetaById = new Map<string, PokemonCardMetaRow>();
        if (cardIds.length > 0) {
            const { data: pokemonCards, error: pokemonCardsError } = await supabaseAdmin
                .from('pokemon_cards')
                .select('id, name_en, set_name_en')
                .in('id', cardIds);

            if (pokemonCardsError) {
                throw pokemonCardsError;
            }

            for (const pokemonCard of (pokemonCards || []) as PokemonCardMetaRow[]) {
                pokemonCardMetaById.set(pokemonCard.id, pokemonCard);
            }
        }

        // Fetch valuation for all cards using the internal API logic
        const summaryRes = await fetch(`${new URL(request.url).origin}/api/prices/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cards: collectionRows.map((card) => {
                    const pokemonCard = card.card_id ? pokemonCardMetaById.get(card.card_id) : undefined;

                    return ({
                    id: card.id,
                    name: card.name,
                    name_en: pokemonCard?.name_en ?? null,
                    set: card.set_name,
                    set_name_en: pokemonCard?.set_name_en ?? null,
                    number: card.number,
                    language: card.language,
                    grade: card.condition, // Use grade instead of condition for MarketCardLike
                    finish: card.finish
                    });
                })
            })
        });

        if (!summaryRes.ok) {
            const errorText = await summaryRes.text();
            throw new Error(`Failed to fetch price summaries: ${errorText}`);
        }
        
        const pricingData = await summaryRes.json();
        const summaries = pricingData.summaries || {};

        // Helper to wait
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        // Update each card in the database with the new valuation
        for (const card of collectionRows) {
            let pricing = summaries[card.id];
            
            // If pricing wasn't in cache, perform a live lookup
            if (!pricing || (pricing.bestAvailablePrice === null && card.market_price === null)) {
                 try {
                     // Add a small delay between live lookups to avoid rate limiting
                     await delay(500);

                     const pokemonCard = card.card_id ? pokemonCardMetaById.get(card.card_id) : undefined;
                     const cardForMarket = {
                        ...card,
                        grade: card.condition,
                        name_en: pokemonCard?.name_en ?? null,
                        set_name_en: pokemonCard?.set_name_en ?? null
                     };
                     const lookupInput = buildMarketInputFromCard(cardForMarket);
                     const liveResult = await lookupBrazilianMarketPrices(lookupInput);
                     pricing = summarizeMarketResult(liveResult);
                     
                     // Save 'liveResult' back to 'card_prices' cache
                     await supabaseAdmin.from('card_prices').upsert({
                        search_key: buildMarketSearchKeyFromCard(cardForMarket),
                        result: liveResult,
                     });
                 } catch (err) {
                     console.error('Live lookup failed for card', card.name, err);
                 }
            }
            
            if (pricing) {
                const updateData: {
                    last_valuation_at: string;
                    market_price?: number | null;
                    market_price_site?: string | null;
                } = {
                    last_valuation_at: new Date().toISOString()
                };

                if (pricing.bestAvailablePrice !== null) {
                    updateData.market_price = pricing.bestAvailablePrice;
                    updateData.market_price_site = pricing.bestAvailableStore;
                }

                await supabaseAdmin
                    .from('user_collections')
                    .update(updateData)
                    .eq('id', card.id);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[Inventory Sync API] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
