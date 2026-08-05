"use client";

import React from 'react';
import Link from 'next/link';
import PriceComparison from '@/components/PriceComparison';
import { useCart } from '@/context/CartContext';

interface CardProps {
    id: string;
    name: string;
    set: string;
    imageUrl: string;
    price?: number;
    originalPrice?: number;
    grade?: string;
    isPromo?: boolean;
    finish?: string;
    quantity?: number;
    cardNumber?: string;
    marketPrices?: Record<string, number>;
    marketPriceLinks?: Record<string, string>;
    language?: string;
    addItem?: (item: { id: string; name: string; price: number; imageUrl: string; maxStock?: number }) => void;
    onDelete?: (id: string) => void;
    onEditCard?: (id: string, newPrice: number, originalPrice?: number, quantity?: number) => void;
}

const getGradeColor = (grade: string | undefined) => {
    if (!grade) return 'bg-slate-100 text-slate-400';
    const num = parseFloat(grade);
    if (isNaN(num)) return 'bg-slate-800 text-white';

    if (num >= 9) return 'bg-rose-600 shadow-rose-500/40';
    if (num >= 8) return 'bg-yellow-500 shadow-yellow-500/40';
    return 'bg-slate-400';
};

const ProductCard = ({ id, name, set, imageUrl, price, originalPrice, grade, isPromo, finish, quantity = 0, cardNumber, marketPrices, marketPriceLinks, language, addItem, onDelete, onEditCard }: CardProps) => {
    const [currentImageUrl, setCurrentImageUrl] = React.useState(imageUrl);
    const [imageError, setImageError] = React.useState(false);
    const [selectedQty, setSelectedQty] = React.useState(1);

    React.useEffect(() => {
        setCurrentImageUrl(imageUrl);
        setImageError(false);
    }, [imageUrl]);

    const isOutOfStock = quantity <= 0;

    const increment = () => {
        if (selectedQty < (quantity || 99)) setSelectedQty(prev => prev + 1);
    };

    const decrement = () => {
        if (selectedQty > 1) setSelectedQty(prev => prev - 1);
    };

    return (
        <div className={`group relative bg-[#191f31]/60 backdrop-blur-xl border border-white/5 p-6 transition-all hover:border-rose-500/50 hover:shadow-[0_20px_50px_rgba(225,29,72,0.1)] hover:-translate-y-1.5 rounded-[2rem] overflow-hidden ${isOutOfStock ? 'opacity-75 grayscale-[0.5]' : ''}`}>

            {/* Header Info: Promo, Finish & Grade */}
            <div className="flex justify-between items-start mb-4 px-1">
                <div className="flex flex-wrap gap-1.5 items-center">
                    {isPromo && (
                        <span className="px-2 py-0.5 bg-rose-600 text-[8px] font-black text-white uppercase tracking-widest rounded-md shadow-sm">
                            PROMO
                        </span>
                    )}
                    {finish && finish !== "Normal" && (
                        <span className="px-2 py-0.5 bg-slate-900 text-[8px] font-black text-rose-300 uppercase tracking-widest rounded-md shadow-sm border border-white/10">
                            {finish}
                        </span>
                    )}
                    {originalPrice && price && originalPrice > price && (
                        <span className="px-2 py-0.5 bg-emerald-500 text-[8px] font-black text-white uppercase tracking-widest rounded-md shadow-sm">
                            -{Math.round((1 - price / originalPrice) * 100)}%
                        </span>
                    )}
                    {isOutOfStock ? (
                        <span className="px-2 py-0.5 bg-slate-400 text-[8px] font-black text-white uppercase tracking-widest rounded-md shadow-sm">
                            ESGOTADO
                        </span>
                    ) : (
                        <span className={`px-2 py-0.5 ${quantity < 5 ? 'bg-amber-500' : 'bg-emerald-500'} text-[8px] font-black text-white uppercase tracking-widest rounded-md shadow-sm`}>
                            {quantity} EM ESTOQUE
                        </span>
                    )}
                </div>

                {/* Grade Circle / Delete Button */}
                <div className="flex items-center gap-2">
                    {onDelete && (
                        <button
                            onClick={() => {
                                if (confirm(`Deseja remover "${name}" do inventário?`)) {
                                    onDelete(id);
                                }
                            }}
                            className="h-8 w-8 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-full flex items-center justify-center transition-all border border-transparent hover:border-rose-100 shadow-sm"
                            title="Remover do Inventário"
                        >
                            <span className="text-xs">✕</span>
                        </button>
                    )}
                    {grade && (
                        <div className={`h-10 w-10 flex items-center justify-center rounded-full border-4 border-white shadow-xl ${getGradeColor(grade)} transform -rotate-6`}>
                            <span className="text-[14px] font-black text-white tracking-tighter">{grade}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Card Artwork Container */}
            <Link href={`/marketplace/card/${id}`} className="block relative aspect-[3/4] overflow-hidden mb-6 bg-black/20 border border-white/5 rounded-2xl cursor-pointer">
                <img
                    src={currentImageUrl}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    width={600}
                    height={840}
                    onError={() => {
                        if (!imageError && currentImageUrl) {
                            setImageError(true);
                            if (!currentImageUrl.includes('/pt/')) {
                                const ptUrl = currentImageUrl.replace(/\/(ja|en)\//, '/pt/');
                                setCurrentImageUrl(ptUrl);
                            }
                        }
                    }}
                    className="h-full w-full object-contain p-1 transition-transform duration-700 group-hover:scale-110"
                />
                {/* Overlay Gradient on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 justify-center">
                    <span className="text-black font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 pb-2">Ver Detalhes</span>
                </div>
            </Link>

            {/* Card Info Section (Center-aligned) */}
            <div className="flex flex-col items-center text-center space-y-3 pb-6">
                <div className="space-y-1">
                    <h3 className="min-h-[2.75rem] text-base font-black leading-tight tracking-[-0.03em] text-white transition-colors group-hover:text-rose-600 sm:text-lg">
                        {name}
                    </h3>
                    {cardNumber && (
                        <p className="text-[11px] font-bold text-slate-400">({cardNumber})</p>
                    )}
                    <p className="text-[11px] font-medium text-slate-500">
                        {set}
                    </p>
                </div>

                {/* Price Row (Simplified Market comparison) */}
                <div className="space-y-2 w-full">
                    <div className="flex flex-col items-center">
                        {originalPrice && price && originalPrice > price && (
                            <span className="text-[10px] font-bold text-slate-500 line-through opacity-60">
                                R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        )}
                        <span className={`text-[1.65rem] font-black tracking-[-0.04em] ${originalPrice && price && originalPrice > price ? 'text-rose-600' : 'text-white'}`}>
                            R$ {(price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <PriceComparison
                        cardId={id}
                        cardName={name}
                        cardSet={set}
                        cardNumber={cardNumber}
                        condition={grade}
                        finish={finish}
                        language={language}
                        prices={marketPrices}
                        priceLinks={marketPriceLinks}
                        currentPrice={price}
                        size="sm"
                    />
                </div>
            </div>

            {/* Action Bar (Hub Identity - Dark Premium) */}
            <div className="mt-auto pt-4">
                <div className="flex flex-col space-y-3">
                    {/* Quantity Picker (Hub minimalist style) */}
                    {!onDelete && (
                        <div className="flex items-center justify-between px-4 h-11 bg-white/5 border border-white/5 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qtd.</span>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={decrement}
                                    disabled={selectedQty <= 1}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 border border-white/10 text-slate-400 hover:text-rose-500 hover:border-rose-500/50 transition-all text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                                >−</button>
                                <span className="text-sm font-black text-white min-w-[12px] text-center">{selectedQty}</span>
                                <button
                                    onClick={increment}
                                    disabled={selectedQty >= quantity}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 border border-white/10 text-slate-400 hover:text-rose-500 hover:border-rose-500/50 transition-all text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                                >+</button>
                            </div>
                        </div>
                    )}

                    {/* Add Button (Wide Slate Button) */}
                    <div className="flex gap-2">
                        {onEditCard && (
                            <button
                                onClick={() => onEditCard(id, price || 0, originalPrice, quantity)}
                                className="flex-1 h-12 rounded-xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all border border-slate-200"
                            >
                                Editar Item
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (onDelete) {
                                    if (confirm(`Deseja remover "${name}" do inventário?`)) {
                                        onDelete(id);
                                    }
                                    return;
                                }
                                for (let i = 0; i < selectedQty; i++) {
                                    addItem?.({ id, name, price: price || 0, imageUrl, maxStock: quantity });
                                }
                            }}
                            disabled={isOutOfStock && !onDelete}
                            className={`${onEditCard ? 'flex-1' : 'w-full'} h-12 rounded-xl uppercase font-black tracking-widest text-[11px] transition-all flex items-center justify-center active:scale-[0.98] ${isOutOfStock && !onDelete
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : onDelete
                                    ? 'bg-slate-100 text-slate-900 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100'
                                    : 'bg-slate-900 text-white hover:bg-rose-600 shadow-lg shadow-slate-900/10 hover:shadow-rose-600/20'
                                }`}
                        >
                            <span>{onDelete ? 'Remover Item' : isOutOfStock ? 'Esgotado' : 'Carrinho'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function CardGallery({ cards, onDelete, onEditCard }: { cards: CardProps[]; onDelete?: (id: string) => void, onEditCard?: (id: string, newPrice: number, originalPrice?: number, quantity?: number) => void }) {
    const { addItem } = useCart();
    return (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((card) => (
                <ProductCard key={card.id} {...card} addItem={addItem} onDelete={onDelete} onEditCard={onEditCard} />
            ))}
        </div>
    );
}
