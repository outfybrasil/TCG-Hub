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
        <div className="animate-fade-up pb-20 pt-10" style={{ background: '#0c1324' }}>
            {/* Page header */}
            <section className="page-frame space-y-6 pb-10 pt-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl space-y-4">
                        <div className="eyebrow">Marketplace Premium</div>
                        <h1
                            className="font-black leading-[0.92] tracking-tight text-white"
                            style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}
                        >
                            Catálogo Completo
                        </h1>
                        <p className="text-sm leading-relaxed" style={{ color: '#8b95b5' }}>
                            Busque, filtre e compre diretamente. Estoque exclusivo de Pokémon TCG.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            ['Disponíveis', `${availableCards}`],
                            ['Filtros', activeFilters > 0 ? `${activeFilters} ativos` : 'Nenhum'],
                            ['Preço Médio', averagePrice > 0 ? `R$ ${averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                className="p-4 transition-all hover:scale-[1.02]"
                                style={{
                                    background: '#191f31',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '1rem',
                                }}
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#8b95b5' }}>{label}</p>
                                <p className="mt-2 text-lg font-black tracking-tight text-white">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Search + Sort */}
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por nome, edição, número ou grau PSA..."
                            className="input-dark pl-14!"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                        <svg
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                            style={{ color: '#8b95b5' }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <button
                        onClick={() => setIsSortModalOpen(true)}
                        className="flex h-[52px] items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                        style={{
                            background: '#191f31',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#8b95b5',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(225,29,72,0.4)';
                            (e.currentTarget as HTMLElement).style.color = '#ffb3b6';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                            (e.currentTarget as HTMLElement).style.color = '#8b95b5';
                        }}
                    >
                        Ordenar: {sortOptions.find((option) => option.id === sortBy)?.label}
                    </button>
                </div>
            </section>

            <section className="page-frame mt-6 grid gap-6 pb-20 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <FilterSidebar
                        options={filterOptions}
                        selected={{ sets: selectedSets, rarities: selectedRarities }}
                        onToggle={toggleFilter}
                        onClear={clearFilters}
                    />
                </aside>

                <main className="space-y-4">
                    {/* Result count bar */}
                    <div
                        className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                        style={{
                            background: '#191f31',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '0.875rem',
                        }}
                    >
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#8b95b5' }}>Resultado atual</p>
                            <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                                {sortedCards.length} carta{sortedCards.length === 1 ? '' : 's'} disponíveis
                            </h2>
                        </div>
                        <p className="text-sm" style={{ color: '#8b95b5' }}>
                            Preços com comparativo de mercado nos cards
                        </p>
                    </div>

                    {/* Sort modal */}
                    {isSortModalOpen && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6" style={{ background: 'rgba(7,13,31,0.7)', backdropFilter: 'blur(8px)' }}>
                            <div
                                className="w-full max-w-sm p-8 space-y-6"
                                style={{
                                    background: '#191f31',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '1.5rem',
                                    boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
                                }}
                            >
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: '#8b95b5' }}>Ordenação</p>
                                    <h3 className="mt-2 text-xl font-black text-white">Escolher ordenação</h3>
                                </div>
                                <div className="space-y-3">
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                setSortBy(option.id);
                                                setIsSortModalOpen(false);
                                            }}
                                            className="flex h-12 w-full items-center justify-between rounded-xl px-5 text-left text-[11px] font-black uppercase tracking-[0.18em] transition-all"
                                            style={
                                                sortBy === option.id
                                                    ? { background: '#e11d48', color: '#fff', border: '1px solid #e11d48' }
                                                    : { background: 'rgba(255,255,255,0.04)', color: '#8b95b5', border: '1px solid rgba(255,255,255,0.08)' }
                                            }
                                        >
                                            <span>{option.label}</span>
                                            <span>{sortBy === option.id ? '●' : ''}</span>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setIsSortModalOpen(false)}
                                    className="btn-ghost w-full"
                                    style={{ height: 44 }}
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((item) => (
                                <div
                                    key={item}
                                    className="h-80 animate-pulse rounded-[1.25rem]"
                                    style={{ background: '#191f31' }}
                                />
                            ))}
                        </div>
                    ) : sortedCards.length === 0 ? (
                        <div
                            className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-10 text-center"
                            style={{
                                background: '#191f31',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '1rem',
                            }}
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: '#8b95b5' }}>Nenhum resultado</p>
                            <h3 className="text-2xl font-black tracking-tight text-white">Nenhuma carta encontrada.</h3>
                            <p className="max-w-lg text-sm" style={{ color: '#8b95b5' }}>
                                Limpe os filtros ou ajuste a busca para ver o catálogo completo.
                            </p>
                            <button
                                onClick={clearFilters}
                                className="btn-primary"
                                style={{ height: 44 }}
                            >
                                Limpar Busca
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
