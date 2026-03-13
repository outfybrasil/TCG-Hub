"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, ShieldCheck } from 'lucide-react';
import PriceChart from '@/components/PriceChart';
import { useCart } from '@/context/CartContext';

interface InventoryCard {
    id: string;
    card_id?: string | null;
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
    language?: string;
}

function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return 'Sem preco';
    }

    return `R$ ${value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function MetaPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[20px] border border-slate-200 bg-white/80 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-black tracking-tight text-slate-900">{value}</p>
        </div>
    );
}

export default function CardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const [card, setCard] = useState<InventoryCard | null>(null);
    const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
    const [marketPriceLinks, setMarketPriceLinks] = useState<Record<string, string>>({});
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
                const summaryRes = await fetch('/api/prices/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cards: [{
                            id: data.id,
                            name: data.name,
                            official_name: data.official_name,
                            set: data.set,
                            official_set_name: data.official_set_name,
                            number: data.number,
                            grade: data.grade,
                            finish: data.finish,
                            language: data.language,
                        }],
                    }),
                });
                const summaryJson = summaryRes.ok ? await summaryRes.json() : { summaries: {} };
                const summary = summaryJson.summaries?.[data.id];
                setMarketPrices(summary?.storePrices || {});
                setMarketPriceLinks(summary?.storeUrls || {});
            } else {
                console.error(error);
            }

            setLoading(false);
        };

        if (id) {
            void fetchCard();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen px-6 pb-24 pt-32">
                <div className="mx-auto flex max-w-7xl items-center justify-center">
                    <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-rose-600 animate-spin" />
                </div>
            </div>
        );
    }

    if (!card) {
        return (
            <div className="min-h-screen px-6 pb-24 pt-32">
                <div className="mx-auto max-w-4xl rounded-[40px] border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Carta nao encontrada</h1>
                    <button onClick={() => router.back()} className="mt-6 text-sm font-bold text-rose-600 hover:underline">
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    const isOutOfStock = card.quantity <= 0;
    const displayName = card.name || card.official_name;
    const displaySet = card.official_set_name || card.set || 'Set nao informado';

    return (
        <div className="min-h-[100dvh] overflow-hidden bg-[#f4f1ea] pb-20 pt-24 text-slate-950 selection:bg-amber-300/50 selection:text-slate-950">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-[-10rem] top-12 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl" />
                <div className="absolute right-[-8rem] top-20 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />
            </div>

            <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6">
                <button
                    onClick={() => router.back()}
                    className="inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 transition-colors hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para marketplace
                </button>

                <section className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-[38px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(255,244,214,0.9)_48%,_rgba(244,241,234,1)_100%)] p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.35)]">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                                    {displaySet}
                                </span>
                                {card.number && (
                                    <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                                        #{card.number}
                                    </span>
                                )}
                                {card.is_promo && (
                                    <span className="rounded-full border border-rose-600 bg-rose-600 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white">
                                        Promo
                                    </span>
                                )}
                            </div>
                            {card.grade && (
                                <div className="flex h-14 w-14 rotate-6 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-lg font-black text-white shadow-xl">
                                    {card.grade}
                                </div>
                            )}
                        </div>

                        <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.28))] px-4 py-6">
                            <div className="absolute inset-x-8 top-6 h-20 rounded-full bg-amber-300/20 blur-2xl" />
                            <img
                                src={card.image_url || card.official_image_url}
                                alt={displayName}
                                className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_26px_45px_rgba(15,23,42,0.28)]"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[38px] border border-slate-200 bg-white/85 p-8 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.25)] backdrop-blur">
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                                Perfil da carta
                            </p>
                            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl">
                                {displayName}
                            </h1>
                            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                                Visualizacao focada no que importa: carta, preco atual e historico comparativo contra Liga Pokemon e MYP Cards.
                            </p>

                            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                <MetaPill label="Numero" value={card.number || 'Nao informado'} />
                                <MetaPill label="Idioma" value={card.language || 'Nao informado'} />
                                <MetaPill label="Acabamento" value={card.finish || 'Normal'} />
                                <MetaPill label="Raridade" value={card.rarity || 'Nao informada'} />
                                <MetaPill label="Vendedor" value={card.seller_name || 'TCG Mega Store'} />
                            </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <div className="rounded-[34px] border border-slate-200 bg-white/85 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.2)] backdrop-blur">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    Preco atual
                                </p>
                                <div className="mt-3 flex flex-wrap items-end gap-4">
                                    <span className="text-5xl font-black tracking-[-0.06em] text-slate-950">
                                        {formatPrice(card.price)}
                                    </span>
                                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${isOutOfStock ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {isOutOfStock ? 'Sem estoque' : `${card.quantity} em estoque`}
                                    </span>
                                </div>
                                <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                                    <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                                    <p className="text-sm leading-6 text-emerald-900">
                                        O bloco abaixo concentra o historico de preco e a comparacao direta entre as 3 lojas, sem repetir informacao em outras secoes.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => addItem({
                                    id: card.id,
                                    name: displayName || 'Unknown',
                                    price: card.price || 0,
                                    imageUrl: card.image_url || card.official_image_url || '',
                                    maxStock: card.quantity,
                                })}
                                disabled={isOutOfStock}
                                className={`flex h-full min-h-[180px] flex-col items-center justify-center gap-4 rounded-[34px] px-8 text-center text-[11px] font-black uppercase tracking-[0.24em] transition-all ${isOutOfStock ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400' : 'border border-slate-950 bg-slate-950 text-white hover:bg-rose-600 hover:border-rose-600'}`}
                            >
                                <ShoppingCart className="h-6 w-6" />
                                <span>{isOutOfStock ? 'Indisponivel' : 'Adicionar ao carrinho'}</span>
                            </button>
                        </div>
                    </div>
                </section>

                <PriceChart
                    cardId={card.id}
                    historyCardId={card.card_id}
                    cardName={displayName}
                    cardCode={card.number || ''}
                    cardSet={card.set}
                    condition={card.grade}
                    finish={card.finish}
                    language={card.language}
                    currentPrice={card.price}
                    latestPrices={marketPrices}
                    storeLinks={marketPriceLinks}
                />
            </div>
        </div>
    );
}
