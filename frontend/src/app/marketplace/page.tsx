"use client";

import React, { useEffect, useState } from 'react';

import CardGallery from '@/components/CardGallery';
import FilterSidebar from '@/components/FilterSidebar';
import { supabase } from '@/lib/supabase';

interface InventoryCard {
    id: string;
    card_id?: string | null;
    name?: string;
    set?: string;
    official_name?: string;
    official_set_name?: string;
    official_image_url?: string;
    image_url?: string;
    price?: number;
    original_price?: number;
    grade?: string;
    finish?: string;
    is_promo?: boolean;
    isPromo?: boolean;
    quantity?: number;
    number?: string;
    local_id?: string;
    marketPrices?: Record<string, number>;
    marketPriceLinks?: Record<string, string>;
    rarity?: string;
    language?: string;
}

function buildCardLookupKey(name?: string | null, setName?: string | null) {
    return `${(name || '').trim().toLowerCase()}::${(setName || '').trim().toLowerCase()}`;
}

export default function MarketplacePage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [cards, setCards] = useState<InventoryCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSets, setSelectedSets] = useState<string[]>([]);
    const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'price_desc' | 'price_asc' | 'newest'>('price_desc');
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);

    const sortOptions: Array<{ id: 'price_desc' | 'price_asc' | 'newest'; label: string }> = [
        { id: 'price_desc', label: 'Maior valor' },
        { id: 'price_asc', label: 'Menor valor' },
        { id: 'newest', label: 'Recem listadas' },
    ];

    useEffect(() => {
        const fetchCards = async () => {
            const { data } = await supabase
                .from('enriched_inventory')
                .select('*')
                .order('price', { ascending: false });

            if (data) {
                const summaryRes = await fetch('/api/prices/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cards: data.map((card) => ({
                            id: card.id,
                            name: card.name,
                            official_name: card.official_name,
                            set: card.set,
                            official_set_name: card.official_set_name,
                            number: card.number,
                            grade: card.grade,
                            finish: card.finish,
                            language: card.language,
                        })),
                    }),
                });

                const summaryJson = summaryRes.ok ? await summaryRes.json() : { summaries: {} };
                const marketPricesMap = Object.fromEntries(
                    Object.entries(summaryJson.summaries || {}).map(([cardId, summary]) => [cardId, (summary as { storePrices?: Record<string, number> }).storePrices || {}]),
                ) as Record<string, Record<string, number>>;
                const marketPriceLinksMap = Object.fromEntries(
                    Object.entries(summaryJson.summaries || {}).map(([cardId, summary]) => [cardId, (summary as { storeUrls?: Record<string, string> }).storeUrls || {}]),
                ) as Record<string, Record<string, string>>;

                setCards(data.map((card) => ({
                    ...card,
                    marketPrices: marketPricesMap[card.id] || {},
                    marketPriceLinks: marketPriceLinksMap[card.id] || {},
                })));
            }

            setLoading(false);
        };

        void fetchCards();

        const channel = supabase
            .channel('inventory-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setCards((prev) => prev.map((card) => (card.id === payload.new.id ? { ...card, ...(payload.new as InventoryCard) } : card)));
                } else if (payload.eventType === 'INSERT') {
                    setCards((prev) => [...prev, payload.new as InventoryCard]);
                } else if (payload.eventType === 'DELETE') {
                    setCards((prev) => prev.filter((card) => card.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filterOptions = {
        sets: Array.from(new Set(cards.map((card) => card.official_set_name || card.set).filter(Boolean))) as string[],
        rarities: Array.from(new Set(cards.map((card) => card.rarity || card.finish).filter(Boolean))) as string[],
    };

    const toggleFilter = (category: string, value: string) => {
        const setters: Record<string, [string[], React.Dispatch<React.SetStateAction<string[]>>]> = {
            sets: [selectedSets, setSelectedSets],
            rarities: [selectedRarities, setSelectedRarities],
        };

        const [selected, setSelected] = setters[category];
        setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
    };

    const clearFilters = () => {
        setSelectedSets([]);
        setSelectedRarities([]);
        setSearchTerm('');
    };

    const filteredCards = cards.filter((card) => {
        const matchesSearch =
            (card.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.set ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.official_set_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.number ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.local_id ?? '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSet = selectedSets.length === 0 || selectedSets.includes(card.official_set_name || card.set || '');
        const matchesRarity = selectedRarities.length === 0 || selectedRarities.includes(card.rarity || card.finish || '');

        return matchesSearch && matchesSet && matchesRarity;
    });

    const sortedCards = [...filteredCards].sort((left, right) => {
        if (sortBy === 'price_desc') return (right.price || 0) - (left.price || 0);
        if (sortBy === 'price_asc') return (left.price || 0) - (right.price || 0);
        if (sortBy === 'newest') return right.id.localeCompare(left.id);
        return 0;
    });

    const activeFilters = selectedSets.length + selectedRarities.length;
    const availableCards = cards.filter((card) => (card.quantity || 0) > 0).length;
    const averagePrice = cards.length > 0
        ? cards.reduce((acc, card) => acc + (card.price || 0), 0) / cards.length
        : 0;

    return (
        <div className="animate-fade-up pb-20 pt-10">
            <section className="page-frame page-hero space-y-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl space-y-4">
                        <span className="eyebrow">Marketplace premium</span>
                        <h1 className="text-3xl font-black leading-[0.95] tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl">
                            Catalogo organizado para leitura rapida, filtro util e compra direta.
                        </h1>
                        <p className="max-w-2xl text-sm leading-7 text-slate-600">
                            Em vez de blocos repetidos, a pagina agora concentra busca, filtros e contexto de mercado numa hierarquia mais simples.
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-3">
                        {[
                            ['Ativos', `${availableCards}`],
                            ['Filtros', activeFilters > 0 ? `${activeFilters} ativos` : 'Sem filtros'],
                            ['Preco medio', averagePrice > 0 ? `R$ ${averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Sem dados'],
                        ].map(([label, value]) => (
                            <div key={label} className="surface-card p-5 transition-all hover:scale-[1.02]">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                                <p className="mt-3 text-lg font-black tracking-[-0.03em] text-slate-950">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Pesquisar por nome, edicao, numero ou certificacao"
                            className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-rose-300 focus:shadow-[0_20px_50px_-35px_rgba(225,29,72,0.45)]"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">🔎</span>
                    </div>

                    <button
                        onClick={() => setIsSortModalOpen(true)}
                        className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                    >
                        Ordenar: {sortOptions.find((option) => option.id === sortBy)?.label}
                    </button>
                </div>
            </section>

            <section className="page-frame mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="lg:sticky lg:top-28 lg:self-start">
                    <FilterSidebar
                        options={filterOptions}
                        selected={{ sets: selectedSets, rarities: selectedRarities }}
                        onToggle={toggleFilter}
                        onClear={clearFilters}
                    />
                </aside>

                <main className="space-y-6">
                    <div className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Resultado atual</p>
                            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
                                {sortedCards.length} carta{sortedCards.length === 1 ? '' : 's'} visiveis
                            </h2>
                        </div>
                        <p className="max-w-xl text-sm leading-7 text-slate-600">
                            O catalogo mostra o preco da TCG Hub e o comparativo enxuto com Liga e MYP dentro dos cards.
                        </p>
                    </div>

                    {isSortModalOpen && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
                            <div className="surface-card w-full max-w-sm p-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Ordenacao</p>
                                <h3 className="mt-3 text-2xl font-black tracking-[-0.05em] text-slate-950">Escolha a leitura do catalogo</h3>
                                <div className="mt-6 space-y-3">
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                setSortBy(option.id);
                                                setIsSortModalOpen(false);
                                            }}
                                            className={`flex h-14 w-full items-center justify-between rounded-2xl border px-5 text-left text-[11px] font-black uppercase tracking-[0.22em] transition-all ${sortBy === option.id
                                                ? 'border-rose-600 bg-rose-600 text-white'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600'
                                                }`}
                                        >
                                            <span>{option.label}</span>
                                            <span>{sortBy === option.id ? '•' : ''}</span>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setIsSortModalOpen(false)}
                                    className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 text-[10px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-rose-600"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((item) => (
                                <div key={item} className="surface-card h-96 animate-pulse" />
                            ))}
                        </div>
                    ) : sortedCards.length === 0 ? (
                        <div className="surface-card flex min-h-[320px] flex-col items-center justify-center gap-4 p-10 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Nenhum resultado</p>
                            <h3 className="text-3xl font-black tracking-[-0.05em] text-slate-950">Nao encontramos cartas com essa combinacao.</h3>
                            <p className="max-w-lg text-sm leading-7 text-slate-600">
                                Limpe os filtros ou ajuste a busca para reabrir o catalogo completo.
                            </p>
                            <button
                                onClick={clearFilters}
                                className="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-600 px-6 text-[10px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-slate-950"
                            >
                                Limpar busca
                            </button>
                        </div>
                    ) : (
                        <CardGallery
                            cards={sortedCards.map((card) => ({
                                id: card.id,
                                name: card.official_name ?? card.name ?? 'Desconhecido',
                                set: card.official_set_name ?? card.set ?? 'Desconhecido',
                                imageUrl: card.official_image_url ?? card.image_url ?? 'https://images.pokemontcg.io/base1/1.png',
                                price: card.price ?? 0,
                                originalPrice: card.original_price,
                                grade: card.grade ?? 'NM',
                                finish: card.finish ?? 'Normal',
                                isPromo: card.is_promo ?? card.isPromo ?? false,
                                quantity: card.quantity || 0,
                                cardNumber: card.number,
                                marketPrices: card.marketPrices,
                                marketPriceLinks: card.marketPriceLinks,
                                language: card.language,
                            }))}
                        />
                    )}
                </main>
            </section>
        </div>
    );
}
