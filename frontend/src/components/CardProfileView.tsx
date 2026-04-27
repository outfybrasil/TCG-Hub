'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import {
    ArrowLeft, ShoppingCart, AlertCircle, ShieldCheck,
    Star, MapPin, Package, Zap
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────── */
interface PokemonCard {
    id: string;
    name: string;
    local_id: string;
    image_url: string;
    set_id: string;
    set_name: string;
    rarity: string | null;
    types: string[];
}

interface MarketListing {
    id: string;
    price: number;
    quantity: number;
    finish?: string;
    language?: string;
    grade?: string;
    condition?: string;
    seller_name?: string;
    official_image_url?: string;
    image_url?: string;
    is_store?: boolean; // TCG MEGASTORE
}

/* ─── Utils ─────────────────────────────────────────────────────── */
const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const RARITY_BADGE: Record<string, string> = {
    'Common': 'bg-white/5 text-brand-muted',
    'Comum': 'bg-white/5 text-brand-muted',
    'Uncommon': 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
    'Incomum': 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
    'Rare': 'bg-brand-amber/10 border border-brand-amber/20 text-brand-amber',
    'Rara': 'bg-brand-amber/10 border border-brand-amber/20 text-brand-amber',
    'Rara Dupla': 'bg-sky-500/10 border border-sky-500/20 text-sky-300',
    'Double Rare': 'bg-sky-500/10 border border-sky-500/20 text-sky-300',
    'Ultra Rare': 'bg-brand-rose/10 border border-brand-rose/25 text-brand-rose',
    'Ultra Rara': 'bg-brand-rose/10 border border-brand-rose/25 text-brand-rose',
    'Illustration Rare': 'bg-violet-500/10 border border-violet-500/25 text-violet-300',
    'Ilustração Rara': 'bg-violet-500/10 border border-violet-500/25 text-violet-300',
    'Special Illustration Rare': 'bg-fuchsia-500/10 border border-fuchsia-500/25 text-fuchsia-300',
    'Ilustração Rara Especial': 'bg-fuchsia-500/10 border border-fuchsia-500/25 text-fuchsia-300',
    'Hyper Rare': 'bg-yellow-400/10 border border-yellow-400/25 text-yellow-300',
    'Mega Hiper Raro': 'bg-yellow-400/10 border border-yellow-400/25 text-yellow-300',
};

const CONDITION_COLORS: Record<string, string> = {
    M: 'bg-emerald-500/15 text-emerald-300',
    NM: 'bg-emerald-500/10 text-emerald-400',
    LP: 'bg-amber-500/10 text-amber-300',
    MP: 'bg-orange-500/10 text-orange-300',
    HP: 'bg-brand-rose/10 text-brand-rose',
    Dmg: 'bg-red-700/10 text-red-400',
};

/* ─── Listing Row ────────────────────────────────────────────────── */
function ListingRow({ listing, onBuy }: { listing: MarketListing; onBuy: (l: MarketListing) => void }) {
    const cond = listing.condition || listing.grade || 'NM';
    const condColor = CONDITION_COLORS[cond] || 'bg-white/5 text-brand-muted';

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
            {/* Vendedor */}
            <div className="flex items-center gap-3 min-w-0 flex-[2]">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-surface-top border border-white/10 flex items-center justify-center">
                    <span className="text-xs font-black text-brand-muted uppercase">
                        {(listing.seller_name || 'VD').substring(0, 2)}
                    </span>
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-text truncate">
                        {listing.seller_name || 'Vendedor'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                        {listing.condition && (
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${condColor}`}>
                                {listing.condition}
                            </span>
                        )}
                        {listing.finish && listing.finish !== 'Normal' && (
                            <span className="rounded bg-brand-amber/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-amber">
                                {listing.finish}
                            </span>
                        )}
                        {listing.language && (
                            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-brand-muted">
                                {listing.language}
                            </span>
                        )}
                        {listing.grade && (
                            <span className="rounded bg-brand-amber/15 border border-brand-amber/25 px-1.5 py-0.5 text-[9px] font-black text-brand-amber">
                                Graded {listing.grade}
                            </span>
                        )}
                        <span className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-brand-muted">
                            <Package className="h-2.5 w-2.5" />
                            {listing.quantity} un.
                        </span>
                    </div>
                </div>
            </div>

            {/* Preço + Ação */}
            <div className="flex items-center gap-4 sm:justify-end">
                <p className="text-xl font-black text-brand-rose">{fmt(listing.price)}</p>
                <button
                    onClick={() => onBuy(listing)}
                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                    Comprar
                </button>
            </div>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────────────── */
interface CardProfileViewProps {
    /** ID da pokemon_cards (ex: "me03-001") */
    pokemonCardId: string;
    /** Label do botão voltar */
    backLabel?: string;
    /** Imagem preferencial (ex: do enriched_inventory), sobrepõe a do pokemon_cards */
    overrideImageUrl?: string;
    /** Nome preferencial (ex: do enriched_inventory) */
    overrideName?: string;
}

export default function CardProfileView({ pokemonCardId, backLabel = 'Voltar', overrideImageUrl, overrideName }: CardProfileViewProps) {
    const router = useRouter();
    const { addItem } = useCart();

    const [card, setCard] = useState<PokemonCard | null>(null);
    const [storeListings, setStoreListings] = useState<MarketListing[]>([]);
    const [communityListings, setCommunityListings] = useState<MarketListing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);

            // 1. Carta
            const { data: cardData } = await supabase
                .from('pokemon_cards')
                .select('id, name, local_id, image_url, set_id, set_name, rarity, types')
                .eq('id', pokemonCardId)
                .single();

            if (!cardData) { setLoading(false); return; }
            setCard(cardData);

            // 2. Todos os anúncios ativos para esta carta
            const { data: allListings } = await supabase
                .from('enriched_inventory')
                .select('id, price, quantity, finish, language, grade, condition, seller_name, official_image_url, image_url')
                .or(`card_id.eq.${cardData.id},official_name.ilike.%${encodeURIComponent(cardData.name)}%`)
                .gt('quantity', 0)
                .order('price', { ascending: true })
                .limit(40);

            const listings: MarketListing[] = (allListings ?? []).map(l => ({
                ...l,
                is_store: l.seller_name === 'TCG MEGASTORE',
            }));

            setStoreListings(listings.filter(l => l.is_store));
            setCommunityListings(listings.filter(l => !l.is_store));
            setLoading(false);
        };

        if (pokemonCardId) void load();
    }, [pokemonCardId]);

    const handleBuy = (listing: MarketListing) => {
        if (listing.is_store) {
            addItem({
                id: listing.id,
                name: card?.name || 'Carta',
                price: listing.price,
                imageUrl: listing.image_url || listing.official_image_url || card?.image_url || '',
                maxStock: listing.quantity,
            });
        } else {
            router.push(`/marketplace/card/${listing.id}`);
        }
    };

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border-4 border-brand-surface-top border-t-brand-rose animate-spin" />
            </div>
        );
    }

    /* ── Not found ── */
    if (!card) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="surface-card p-12 text-center max-w-md w-full">
                    <AlertCircle className="mx-auto h-10 w-10 text-brand-muted mb-4" />
                    <h1 className="text-2xl font-black tracking-tight text-brand-text">Carta não encontrada</h1>
                    <button onClick={() => router.back()} className="mt-6 text-sm font-bold text-brand-rose hover:underline">
                        {backLabel}
                    </button>
                </div>
            </div>
        );
    }

    const rarityClass = RARITY_BADGE[card.rarity ?? ''] || 'bg-white/5 text-brand-muted';
    const totalListings = storeListings.length + communityListings.length;

    return (
        <div className="min-h-screen pb-24 pt-24 animate-fade-up">
            {/* Glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute left-1/4 top-20 h-96 w-96 rounded-full bg-brand-rose/5 blur-3xl" />
                <div className="absolute right-1/4 bottom-40 h-96 w-96 rounded-full bg-brand-amber/5 blur-3xl" />
            </div>

            <div className="relative page-frame flex flex-col gap-8">

                {/* Voltar */}
                <button
                    onClick={() => router.back()}
                    className="inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-brand-muted transition-colors hover:text-brand-text"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {backLabel}
                </button>

                {/* ── Grid principal ── */}
                <div className="grid gap-8 lg:grid-cols-[340px_1fr]">

                    {/* Coluna imagem */}
                    <div className="flex flex-col gap-4">
                        <div className="surface-card overflow-hidden rounded-3xl p-6">
                            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent px-4 py-6">
                                <div className="absolute inset-x-8 top-6 h-20 rounded-full bg-brand-rose/10 blur-2xl" />
                                <img
                                    src={overrideImageUrl || card.image_url}
                                    alt={overrideName || card.name}
                                    loading="eager"
                                    className="relative z-10 max-h-full max-w-full object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                                />
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${rarityClass}`}>
                                {card.rarity ?? 'Comum'}
                            </span>
                            {card.types?.map(type => (
                                <span key={type} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-muted">
                                    {type}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Coluna direita */}
                    <div className="flex flex-col gap-6">

                        {/* Header */}
                        <div className="surface-card rounded-3xl p-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-muted">Perfil da carta</p>
                            <h1 className="mt-3 text-4xl font-black tracking-tight text-brand-text sm:text-5xl">
                                {overrideName || card.name}
                            </h1>
                            <div className="mt-5 grid grid-cols-3 gap-4">
                                {[
                                    ['Coleção', card.set_name],
                                    ['Número', card.local_id],
                                    ['Raridade', card.rarity ?? 'Comum'],
                                ].map(([label, value]) => (
                                    <div key={label} className="surface-card-hi rounded-2xl px-4 py-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-muted">{label}</p>
                                        <p className="mt-2 text-sm font-black text-brand-text">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── TCG MEGASTORE Banner ── */}
                        {storeListings.length > 0 && (
                            <div className="relative overflow-hidden rounded-3xl border border-brand-rose/20 bg-gradient-to-br from-brand-rose/10 to-brand-rose/5 p-6">
                                <div className="absolute right-4 top-4 opacity-10">
                                    <Zap className="h-20 w-20 text-brand-rose" />
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-rose/20 border border-brand-rose/30">
                                        <ShieldCheck className="h-6 w-6 text-brand-rose" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-rose/70">
                                            Disponível na
                                        </p>
                                        <p className="text-lg font-black text-brand-text">TCG MEGASTORE</p>
                                        <p className="mt-1 text-xs text-brand-muted">
                                            Compra protegida · Envio rápido · Garantia de qualidade
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {storeListings.map(listing => (
                                        <div key={listing.id} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/5 px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {listing.finish && (
                                                    <span className="rounded bg-brand-amber/10 border border-brand-amber/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-brand-amber">
                                                        {listing.finish}
                                                    </span>
                                                )}
                                                {listing.language && (
                                                    <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-bold text-brand-muted">
                                                        {listing.language}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 text-[10px] text-brand-muted">
                                                    <Package className="h-3 w-3" />
                                                    {listing.quantity} em estoque
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl font-black text-brand-text">{fmt(listing.price)}</span>
                                                <button
                                                    onClick={() => handleBuy(listing)}
                                                    className="flex items-center gap-2 rounded-xl bg-brand-rose hover:bg-brand-rose-dim px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand-rose/20 transition-all active:scale-95"
                                                >
                                                    <ShoppingCart className="h-4 w-4" />
                                                    Comprar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Listagens da Comunidade ── */}
                        <div className="surface-card rounded-3xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5" style={{ background: '#23293c' }}>
                                <div className="flex items-center gap-3">
                                    <Star className="h-4 w-4 text-brand-amber" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-muted">
                                            Comunidade
                                        </p>
                                        <p className="text-sm font-bold text-brand-text">
                                            {communityListings.length > 0
                                                ? `${communityListings.length} vendedor${communityListings.length > 1 ? 'es' : ''} anunciando`
                                                : 'Nenhum anúncio ainda'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                    totalListings > 0
                                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                        : 'bg-white/5 text-brand-muted'
                                }`}>
                                    {totalListings} total
                                </span>
                            </div>

                            {/* Listings ou Empty State */}
                            {communityListings.length > 0 ? (
                                <div>
                                    {communityListings.map(listing => (
                                        <ListingRow key={listing.id} listing={listing} onBuy={handleBuy} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-14 text-center px-8">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                                        <AlertCircle className="h-8 w-8 text-brand-muted" />
                                    </div>
                                    <div>
                                        <p className="font-black text-brand-text">Nenhuma carta anunciada pela comunidade</p>
                                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-brand-muted">
                                            {storeListings.length > 0
                                                ? 'Apenas a TCG MEGASTORE tem esta carta no momento. Seja o primeiro a vender a sua!'
                                                : 'Nenhum vendedor anunciou esta carta ainda. Você pode ser o primeiro!'}
                                        </p>
                                    </div>
                                    <a
                                        href="/vender/nova-carta"
                                        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-text transition-colors hover:border-brand-rose/30 hover:text-brand-rose"
                                    >
                                        Anunciar minha cópia
                                    </a>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
