'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Auction } from '@/lib/auction.types';

const MOCK_AUCTIONS: Auction[] = [
    {
        id: 'mock-1', created_at: new Date().toISOString(),
        cardName: 'Charizard Shadowless', cardSet: 'Base Set 1999', cardNumber: '4/102',
        imageUrl: 'https://images.pokemontcg.io/base1/4.png',
        condition: 'NM', startingBid: 35000, currentBid: 42500, bidCount: 24,
        highestBidderId: '', highestBidderName: 'Colecionador_X',
        endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 14 * 60 * 1000).toISOString(),
        createdBy: 'admin', status: 'active', notes: ''
    },
    {
        id: 'mock-2', created_at: new Date().toISOString(),
        cardName: 'Mewtwo 1st Edition', cardSet: 'Base Set 1999', cardNumber: '10/102',
        imageUrl: 'https://images.pokemontcg.io/base1/10.png',
        condition: 'LP', startingBid: 12000, currentBid: 15800, bidCount: 18,
        highestBidderId: '', highestBidderName: 'PokeMaster_99',
        endsAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        createdBy: 'admin', status: 'active', notes: ''
    },
    {
        id: 'mock-3', created_at: new Date().toISOString(),
        cardName: 'Blastoise Holo Rare', cardSet: 'Base Set 1999', cardNumber: '2/102',
        imageUrl: 'https://images.pokemontcg.io/base1/2.png',
        condition: 'NM', startingBid: 7000, currentBid: 8900, bidCount: 12,
        highestBidderId: '', highestBidderName: 'AquaCollect',
        endsAt: new Date(Date.now() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        createdBy: 'admin', status: 'active', notes: ''
    },
    {
        id: 'mock-4', created_at: new Date().toISOString(),
        cardName: 'Venusaur Base Set', cardSet: 'Base Set 1999', cardNumber: '15/102',
        imageUrl: 'https://images.pokemontcg.io/base1/15.png',
        condition: 'LP', startingBid: 5000, currentBid: 6200, bidCount: 8,
        highestBidderId: '', highestBidderName: 'GreenThumb',
        endsAt: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
        createdBy: 'admin', status: 'active', notes: ''
    },
];

export function useAuctions() {
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await supabase
                    .from('auctions')
                    .select(`
                        id,
                        created_at,
                        cardName:card_name,
                        cardSet:card_set,
                        cardNumber:card_number,
                        imageUrl:image_url,
                        condition,
                        startingBid:starting_bid,
                        currentBid:current_bid,
                        bidCount:bid_count,
                        highestBidderId:highest_bidder_id,
                        highestBidderName:highest_bidder_name,
                        endsAt:ends_at,
                        createdBy:created_by,
                        status,
                        notes
                    `)
                    .order('created_at', { ascending: false })
                    .limit(20);
                if (res.error) throw res.error;
                setAuctions(res.data as Auction[]);
            } catch {
                // Collection may not be set up yet – use mock data for demo
                setAuctions(MOCK_AUCTIONS);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    return { auctions, loading };
}
