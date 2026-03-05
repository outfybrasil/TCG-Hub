"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PriceChart from '@/components/PriceChart';
import PriceComparison from '@/components/PriceComparison';
import { useCart } from '@/context/CartContext';

interface InventoryCard {
    id: string;
    local_id: string;
    name: string;
    set: string;
    official_name: string;
    official_set_name: string;
    official_image_url: string;
    image_url: string;
    price: number;
    grade?: string;
    finish?: string;
    is_promo?: boolean;
    quantity: number;
    number?: string;
    seller_name?: string;
    rarity?: string;
}

export default function CardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const [card, setCard] = useState<InventoryCard | null>(null);
    const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const { addItem } = useCart();

    useEffect(() => {
        const fetchCard = async () => {
            const { data, error } = await supabase
                .from('enriched_inventory')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                setCard(data);
                // Fetch market history for initial comparison
                const { data: history } = await supabase
                    .from('price_history')
                    .select('store_name, price')
                    .eq('card_id', id)
                    .order('recorded_at', { ascending: false });

                const latestPrices: Record<string, number> = {};
                history?.forEach(h => {
                    if (!latestPrices[h.store_name]) latestPrices[h.store_name] = Number(h.price);
                });
                setMarketPrices(latestPrices);
            } else {
                console.error(error);
            }
            setLoading(false);
        };

        if (id) {
            fetchCard();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen pt-32 px-6 pb-24 max-w-7xl mx-auto flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!card) {
        return (
            <div className="min-h-screen pt-32 px-6 pb-24 max-w-7xl mx-auto text-center">
                <h1 className="text-2xl font-black text-slate-900">Carta não encontrada</h1>
                <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">Voltar</button>
            </div>
        );
    }

    const isOutOfStock = card.quantity <= 0;

    return (
        <div className="min-h-[100dvh] bg-slate-50 selection:bg-rose-500/30 selection:text-rose-900 pb-20 pt-24">
            <div className="max-w-6xl mx-auto px-6">

                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Voltar para Marketplace
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left Column: Image */}
                    <div className="lg:col-span-4 relative">
                        <div className="sticky top-32">
                            <div className="w-full aspect-[3/4] p-4 bg-white border border-slate-200 rounded-[32px] shadow-sm flex items-center justify-center">
                                <img
                                    src={card.image_url || card.official_image_url}
                                    alt={card.name}
                                    className="max-h-full max-w-full drop-shadow-2xl"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Details & Chart */}
                    <div className="lg:col-span-8 flex flex-col space-y-10">
                        {/* Header Info */}
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                    {card.set || card.official_set_name}
                                </span>
                                {card.number && (
                                    <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                        #{card.number}
                                    </span>
                                )}
                                {card.is_promo && (
                                    <span className="px-3 py-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                                        PROMO
                                    </span>
                                )}
                            </div>

                            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-none">
                                {card.name || card.official_name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-6 pt-2">
                                {card.grade && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grade</span>
                                        <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                                            {card.grade}
                                        </span>
                                    </div>
                                )}
                                {card.finish && card.finish !== 'Normal' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Finish</span>
                                        <span className="text-sm font-bold text-slate-900">{card.finish}</span>
                                    </div>
                                )}
                                {card.rarity && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rarity</span>
                                        <span className="text-sm font-bold text-slate-900">{card.rarity}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendedor</span>
                                    <span className="text-sm font-bold text-blue-600">{card.seller_name || 'TCG Mega Store'}</span>
                                </div>
                            </div>

                            <div className="pt-4 pb-2 border-t border-slate-100">
                                <PriceComparison
                                    cardName={card.name || card.official_name}
                                    cardSet={card.set}
                                    cardNumber={card.number}
                                    prices={marketPrices}
                                    currentPrice={card.price}
                                    size="sm"
                                />
                            </div>
                        </div>

                        {/* Price Action Box */}
                        <div className="bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Preço Atual TCG Hub</p>
                                <div className="text-4xl font-black tracking-tighter text-slate-900">
                                    R$ {card.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className={`text-xs mt-2 font-black uppercase tracking-widest ${isOutOfStock ? 'text-slate-400' : 'text-emerald-500'}`}>
                                    {isOutOfStock ? 'Esgotado' : `${card.quantity} EM ESTOQUE`}
                                </p>
                            </div>

                            <button
                                onClick={() => addItem({
                                    id: card.id,
                                    name: card.name || card.official_name || 'Unknown',
                                    price: card.price || 0,
                                    imageUrl: card.image_url || card.official_image_url || '',
                                    maxStock: card.quantity
                                })}
                                disabled={isOutOfStock}
                                className={`w-full sm:w-auto h-14 px-10 ${isOutOfStock ? 'bg-slate-100 text-slate-400' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xl shadow-rose-600/20'} text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all`}
                            >
                                {isOutOfStock ? 'Sem Estoque' : 'Adicionar ao Carrinho'}
                            </button>
                        </div>

                        {/* Market History Chart Component */}
                        <div className="pt-4 border-t border-slate-200">
                            <PriceChart
                                cardId={card.local_id || card.id}
                                cardName={card.name || card.official_name}
                                cardCode={card.number || ''}
                                currentPrice={card.price}
                                setExpansion={card.set}
                            />
                            {/* Force a small gap or note if needed */}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
