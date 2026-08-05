// Shared types for the P2P seller marketplace

export interface SellerProfile {
    display_name?: string;
    rating_avg?: number;
    rating_count?: number;
    total_sales?: number;
    is_verified?: boolean;
    ships_from_state?: string;
}

export interface Listing {
    id: string;
    seller_id?: string;
    card_id?: string;
    card_name: string;
    card_set: string;
    card_number?: string;
    image_url?: string;
    price: number;
    quantity: number;
    condition: string;
    language: string;
    finish: string;
    grade?: string;
    free_shipping?: boolean;
    platform_fee_pct?: number;
    notes?: string;
    ships_from_state?: string;
    status?: string;
    price_risk_level?: 'normal' | 'attention' | 'high';
    price_risk_reason?: string;
    reference_price?: number;
    index_eligible?: boolean;
    views?: number;
    created_at?: string;
    seller_profiles?: SellerProfile;
    pokemon_cards?: {
        sold_price_min?: number;
        sold_price_max?: number;
        prices_updated_at?: string;
        rarity?: string;
    };
}
