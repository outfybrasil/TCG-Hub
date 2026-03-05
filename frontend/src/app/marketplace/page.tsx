"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CardGallery from '@/components/CardGallery';
import FilterSidebar from '@/components/FilterSidebar';

interface InventoryCard {
    id: string; name?: string; set?: string;
    official_name?: string; official_set_name?: string;
    official_image_url?: string; image_url?: string;
    price?: number; grade?: string; finish?: string;
    is_promo?: boolean; isPromo?: boolean;
    quantity?: number; number?: string; local_id?: string;
    marketPrices?: Record<string, number>;
    rarity?: string;
}

export default function MarketplacePage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [cards, setCards] = useState<InventoryCard[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter & Sort State
    const [selectedSets, setSelectedSets] = useState<string[]>([]);
    const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'price_desc' | 'price_asc' | 'newest'>('price_desc');
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);

    useEffect(() => {
        const fetchCards = async () => {
            const { data } = await supabase
                .from('enriched_inventory')
                .select('*')
                .order('price', { ascending: false });

            if (data) {
                // Fetch latest market prices for these cards
                const cardIds = data.map(c => c.id);
                const { data: historyData } = await supabase
                    .from('price_history')
                    .select('card_id, store_name, price, recorded_at')
                    .in('card_id', cardIds)
                    .order('recorded_at', { ascending: false });

                // Map results to cards (getting only latest per store)
                const marketPricesMap: Record<string, Record<string, number>> = {};
                historyData?.forEach(row => {
                    if (!marketPricesMap[row.card_id]) marketPricesMap[row.card_id] = {};
                    if (!marketPricesMap[row.card_id][row.store_name]) {
                        marketPricesMap[row.card_id][row.store_name] = Number(row.price);
                    }
                });

                const enrichedCards = data.map(card => ({
                    ...card,
                    marketPrices: marketPricesMap[card.id] || {}
                }));

                setCards(enrichedCards);
            }
            setLoading(false);
        };

        fetchCards();

        // Real-time subscription for inventory changes
        const channel = supabase
            .channel('inventory-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setCards(prev => prev.map(card =>
                        card.id === payload.new.id ? { ...card, ...(payload.new as InventoryCard) } : card
                    ));
                } else if (payload.eventType === 'INSERT') {
                    setCards(prev => [...prev, payload.new as InventoryCard]);
                } else if (payload.eventType === 'DELETE') {
                    setCards(prev => prev.filter(card => card.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Extract dynamic filters from data
    const filterOptions = {
        sets: Array.from(new Set(cards.map(c => c.official_set_name || c.set).filter(Boolean))) as string[],
        rarities: Array.from(new Set(cards.map(c => c.rarity || c.finish).filter(Boolean))) as string[],
        // Since types might not be in the flat table directly or require more joins, 
        // we'll keep the standard Pokemon types for now but make them functional
        types: ["GRAMA", "FOGO", "ÁGUA", "ELÉTRICO", "PSÍQUICO", "LUTA", "SOMBRIO", "METAL", "FADA", "DRAGÃO"]
    };

    const toggleFilter = (category: string, value: string) => {
        const setters: Record<string, [string[], React.Dispatch<React.SetStateAction<string[]>>]> = {
            sets: [selectedSets, setSelectedSets],
            rarities: [selectedRarities, setSelectedRarities],
            types: [selectedTypes, setSelectedTypes]
        };

        const [selected, set] = setters[category];
        if (selected.includes(value)) {
            set(selected.filter(v => v !== value));
        } else {
            set([...selected, value]);
        }
    };

    const clearFilters = () => {
        setSelectedSets([]);
        setSelectedRarities([]);
        setSelectedTypes([]);
        setSearchTerm('');
    };

    const filteredCards = cards.filter(card => {
        const matchesSearch = (card.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.set ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.official_set_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.number ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.local_id ?? '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSet = selectedSets.length === 0 || selectedSets.includes(card.official_set_name || card.set || '');
        const matchesRarity = selectedRarities.length === 0 || selectedRarities.includes(card.rarity || card.finish || '');

        // Simple type matching (checks if any selected type is in the card name or if we had a type column)
        // Since we don't have a direct 'type' column in migration yet, we'll simulate it with name matching if needed,
        // but for now we'll assume the user wants it to work once the data is there.
        const matchesType = selectedTypes.length === 0 || selectedTypes.some(t =>
            (card.official_name || card.name || '').toUpperCase().includes(t.toUpperCase())
        );

        return matchesSearch && matchesSet && matchesRarity && matchesType;
    });

    // Apply Sorting
    const sortedCards = [...filteredCards].sort((a, b) => {
        if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
        if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
        if (sortBy === 'newest') return b.id.localeCompare(a.id);
        return 0;
    });

    const getSortLabel = () => {
        if (sortBy === 'price_desc') return 'Valor (Maior)';
        if (sortBy === 'price_asc') return 'Valor (Menor)';
        if (sortBy === 'newest') return 'Recentemente';
        return '';
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up">
            {/* Search & Global Index */}
            <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-16 border-b border-slate-200 pb-12">
                <div className="space-y-6 flex-1 w-full">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Estoque Privado Certificado</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                            Catálogo <span className="text-rose-600">Premium.</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest max-w-lg">Coleção exclusiva de ativos Pokémon TCG para colecionadores de alto nível.</p>
                    </div>

                    <div className="relative max-w-2xl">
                        <input
                            type="text"
                            placeholder="Pesquisar por nome, edição ou certificação..."
                            className="w-full h-14 pl-12 pr-6 bg-white border border-slate-200 rounded-2xl focus:border-blue-500 focus:shadow-xl focus:shadow-blue-500/5 outline-none transition-all font-bold text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-10 lg:pt-0">
                    <button className="h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg hover:bg-rose-600 transition-all">Novidades</button>
                    <button className="h-12 px-8 bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-50 transition-all">Filtros Avançados</button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Sidebar Filters */}
                <aside className="w-full lg:w-72 shrink-0">
                    <div className="sticky top-32 space-y-8">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Refinar Busca</h2>
                            <div className="h-[1px] flex-1 bg-slate-100"></div>
                        </div>
                        <FilterSidebar
                            options={filterOptions}
                            selected={{
                                sets: selectedSets,
                                rarities: selectedRarities,
                                types: selectedTypes
                            }}
                            onToggle={toggleFilter}
                            onClear={clearFilters}
                        />
                    </div>
                </aside>

                {/* Results Area */}
                <main className="flex-1 space-y-12">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-6">
                        <span>Exibindo {sortedCards.length} Ativos Premium</span>
                        <div className="flex gap-6 items-center">
                            <span>Ordem: {getSortLabel()}</span>
                            <span
                                onClick={() => setIsSortModalOpen(true)}
                                className="cursor-pointer text-rose-600 hover:text-rose-700 transition-colors bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 flex items-center gap-2"
                            >
                                <span className="w-1 h-1 rounded-full bg-rose-600"></span>
                                Alterar
                            </span>
                        </div>
                    </div>

                    {/* Sort Modal */}
                    {isSortModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                            <div className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl animate-fade-up">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Escolha a Ordem</h3>
                                <div className="space-y-3">
                                    {[
                                        { id: 'price_desc', label: 'Maior Valor' },
                                        { id: 'price_asc', label: 'Menor Valor' },
                                        { id: 'newest', label: 'Novos Ativos' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                setSortBy(opt.id as any);
                                                setIsSortModalOpen(false);
                                            }}
                                            className={`w-full h-14 flex items-center justify-between px-6 rounded-2xl border transition-all ${sortBy === opt.id
                                                    ? 'border-rose-600 bg-rose-50 text-rose-600 shadow-sm'
                                                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            <span className="text-[11px] font-black uppercase tracking-widest">{opt.label}</span>
                                            {sortBy === opt.id && <span className="text-rose-600">●</span>}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setIsSortModalOpen(false)}
                                    className="w-full h-14 mt-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all shadow-lg"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-96 bg-slate-50 animate-pulse rounded-2xl border border-slate-100" />
                            ))}
                        </div>
                    ) : (
                        <CardGallery cards={sortedCards.map(c => ({
                            id: c.id,
                            name: c.official_name ?? c.name ?? 'Desconhecido',
                            set: c.official_set_name ?? c.set ?? 'Desconhecido',
                            imageUrl: c.official_image_url ?? c.image_url ?? 'https://images.pokemontcg.io/base1/1.png',
                            price: c.price ?? 0,
                            grade: c.grade ?? 'NM',
                            finish: c.finish ?? 'Normal',
                            isPromo: c.is_promo ?? c.isPromo ?? false,
                            quantity: c.quantity ?? 1,
                            cardNumber: c.number,
                            marketPrices: c.marketPrices
                        }))} />
                    )}

                    <div className="pt-20 text-center">
                        <button className="h-14 px-12 border border-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-900 hover:text-white transition-all">Carregar Mais Ativos</button>
                    </div>
                </main>
            </div>
        </div>
    );
}

