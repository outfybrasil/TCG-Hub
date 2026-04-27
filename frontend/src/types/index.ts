export interface Card {
    id: string;
    tcgdex_id?: string;
    name: string;
    set_name: string;
    image_url: string;
    language: string;
    price?: number;
}

export interface Auction {
    id: string;
    card_name: string;
    condition: string;
    current_bid: number;
    ends_at: string;
    image_url: string;
    status?: string;
    seller_id?: string;
}

export interface PurchaseItem {
    id?: string;
    listing_id?: string;
    seller_id?: string;
    quantity: number;
    price: number;
    card_name?: string;
    image_url?: string;
}

export interface Purchase {
    id: string;
    user_id: string;
    total_amount: number;
    status: string;
    created_at: string;
    items?: PurchaseItem[];
    shipping_address?: Record<string, string>;
}

export interface UserAchievement {
    unlocked_at: string;
    name?: string;
    description?: string;
    icon?: string;
}
