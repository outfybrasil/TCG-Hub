"use client";

import React from 'react';
import PriceComparison from '@/components/PriceComparison';
import { useCart } from '@/context/CartContext';

interface CardProps {
    id: string;
    name: string;
    set: string;
    imageUrl: string;
    price?: number;
    grade?: string;
    isPromo?: boolean;
    finish?: string;
    addItem?: any;
}

const getGradeColor = (grade: string | undefined) => {
    if (!grade) return 'bg-slate-100 text-slate-400';
    const num = parseFloat(grade);
    if (isNaN(num)) return 'bg-slate-800 text-white';

    if (num >= 9) return 'bg-rose-600 shadow-rose-500/40';
    if (num >= 8) return 'bg-yellow-500 shadow-yellow-500/40';
    return 'bg-slate-400';
};

const ProductCard = ({ id, name, set, imageUrl, price, grade, isPromo, finish, addItem }: CardProps) => (
    <div className="group relative bg-white border border-slate-200 p-5 transition-all hover:border-rose-500/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 rounded-2xl overflow-hidden">

        {/* Header Info: Promo, Finish & Grade */}
        <div className="flex justify-between items-start mb-4 px-1">
            <div className="flex flex-wrap gap-1.5">
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
            </div>

            {/* Grade Circle - Modern Store Aesthetic */}
            {grade && (
                <div className={`h-10 w-10 flex items-center justify-center rounded-full border-4 border-white shadow-xl ${getGradeColor(grade)} transform -rotate-6`}>
                    <span className="text-[14px] font-black text-white tracking-tighter">{grade}</span>
                </div>
            )}
        </div>

        {/* Card Artwork Container */}
        <div className="relative aspect-[3/4] overflow-hidden mb-6 bg-slate-50 border border-slate-100 rounded-xl">
            <img
                src={imageUrl}
                alt={name}
                className="h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
            />
            {/* Overlay Gradient on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-50">
            <div className="space-y-0.5">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{set}</p>
                <h3 className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-rose-600 transition-colors truncate">{name}</h3>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-2xl font-black tracking-tighter text-slate-900">R$ {price?.toLocaleString('pt-BR')}</span>
                <button
                    onClick={() => addItem({ id, name, price: price || 0, imageUrl })}
                    className="h-10 px-6 bg-slate-100 text-slate-900 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-400 transition-all"
                >
                    Adicionar
                </button>
            </div>
            <div className="pt-2 pb-1">
                <PriceComparison cardName={name} cardSet={set} size="sm" />
            </div>
        </div>
    </div>
);

export default function CardGallery({ cards }: { cards: CardProps[] }) {
    const { addItem } = useCart();
    return (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((card) => (
                <ProductCard key={card.id} {...card} addItem={addItem} />
            ))}
        </div>
    );
}
