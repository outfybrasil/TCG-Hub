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
    views?: number;
    created_at?: string;
    seller_profiles?: SellerProfile;
}
