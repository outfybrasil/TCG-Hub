'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Auction, Bid } from '@/lib/auction.types';

const MOCK_BIDS: Bid[] = [
    { id: 'b1', created_at: new Date().toISOString(), auctionId: 'mock-1', userId: 'u1', userName: 'Colecionador_X', amount: 42500, createdAt: new Date().toISOString() },
    { id: 'b2', created_at: new Date().toISOString(), auctionId: 'mock-1', userId: 'u2', userName: 'PokeMaster_99', amount: 40000, createdAt: new Date().toISOString() },
    { id: 'b3', created_at: new Date().toISOString(), auctionId: 'mock-1', userId: 'u3', userName: 'AquaCollect', amount: 37500, createdAt: new Date().toISOString() },
];

export function useAuction(id: string) {
    const [auction, setAuction] = useState<Auction | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [auctionRes, bidsRes] = await Promise.all([
                supabase.from('auctions').select(`
                    id, created_at, cardName:card_name, cardSet:card_set, cardNumber:card_number,
                    imageUrl:image_url, condition, startingBid:starting_bid, currentBid:current_bid,
                    bidCount:bid_count, highestBidderId:highest_bidder_id, highestBidderName:highest_bidder_name,
                    endsAt:ends_at, createdBy:created_by, status, notes, language
                `).eq('id', id).single(),
                supabase.from('bids').select(`
                    id, created_at, auctionId:auction_id, userId:user_id, userName:user_name, amount
                `).eq('auction_id', id).order('created_at', { ascending: false }).limit(10)
            ]);

            if (auctionRes.error) throw auctionRes.error;

            setAuction(auctionRes.data as Auction);
            setBids((bidsRes.data || []) as Bid[]);
        } catch {
            // Fallback to mock data for demo mode
            const mockAuction: Auction = {
                id: id, created_at: new Date().toISOString(),
                cardName: 'Charizard Shadowless', cardSet: 'Base Set 1999', cardNumber: '4/102',
                imageUrl: 'https://images.pokemontcg.io/base1/4.png',
                condition: 'NM', startingBid: 35000, currentBid: 42500, bidCount: 24,
                highestBidderId: '', highestBidderName: 'Colecionador_X',
                endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 14 * 60 * 1000).toISOString(),
                createdBy: 'admin', status: 'active', notes: 'Carta em excelente estado, sem marcas visíveis.',
                language: 'Inglês'
            };
            setAuction(mockAuction);
            setBids(MOCK_BIDS);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { auction, bids, loading, refetch: fetchData };
}
