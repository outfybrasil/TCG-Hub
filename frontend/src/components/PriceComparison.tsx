'use client';

import React, { useCallback, useState } from 'react';

interface PriceComparisonProps {
    cardId?: string;
    cardName: string;
    cardSet?: string;
    cardNumber?: string;
    condition?: string;
    finish?: string;
    language?: string;
    size?: 'sm' | 'md';
    prices?: Record<string, number>;
    priceLinks?: Record<string, string>;
    currentPrice?: number;
}

interface SitePrice {
    site: string;
    url: string;
    matchedPrice: number | null;
    fallbackPrice: number | null;
    selectedPrice: number | null;
    selectedMatchType: 'exact' | 'partial' | 'lowest_available' | 'general' | 'unavailable';
    selectedVariantLabel: string | null;
    note: string | null;
    offersCount: number;
}

interface PriceData {
    hubIndex: {
        price: number | null;
        fairLow: number | null;
        fairHigh: number | null;
        confidence: 'insufficient' | 'low' | 'medium' | 'high';
        sampleSize: number;
        verifiedSales: number;
        excludedOutliers: number;
        methodology: 'weighted_median_v1';
    };
    bestMatched: {
        store: string | null;
        price: number | null;
    };
    bestAvailable: {
        store: string | null;
        price: number | null;
        matchType: SitePrice['selectedMatchType'];
    };
    sites: {
        mypCards: SitePrice;
        ligaPokemon: SitePrice & {
            minPrice: number | null;
            avgPrice: number | null;
            maxPrice: number | null;
        };
    };
    manualLinks: {
        mypCards: string;
        ligaPokemon: string;
    };
    criteria: {
        condition: string | null;
        finish: string | null;
        language: string | null;
    };
    fetchedAt: string;
}

const STORE_LABELS: Record<string, string> = {
    'MYP Cards': 'MYP',
    'Liga Pokemon': 'Liga',
};

const COMPACT_STORES = [
    { key: 'Liga Pokemon', accent: 'amber' },
    { key: 'MYP Cards', accent: 'blue' },
] as const;

function formatBRL(value: number | null | undefined) {
    if (value === null || value === undefined) return '---';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function matchTypeLabel(matchType: SitePrice['selectedMatchType']) {
    if (matchType === 'exact') return 'Categoria igual';
    if (matchType === 'partial') return 'Categoria proxima';
    if (matchType === 'general') return 'Mercado geral';
    if (matchType === 'lowest_available') return 'Menor anuncio';
    return 'Indisponivel';
}

export default function PriceComparison({
    cardId,
    cardName,
    cardSet,
    cardNumber,
    condition,
    finish,
    language,
    size = 'md',
    prices,
    priceLinks,
    currentPrice,
}: PriceComparisonProps) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [error, setError] = useState('');
    const [source, setSource] = useState('');

    const fetchPrices = useCallback(async (forceRefresh = false) => {
        if ((priceData && !forceRefresh) || loading) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/prices/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId,
                    cardName,
                    cardSet,
                    cardNumber,
                    condition,
                    finish,
                    language,
                    forceRefresh,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao buscar');
            }

            setPriceData(data.prices);
            setSource(data.source);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao buscar precos.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [cardId, cardName, cardSet, cardNumber, condition, finish, language, loading, priceData]);

    if (size === 'sm') {
        return (
            <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-[9px] font-black tracking-tight">
                {currentPrice !== undefined && (
                    <span className="text-rose-400 uppercase whitespace-nowrap">
                        Site: {formatBRL(currentPrice)}
                    </span>
                )}

                {COMPACT_STORES.map((store) => {
                    const value = prices?.[store.key] ?? null;
                    const href = priceLinks?.[store.key] || buildStoreFallbackUrl(store.key, cardName, cardNumber);
                    const classes = getCompactStoreClasses(store.accent, value !== null);

                    return (
                        <React.Fragment key={store.key}>
                            <span className="text-white/10">|</span>
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${classes} uppercase whitespace-nowrap transition-colors`}
                                aria-label={`${STORE_LABELS[store.key]} ${value !== null ? formatBRL(value) : 'sem preco'}`}
                            >
                                {STORE_LABELS[store.key]}: {value !== null ? formatBRL(value) : 'sem preco'}
                            </a>
                        </React.Fragment>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button
                onClick={() => {
                    const nextExpanded = !expanded;
                    setExpanded(nextExpanded);
                    if (nextExpanded && !priceData) {
                        void fetchPrices(false);
                    }
                }}
                className="flex items-center gap-2.5 py-2 px-4 bg-white/5 border border-white/5 rounded-full shadow-sm hover:border-rose-500/30 hover:bg-white/10 transition-all group"
            >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">
                    Comparar mercado BR
                </span>
                <span className={`text-[10px] text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>v</span>
            </button>

            {expanded && (
                <div className="bg-[#191f31]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 space-y-5 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                MYP + Liga Pokemon
                            </p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                                Mesmo card, com prioridade para mesma categoria
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {source === 'cache' && (
                                <span className="text-[7px] font-bold text-slate-300 italic">Cache</span>
                            )}
                            <button
                                onClick={() => void fetchPrices(true)}
                                disabled={loading}
                                className="text-[8px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 disabled:opacity-30 transition-colors"
                            >
                                {loading ? '...' : 'Atualizar'}
                            </button>
                        </div>
                    </div>

                    {loading && (
                        <div className="flex flex-col items-center py-8 space-y-4">
                            <div className="h-8 w-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                                Consultando mercado brasileiro...
                            </p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">{error}</p>
                        </div>
                    )}

                    {priceData && !loading && (
                        <div className="space-y-4">
                            <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">
                                            Índice TCG Hub
                                        </p>
                                        <p className="mt-2 text-3xl font-black text-white">
                                            {formatBRL(priceData.hubIndex?.price)}
                                        </p>
                                        <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-emerald-100/70">
                                            Faixa justa: {formatBRL(priceData.hubIndex?.fairLow)} — {formatBRL(priceData.hubIndex?.fairHigh)}
                                        </p>
                                    </div>
                                    <div className="rounded-full border border-emerald-300/20 bg-black/20 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-emerald-200">
                                        Confiança: {confidenceLabel(priceData.hubIndex?.confidence)}
                                    </div>
                                </div>
                                <p className="mt-4 text-[9px] leading-5 text-emerald-50/65">
                                    Mediana ponderada de {priceData.hubIndex?.sampleSize || 0} referências. Valores anormais não controlam o índice.
                                    {(priceData.hubIndex?.verifiedSales || 0) === 0 && ' Ainda sem vendas verificadas suficientes; use como estimativa inicial.'}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <SummaryCard label="Preco TCG MEGASTORE" value={formatBRL(currentPrice)} tone="slate" />
                                <SummaryCard
                                    label={priceData.bestMatched.price !== null ? 'Melhor comparavel' : 'Melhor disponivel'}
                                    value={formatBRL(priceData.bestMatched.price ?? priceData.bestAvailable.price)}
                                    tone="emerald"
                                    helper={(priceData.bestMatched.store ?? priceData.bestAvailable.store) || 'Sem referencia'}
                                />
                                <SummaryCard
                                    label="Criterio"
                                    value={[
                                        priceData.criteria.condition,
                                        priceData.criteria.finish,
                                        priceData.criteria.language,
                                    ].filter(Boolean).join(' | ') || 'Sem filtro extra'}
                                    tone="amber"
                                />
                            </div>

                            {[priceData.sites.mypCards, priceData.sites.ligaPokemon].map((site) => (
                                <div key={site.site} className="bg-white/5 border border-white/5 rounded-[20px] p-5 space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{site.site}</h4>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {matchTypeLabel(site.selectedMatchType)}
                                            </p>
                                        </div>
                                        <a
                                            href={site.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[8px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                                        >
                                            Ver no site
                                        </a>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <MetricCard label="Categoria igual" value={formatBRL(site.matchedPrice)} />
                                        <MetricCard label="Melhor referencia" value={formatBRL(site.selectedPrice)} />
                                        <MetricCard label="Menor anuncio" value={formatBRL(site.fallbackPrice)} />
                                    </div>

                                    {site.selectedVariantLabel && (
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                            {site.selectedVariantLabel}
                                        </p>
                                    )}
                                    {site.note && (
                                        <p className="text-[9px] font-medium text-slate-400">
                                            {site.note}
                                        </p>
                                    )}
                                </div>
                            ))}

                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                                    Links diretos
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <a
                                        href={priceData.manualLinks.ligaPokemon}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center h-12 bg-yellow-50 hover:bg-yellow-100 border border-yellow-100 rounded-2xl transition-all"
                                    >
                                        <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Liga Pokemon</span>
                                    </a>
                                    <a
                                        href={priceData.manualLinks.mypCards}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center h-12 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl transition-all"
                                    >
                                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">MYP Cards</span>
                                    </a>
                                </div>
                            </div>

                            <p className="text-center text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                                Ultima consulta: {new Date(priceData.fetchedAt).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function confidenceLabel(value: PriceData['hubIndex']['confidence'] | undefined) {
    if (value === 'high') return 'Alta';
    if (value === 'medium') return 'Média';
    if (value === 'low') return 'Baixa';
    return 'Dados insuficientes';
}

function buildStoreFallbackUrl(store: keyof typeof STORE_LABELS, cardName: string, cardNumber?: string) {
    const query = encodeURIComponent(cardNumber || cardName);

    if (store === 'Liga Pokemon') {
        return `https://www.ligapokemon.com.br/?view=cards/card&card=${query}`;
    }

    return `https://mypcards.com/pokemon?ProdutoSearch%5Bquery%5D=${query}`;
}

function getCompactStoreClasses(accent: 'amber' | 'blue', hasPrice: boolean) {
    if (hasPrice) {
        return accent === 'amber'
            ? 'text-amber-400 hover:text-amber-300 hover:underline'
            : 'text-sky-400 hover:text-sky-300 hover:underline';
    }

    return 'text-slate-600 hover:text-slate-500 hover:underline';
}

function SummaryCard({
    label,
    value,
    helper,
    tone,
}: {
    label: string;
    value: string;
    helper?: string;
    tone: 'slate' | 'emerald' | 'amber';
}) {
    const toneClass = {
        slate: 'bg-white/5 border-white/5 text-white',
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    }[tone];

    return (
        <div className={`rounded-[20px] border p-4 ${toneClass}`}>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60">{label}</p>
            <p className="text-lg font-black tracking-tight mt-2">{value}</p>
            {helper && (
                <p className="text-[8px] font-bold uppercase tracking-widest mt-2 opacity-60">{helper}</p>
            )}
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-black text-white tracking-tight">{value}</p>
        </div>
    );
}
