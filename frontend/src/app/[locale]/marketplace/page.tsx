"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Columns2, Grid2X2, Search, SlidersHorizontal, X } from 'lucide-react';

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
    condition?: string;
    grading_company?: string;
    grading_score?: number;
}

const PAGE_SIZE = 24;

interface CatalogResponse {
    cards: InventoryCard[];
    total: number;
    facets?: { sets: string[]; rarities: string[]; languages: string[]; conditions: string[]; grades: string[]; finishes: string[] };
    error?: string;
}

async function fetchCatalog(params: URLSearchParams, signal?: AbortSignal) {
    const response = await fetch(`/api/marketplace/catalog?${params.toString()}`, { signal, cache: 'no-store' });
    const payload = await response.json() as CatalogResponse;
    if (!response.ok) throw new Error(payload.error || 'Nao foi possivel carregar o catalogo.');

    if (payload.cards.length === 0) return payload;
    const summaryRes = await fetch('/api/prices/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cards: payload.cards.map((card) => ({
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
        signal,
    });
    const summaryJson = summaryRes.ok ? await summaryRes.json() : { summaries: {} };

    return {
        ...payload,
        cards: payload.cards.map((card) => ({
            ...card,
            marketPrices: summaryJson.summaries?.[card.id]?.storePrices || {},
            marketPriceLinks: summaryJson.summaries?.[card.id]?.storeUrls || {},
        })),
    };
}

export default function MarketplacePage() {
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
    // setCode filter — comes from /edicoes page click (e.g. ?setCode=SVP)
    const [activeSetCode, setActiveSetCode] = useState(() => searchParams.get('setCode')?.toLowerCase() ?? '');

    // Sync both params when URL changes
    useEffect(() => {
        setSearchTerm(searchParams.get('q') ?? '');
        setActiveSetCode(searchParams.get('setCode')?.toLowerCase() ?? '');
    }, [searchParams]);
    const [cards, setCards] = useState<InventoryCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [totalCards, setTotalCards] = useState(0);
    const [filterOptions, setFilterOptions] = useState({ sets: [] as string[], rarities: [] as string[], languages: [] as string[], conditions: [] as string[], grades: [] as string[], finishes: [] as string[] });
    const [retryKey, setRetryKey] = useState(0);
    const hasLoadedFacets = useRef(false);
    const [selectedSets, setSelectedSets] = useState<string[]>([]);
    const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
    const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [availableOnly, setAvailableOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'price_desc' | 'price_asc' | 'newest'>('price_desc');
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [mobileColumns, setMobileColumns] = useState<2 | 4>(2);

    const sortOptions: Array<{ id: 'price_desc' | 'price_asc' | 'newest'; label: string }> = [
        { id: 'price_desc', label: 'Maior valor' },
        { id: 'price_asc', label: 'Menor valor' },
        { id: 'newest', label: 'Recem listadas' },
    ];

    useEffect(() => {
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

    useEffect(() => {
        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            setLoading(true);
            setLoadError('');
            const params = new URLSearchParams({ offset: '0', limit: String(PAGE_SIZE), sort: sortBy, facets: hasLoadedFacets.current ? '0' : '1' });
            if (searchTerm.trim()) params.set('q', searchTerm.trim());
            if (activeSetCode) params.set('setCode', activeSetCode);
            selectedSets.forEach((value) => params.append('set', value));
            selectedRarities.forEach((value) => params.append('rarity', value));
            selectedLanguages.forEach((value) => params.append('language', value));
            selectedConditions.forEach((value) => params.append('condition', value));
            selectedGrades.forEach((value) => params.append('grade', value));
            selectedFinishes.forEach((value) => params.append('finish', value));
            if (priceRange.min) params.set('minPrice', priceRange.min);
            if (priceRange.max) params.set('maxPrice', priceRange.max);
            if (availableOnly) params.set('available', '1');

            try {
                const payload = await fetchCatalog(params, controller.signal);
                setCards(payload.cards);
                setTotalCards(payload.total);
                if (payload.facets) {
                    setFilterOptions(payload.facets);
                    hasLoadedFacets.current = true;
                }
            } catch (error) {
                if ((error as Error).name !== 'AbortError') setLoadError('Nao foi possivel carregar as cartas. Verifique sua conexao e tente novamente.');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [activeSetCode, availableOnly, priceRange.max, priceRange.min, retryKey, searchTerm, selectedConditions, selectedFinishes, selectedGrades, selectedLanguages, selectedRarities, selectedSets, sortBy]);

    const loadMoreCards = async () => {
        setLoadingMore(true);
        setLoadError('');
        const params = new URLSearchParams({ offset: String(cards.length), limit: String(PAGE_SIZE), sort: sortBy });
        if (searchTerm.trim()) params.set('q', searchTerm.trim());
        if (activeSetCode) params.set('setCode', activeSetCode);
        selectedSets.forEach((value) => params.append('set', value));
        selectedRarities.forEach((value) => params.append('rarity', value));
        selectedLanguages.forEach((value) => params.append('language', value));
        selectedConditions.forEach((value) => params.append('condition', value));
        selectedGrades.forEach((value) => params.append('grade', value));
        selectedFinishes.forEach((value) => params.append('finish', value));
        if (priceRange.min) params.set('minPrice', priceRange.min);
        if (priceRange.max) params.set('maxPrice', priceRange.max);
        if (availableOnly) params.set('available', '1');
        try {
            const payload = await fetchCatalog(params);
            setCards((current) => [...current, ...payload.cards.filter((card) => !current.some((item) => item.id === card.id))]);
            setTotalCards(payload.total);
        } catch {
            setLoadError('Nao foi possivel buscar mais cartas. Tente novamente.');
        } finally {
            setLoadingMore(false);
        }
    };

    const toggleFilter = (category: string, value: string) => {
        const setters: Record<string, [string[], React.Dispatch<React.SetStateAction<string[]>>]> = {
            sets: [selectedSets, setSelectedSets],
            rarities: [selectedRarities, setSelectedRarities],
            languages: [selectedLanguages, setSelectedLanguages],
            conditions: [selectedConditions, setSelectedConditions],
            grades: [selectedGrades, setSelectedGrades],
            finishes: [selectedFinishes, setSelectedFinishes],
        };

        const [selected, setSelected] = setters[category];
        setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
    };

    const clearFilters = () => {
        setSelectedSets([]);
        setSelectedRarities([]);
        setSelectedLanguages([]);
        setSelectedConditions([]);
        setSelectedGrades([]);
        setSelectedFinishes([]);
        setPriceRange({ min: '', max: '' });
        setAvailableOnly(false);
        setSearchTerm('');
    };

    const activeFilters = selectedSets.length + selectedRarities.length + selectedLanguages.length + selectedConditions.length + selectedGrades.length + selectedFinishes.length + Number(Boolean(priceRange.min || priceRange.max)) + Number(availableOnly);
    const availableCards = totalCards;
    return (
        <div className="animate-fade-up bg-brand-bg pb-20 pt-5 sm:pt-10">
            {/* Page header */}
            <section className="page-frame space-y-6 pb-6 pt-5 sm:pb-10 sm:pt-6">
                <div className="max-w-3xl">
                    <h1 className="text-[clamp(2.25rem,10vw,3.5rem)] font-black leading-[0.95] tracking-[-0.04em] text-white">Loja de cartas</h1>
                    <p className="mt-3 text-sm leading-6 text-brand-muted sm:text-base">Compare preços e encontre cartas disponíveis para envio. {availableCards} itens em estoque.</p>
                </div>

                {/* Active set code banner */}
                {activeSetCode && (
                    <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                        <span className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-blue-300">
                            {activeSetCode.toUpperCase()}
                        </span>
                        <p className="text-sm font-bold text-white">
                            Filtrando cartas da edição <span className="text-blue-300 uppercase">{activeSetCode}</span>
                        </p>
                        <button
                            onClick={() => setActiveSetCode('')}
                            className="ml-auto flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-colors"
                        >
                            ✕ Limpar
                        </button>
                    </div>
                )}

                {/* Search + Sort */}
                <div className="grid gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por nome, edição, número ou grau PSA..."
                            className="input-dark pl-12! text-base"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
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

            <section className="page-frame mt-2 grid gap-6 pb-20 lg:mt-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                {isFilterOpen && <button aria-label="Fechar filtros" onClick={() => setIsFilterOpen(false)} className="fixed inset-0 z-[119] bg-black/70 lg:hidden" />}
                <aside className={`${isFilterOpen ? 'fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[120] block max-h-[72dvh] overflow-y-auto rounded-2xl bg-brand-surface shadow-2xl' : 'hidden'} lg:sticky lg:top-24 lg:block lg:self-start`}>
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 lg:hidden"><span className="font-bold text-white">Filtrar cartas</span><button onClick={() => setIsFilterOpen(false)} aria-label="Fechar filtros" className="flex h-11 w-11 items-center justify-center rounded-xl text-brand-muted"><X className="h-5 w-5" /></button></div>
                    <FilterSidebar
                        options={filterOptions}
                        selected={{ sets: selectedSets, rarities: selectedRarities, languages: selectedLanguages, conditions: selectedConditions, grades: selectedGrades, finishes: selectedFinishes }}
                        priceRange={priceRange}
                        availableOnly={availableOnly}
                        onPriceChange={(field, value) => setPriceRange((current) => ({ ...current, [field]: value }))}
                        onAvailabilityChange={setAvailableOnly}
                        onToggle={toggleFilter}
                        onClear={clearFilters}
                    />
                </aside>

                <main className="space-y-4">
                    {/* Result count bar */}
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-surface px-4 py-3 sm:px-5 sm:py-4">
                        <div>
                            <h2 className="text-sm font-bold text-white sm:text-xl">
                                {totalCards} carta{totalCards === 1 ? '' : 's'} disponíveis
                            </h2>
                            {activeFilters > 0 && <p className="mt-0.5 text-xs text-brand-muted">{activeFilters} filtro{activeFilters === 1 ? '' : 's'} ativo{activeFilters === 1 ? '' : 's'}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsFilterOpen(true)} aria-label="Abrir filtros" className="flex h-11 w-11 items-center justify-center rounded-xl text-brand-muted hover:bg-white/5 hover:text-white lg:hidden"><SlidersHorizontal className="h-5 w-5" /></button>
                            <div className="flex rounded-xl bg-black/20 p-1 lg:hidden" aria-label="Quantidade de cartas por linha">
                                <button onClick={() => setMobileColumns(2)} aria-label="Duas cartas por linha" aria-pressed={mobileColumns === 2} className={`flex h-9 w-9 items-center justify-center rounded-lg ${mobileColumns === 2 ? 'bg-white/10 text-white' : 'text-brand-muted'}`}><Columns2 className="h-4 w-4" /></button>
                                <button onClick={() => setMobileColumns(4)} aria-label="Quatro cartas por linha" aria-pressed={mobileColumns === 4} className={`flex h-9 w-9 items-center justify-center rounded-lg ${mobileColumns === 4 ? 'bg-white/10 text-white' : 'text-brand-muted'}`}><Grid2X2 className="h-4 w-4" /></button>
                            </div>
                        </div>
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
                        <div className={`grid ${mobileColumns === 4 ? 'grid-cols-4 gap-1.5' : 'grid-cols-2 gap-3'} sm:grid-cols-2 sm:gap-5 lg:grid-cols-3`}>
                            {[1, 2, 3, 4, 5, 6].map((item) => (
                                <div
                                    key={item}
                                    className="aspect-[3/5] animate-pulse rounded-xl sm:h-80 sm:aspect-auto sm:rounded-2xl"
                                    style={{ background: '#191f31' }}
                                />
                            ))}
                        </div>
                    ) : loadError && cards.length === 0 ? (
                        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl bg-brand-surface p-10 text-center">
                            <h3 className="text-2xl font-black tracking-tight text-white">O catálogo não carregou.</h3>
                            <p className="max-w-lg text-sm text-brand-muted">{loadError}</p>
                            <button onClick={() => setRetryKey((value) => value + 1)} className="btn-primary min-h-11">Tentar novamente</button>
                        </div>
                    ) : cards.length === 0 ? (
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
                        <>
                        <CardGallery
                            mobileColumns={mobileColumns}
                            cards={cards.map((card) => ({
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
                        {loadError && <p role="alert" className="mt-4 text-center text-sm text-rose-300">{loadError}</p>}
                        {cards.length < totalCards && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => void loadMoreCards()}
                                    disabled={loadingMore}
                                    className="btn-primary min-h-11 min-w-48 disabled:cursor-wait disabled:opacity-60"
                                >
                                    {loadingMore ? 'Carregando cartas...' : `Carregar mais (${cards.length} de ${totalCards})`}
                                </button>
                            </div>
                        )}
                        </>
                    )}
                </main>
            </section>
        </div>
    );
}
