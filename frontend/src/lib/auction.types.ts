export interface Auction {
    id: string;
    created_at: string;
    cardName: string;
    cardSet: string;
    cardNumber: string;
    imageUrl: string;
    condition: string;
    startingBid: number;
    currentBid: number;
    bidCount: number;
    highestBidderId: string;
    highestBidderName: string;
    endsAt: string;
    createdBy: string;
    status: 'active' | 'ended' | 'finished';
    notes: string;
    language?: string;
}

export interface Bid {
    id: string;
    created_at: string;
    auctionId: string;
    userId: string;
    userName: string;
    amount: number;
    createdAt: string;
}
