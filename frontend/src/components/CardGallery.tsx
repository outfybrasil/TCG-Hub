"use client";

import React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
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

const ProductCard = ({ id, name, set, imageUrl, price, originalPrice, grade, isPromo, finish, quantity = 0, cardNumber, marketPrices, marketPriceLinks, language, addItem, onDelete, onEditCard, mobileDensity = 'comfortable' }: CardProps & { mobileDensity?: 'comfortable' | 'compact' }) => {
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
        <article className={`group relative overflow-hidden border border-white/5 bg-[#191f31] transition-colors hover:border-rose-500/50 ${mobileDensity === 'compact' ? 'rounded-xl p-1.5 sm:rounded-2xl sm:p-5' : 'rounded-2xl p-3 sm:p-5'} ${isOutOfStock ? 'opacity-75 grayscale-[0.5]' : ''}`}>

            {/* Header Info: Promo, Finish & Grade */}
            <div className={`${mobileDensity === 'compact' ? 'hidden sm:flex' : 'flex'} mb-3 items-start justify-between gap-1 px-0.5 sm:mb-4 sm:px-1`}>
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
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-white/5 text-slate-400 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400"
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
            <Link href={`/marketplace/card/${id}`} className={`relative block aspect-[3/4] cursor-pointer overflow-hidden border border-white/5 bg-black/20 ${mobileDensity === 'compact' ? 'mb-1.5 rounded-lg' : 'mb-3 rounded-xl'} sm:mb-5 sm:rounded-xl`}>
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
                    className="h-full w-full object-contain p-0.5 transition-transform duration-500 group-hover:scale-[1.03] sm:p-1"
                />
                {/* Overlay Gradient on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 justify-center">
                    <span className="text-black font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 pb-2">Ver Detalhes</span>
                </div>
            </Link>

            {/* Card Info Section (Center-aligned) */}
            <div className={`flex flex-col ${mobileDensity === 'compact' ? 'items-start space-y-1 pb-1 text-left' : 'items-center space-y-2 pb-2 text-center'} sm:items-center sm:space-y-3 sm:pb-5 sm:text-center`}>
                <div className="space-y-1">
                    <h3 className={`${mobileDensity === 'compact' ? 'line-clamp-2 min-h-7 text-[9px]' : 'line-clamp-2 min-h-9 text-xs'} font-black leading-tight tracking-[-0.03em] text-white transition-colors group-hover:text-rose-500 sm:min-h-[2.75rem] sm:text-base`}>
                        {name}
                    </h3>
                    {cardNumber && (
                        <p className={`${mobileDensity === 'compact' ? 'hidden sm:block' : ''} text-[10px] font-bold text-slate-400`}>({cardNumber})</p>
                    )}
                    <p className={`${mobileDensity === 'compact' ? 'hidden sm:block' : 'line-clamp-1'} text-[10px] font-medium text-slate-400`}>
                        {set}
                    </p>
                </div>

                {/* Price Row (Simplified Market comparison) */}
                <div className="space-y-2 w-full">
                    <div className={`${mobileDensity === 'compact' ? 'items-start' : 'items-center'} flex flex-col sm:items-center`}>
                        {originalPrice && price && originalPrice > price && (
                            <span className={`${mobileDensity === 'compact' ? 'hidden sm:inline' : ''} text-[10px] font-bold text-slate-400 line-through opacity-70`}>
                                R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        )}
                        <span className={`${mobileDensity === 'compact' ? 'text-[11px]' : 'text-lg'} font-black tracking-[-0.04em] sm:text-2xl ${originalPrice && price && originalPrice > price ? 'text-rose-500' : 'text-white'}`}>
                            R$ {(price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="hidden sm:block"><PriceComparison cardId={id} cardName={name} cardSet={set} cardNumber={cardNumber} condition={grade} finish={finish} language={language} prices={marketPrices} priceLinks={marketPriceLinks} currentPrice={price} size="sm" /></div>
                </div>
            </div>

            {mobileDensity === 'compact' && !onDelete && (
                <button
                    type="button"
                    onClick={() => addItem?.({ id, name, price: price || 0, imageUrl, maxStock: quantity })}
                    disabled={isOutOfStock}
                    aria-label={isOutOfStock ? `${name} esgotada` : `Adicionar ${name} ao carrinho`}
                    className="mt-auto flex min-h-11 w-full items-center justify-center rounded-lg bg-rose-600 text-white transition-colors hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-slate-500 sm:hidden"
                >
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                </button>
            )}

            {/* Action Bar (Hub Identity - Dark Premium) */}
            <div className={`${mobileDensity === 'compact' ? 'hidden sm:block' : 'block'} mt-auto pt-2 sm:pt-4`}>
                <div className="flex flex-col space-y-3">
                    {/* Quantity Picker (Hub minimalist style) */}
                    {!onDelete && (
                        <div className="hidden h-11 items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 sm:flex">
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
                            className={`${onEditCard ? 'flex-1' : 'w-full'} flex h-11 items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.98] sm:h-12 sm:text-[11px] sm:tracking-widest ${isOutOfStock && !onDelete
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : onDelete
                                    ? 'border border-transparent bg-white/10 text-white hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-300'
                                    : 'bg-slate-900 text-white hover:bg-rose-600 shadow-lg shadow-slate-900/10 hover:shadow-rose-600/20'
                                }`}
                        >
                            <span>{onDelete ? 'Remover Item' : isOutOfStock ? 'Esgotado' : 'Carrinho'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default function CardGallery({ cards, onDelete, onEditCard, mobileColumns = 2 }: { cards: CardProps[]; onDelete?: (id: string) => void, onEditCard?: (id: string, newPrice: number, originalPrice?: number, quantity?: number) => void; mobileColumns?: 2 | 4 }) {
    const { addItem } = useCart();
    return (
        <div className={`grid ${mobileColumns === 4 ? 'grid-cols-4 gap-1.5' : 'grid-cols-2 gap-3'} sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4`}>
            {cards.map((card) => (
                <ProductCard key={card.id} {...card} addItem={addItem} onDelete={onDelete} onEditCard={onEditCard} mobileDensity={mobileColumns === 4 ? 'compact' : 'comfortable'} />
            ))}
        </div>
    );
}
