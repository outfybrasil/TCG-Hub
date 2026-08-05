'use client';

import React, { useState } from 'react';
import type { Listing } from '@/types/marketplace';
import ReportListingButton from '@/components/ReportListingButton';

interface ListingCardProps {
    listing: Listing;
    onBuy?: (listing: Listing) => void;
}

const CONDITION_INFO: Record<string, { label: string; bg: string; text: string; full: string }> = {
    M: { label: 'M', bg: 'bg-[#bcf0ca]', text: 'text-[#1c8139]', full: 'Mint' },
    NM: { label: 'NM', bg: 'bg-[#d2f3db]', text: 'text-[#2e8f49]', full: 'Near Mint' },
    SP: { label: 'SP', bg: 'bg-[#e1f0ff]', text: 'text-[#2563eb]', full: 'Slightly Played' },
    LP: { label: 'LP', bg: 'bg-[#fef0c7]', text: 'text-[#b45309]', full: 'Lightly Played' },
    MP: { label: 'MP', bg: 'bg-[#ffedd5]', text: 'text-[#c2410c]', full: 'Moderately Played' },
    HP: { label: 'HP', bg: 'bg-[#ffe4e6]', text: 'text-[#e11d48]', full: 'Heavily Played' },
    Dmg: { label: 'D', bg: 'bg-[#fee2e2]', text: 'text-[#b91c1c]', full: 'Damaged' },
};

const LANG_FLAGS: Record<string, string> = {
    'Português': '🇧🇷',
    'Inglês': '🇺🇸',
    'Japonês': '🇯🇵',
    'Espanhol': '🇪🇸',
    'Italiano': '🇮🇹',
    'Alemão': '🇩🇪',
    'Francês': '🇫🇷',
};

export default function ListingCard({ listing, onBuy }: ListingCardProps) {
    const [buying, setBuying] = useState(false);
    const seller = listing.seller_profiles;
    const condKey = listing.condition;
    const cond = CONDITION_INFO[condKey] || { label: condKey, bg: 'bg-slate-100', text: 'text-slate-600', full: condKey };
    const flag = LANG_FLAGS[listing.language] || '🌐';
    const market = listing.pokemon_cards;

    const handleBuy = async () => {
        if (buying || !onBuy) return;
        setBuying(true);
        try {
            await onBuy(listing);
        } finally {
            setBuying(false);
        }
    };

    return (
        <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-4 hover:bg-white/5 transition-colors">
            
            {/* 1. Loja/Vendedor */}
            <div className="flex-[2] min-w-0 pr-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-surface-top flex items-center justify-center shrink-0 border border-white/10">
                        <span className="text-sm font-black text-brand-muted uppercase">
                            {seller?.display_name?.substring(0, 2) || 'VD'}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="font-bold text-sm text-brand-text truncate">
                                {seller?.display_name || 'Vendedor Anônimo'}
                            </p>
                            {seller?.is_verified && (
                                <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-0.5">
                                <span className="text-[10px] font-black text-brand-amber">★</span>
                                <span className="text-[10px] font-bold text-brand-muted">{Number(seller?.rating_avg || 0).toFixed(1)}</span>
                                <span className="text-[9px] text-brand-muted/60">({seller?.rating_count || 0})</span>
                            </div>
                            <span className="text-[10px] text-white/10">|</span>
                            <span className="text-[10px] text-brand-muted uppercase tracking-wider">{seller?.ships_from_state || 'BR'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Qualidade / Idioma */}
            <div className="flex-1 flex flex-col sm:items-center gap-1">
                <div className="flex items-center gap-2">
                    <span title={cond.full} className={`w-8 h-8 rounded flex items-center justify-center font-black text-[11px] shadow-sm ${cond.bg} ${cond.text}`}>
                        {cond.label}
                    </span>
                    <span className="text-xl" title={listing.language}>{flag}</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1 hidden sm:block">
                    {cond.full}
                </span>
            </div>

            {/* 3. Extras */}
            <div className="flex-1 flex flex-wrap sm:justify-center gap-1.5">
                {listing.finish === 'Foil' && (
                    <span className="h-5 px-1.5 rounded bg-amber-50 border border-amber-200 text-[9px] font-black uppercase text-amber-600 flex items-center">
                        ✨ Foil
                    </span>
                )}
                {listing.finish === 'Reverse Foil' && (
                    <span className="h-5 px-1.5 rounded bg-purple-50 border border-purple-200 text-[9px] font-black uppercase text-purple-600 flex items-center">
                        🔮 Reverse
                    </span>
                )}
                {listing.free_shipping && (
                    <span className="h-5 px-1.5 rounded bg-emerald-50 border border-emerald-200 text-[9px] font-black uppercase text-emerald-600 flex items-center">
                        🚚 Frete Grátis
                    </span>
                )}
                {!listing.free_shipping && listing.finish === 'Normal' && (
                    <span className="text-[10px] font-bold text-slate-300">-</span>
                )}
            </div>

            {/* 4. Preço e Comparação */}
            <div className="flex-1 sm:text-right min-w-[120px]">
                <p className="text-xl font-black tracking-tight text-brand-rose">
                    {listing.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted mt-0.5">
                    Unidade
                </p>
                {listing.price_risk_level && listing.price_risk_level !== 'normal' && (
                    <div
                        title={listing.price_risk_reason || 'Preço fora da faixa usual.'}
                        className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${
                            listing.price_risk_level === 'high'
                                ? 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                                : 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                        }`}
                    >
                        Preço fora do padrão · não influencia o índice
                    </div>
                )}
                <ReportListingButton listingId={listing.id} sellerId={listing.seller_id} />

                {/* Referência de vendas internas */}
                {market && (
                    <div className="mt-2 space-y-1">
                        <div className="flex flex-col sm:items-end gap-1">
                                {market.sold_price_min && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">Menor vendido no Hub</span>
                                        <span className="text-[10px] font-black text-emerald-300">{market.sold_price_min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                )}
                                {market.sold_price_max && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-tighter">Maior vendido no Hub</span>
                                        <span className="text-[10px] font-black text-rose-300">{market.sold_price_max.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                )}
                        </div>
                    </div>
                )}
            </div>

            {/* 5. Quantidade e Compra */}
            <div className="flex-[1.5] flex items-center justify-between sm:justify-end gap-3 sm:pl-4 border-l border-white/5">
                <div className="text-center">
                    <div className="h-8 min-w-[3rem] px-2 rounded bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-brand-text">
                        1
                    </div>
                    <p className="text-[9px] font-bold text-brand-muted mt-1">de {listing.quantity}</p>
                </div>
                <button
                    id={`buy-listing-${listing.id}`}
                    onClick={handleBuy}
                    disabled={buying || !onBuy}
                    className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none group-hover:shadow-md"
                >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-[10px] font-black uppercase text-white tracking-widest hidden lg:block">Comprar</span>
                </button>
            </div>
            
        </div>
    );
}
