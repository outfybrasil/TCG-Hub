'use client';

import React, { useState, useCallback } from 'react';

interface PriceComparisonProps {
    cardName: string;
    cardSet?: string;
    cardNumber?: string;
    size?: 'sm' | 'md';
    prices?: Record<string, number>;
    currentPrice?: number;
}

interface PriceData {
    tcgplayer: {
        low: number | null;
        mid: number | null;
        high: number | null;
        market: number | null;
        url: string | null;
        currency: string;
        brl: { low: number | null; mid: number | null; high: number | null; market: number | null };
    };
    cardmarket: {
        avg: number | null;
        low: number | null;
        trend: number | null;
        url: string | null;
        currency: string;
        brl: { avg: number | null; low: number | null; trend: number | null };
    };
    manualLinks: {
        ligaPokemon: string;
        mypCards: string;
    };
    fetchedAt: string | null;
}

const formatCurrency = (value: number | null, currency: string) => {
    if (value === null || value === undefined) return '---';
    const symbols: Record<string, string> = { USD: '$', EUR: '€', BRL: 'R$' };
    return `${symbols[currency] || currency} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function PriceComparison({ cardName, cardSet, cardNumber, size = 'md', currentPrice }: PriceComparisonProps) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [error, setError] = useState('');
    const [source, setSource] = useState('');

    const fetchPrices = useCallback(async () => {
        if (priceData || loading) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/prices/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardName, cardSet, cardNumber }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao buscar');
            setPriceData(data.prices);
            setSource(data.source);
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar preços.');
        } finally {
            setLoading(false);
        }
    }, [cardName, cardSet, cardNumber, priceData, loading]);

    const handleToggle = () => {
        const willExpand = !expanded;
        setExpanded(willExpand);
        if (willExpand && !priceData) fetchPrices();
    };

    const handleRefresh = async () => {
        setPriceData(null);
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/prices/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardName, cardSet, cardNumber }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao buscar');
            setPriceData(data.prices);
            setSource(data.source);
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar preços.');
        } finally {
            setLoading(false);
        }
    };

    // Compact mode for card gallery
    if (size === 'sm') {
        return (
            <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-[9px] font-black tracking-tight">
                {currentPrice && (
                    <span className="text-emerald-600 uppercase whitespace-nowrap">
                        Site: R$ {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                )}
                <span className="text-slate-200">|</span>
                <a
                    href={`https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(cardNumber || cardName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-rose-600 hover:underline uppercase whitespace-nowrap transition-colors"
                >
                    Liga →
                </a>
                <span className="text-slate-200">|</span>
                <a
                    href={`https://mypcards.com/pokemon/busca?q=${encodeURIComponent(cardNumber || cardName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-rose-600 hover:underline uppercase whitespace-nowrap transition-colors"
                >
                    MYP →
                </a>
            </div>
        );
    }

    const hasTcgplayer = priceData && (priceData.tcgplayer.market || priceData.tcgplayer.low);
    const hasCardmarket = priceData && (priceData.cardmarket.avg || priceData.cardmarket.low);

    return (
        <div className="space-y-4">
            <button
                onClick={handleToggle}
                className="flex items-center gap-2.5 py-2 px-4 bg-white border border-slate-100 rounded-full shadow-sm hover:border-rose-200 hover:shadow-md transition-all group"
            >
                <span className="text-base animate-pulse">📊</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-rose-600 transition-colors">
                    Comparar com o Mercado
                </span>
                <span className={`text-[10px] text-slate-300 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {expanded && (
                <div className="bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[2rem] p-6 space-y-5 animate-fade-up shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Análise de Mercado Internacional
                        </p>
                        <div className="flex items-center gap-3">
                            {source === 'cache' && (
                                <span className="text-[7px] font-bold text-slate-300 italic">Cache</span>
                            )}
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="text-[8px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 disabled:opacity-30 transition-colors"
                            >
                                {loading ? '...' : '↻ Atualizar'}
                            </button>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center py-8 space-y-4">
                            <div className="h-8 w-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                                Consultando pokemontcg.io...
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">{error}</p>
                        </div>
                    )}

                    {/* Prices loaded */}
                    {priceData && !loading && (
                        <div className="space-y-4">
                            {/* TCGPlayer */}
                            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-[20px] p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">🇺🇸</span>
                                        <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest">TCGPlayer</h4>
                                    </div>
                                    {priceData.tcgplayer.url && (
                                        <a href={priceData.tcgplayer.url} target="_blank" rel="noopener noreferrer"
                                            className="text-[8px] font-black text-blue-500 uppercase tracking-widest hover:underline">
                                            Ver no Site ↗
                                        </a>
                                    )}
                                </div>
                                {hasTcgplayer ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Mínimo', usd: priceData.tcgplayer.low, brl: priceData.tcgplayer.brl.low },
                                            { label: 'Médio', usd: priceData.tcgplayer.mid, brl: priceData.tcgplayer.brl.mid },
                                            { label: 'Mercado', usd: priceData.tcgplayer.market, brl: priceData.tcgplayer.brl.market },
                                            { label: 'Máximo', usd: priceData.tcgplayer.high, brl: priceData.tcgplayer.brl.high },
                                        ].map(item => (
                                            <div key={item.label} className="bg-white/80 border border-blue-50 rounded-2xl px-4 py-3 text-center">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                                <p className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(item.usd, 'USD')}</p>
                                                <p className="text-[9px] font-bold text-blue-500 mt-0.5">≈ {formatCurrency(item.brl, 'BRL')}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center py-2">
                                        Preço não disponível no TCGPlayer
                                    </p>
                                )}
                            </div>

                            {/* Cardmarket */}
                            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-[20px] p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">🇪🇺</span>
                                        <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Cardmarket</h4>
                                    </div>
                                    {priceData.cardmarket.url && (
                                        <a href={priceData.cardmarket.url} target="_blank" rel="noopener noreferrer"
                                            className="text-[8px] font-black text-emerald-500 uppercase tracking-widest hover:underline">
                                            Ver no Site ↗
                                        </a>
                                    )}
                                </div>
                                {hasCardmarket ? (
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Mínimo', eur: priceData.cardmarket.low, brl: priceData.cardmarket.brl.low },
                                            { label: 'Média', eur: priceData.cardmarket.avg, brl: priceData.cardmarket.brl.avg },
                                            { label: 'Tendência', eur: priceData.cardmarket.trend, brl: priceData.cardmarket.brl.trend },
                                        ].map(item => (
                                            <div key={item.label} className="bg-white/80 border border-emerald-50 rounded-2xl px-4 py-3 text-center">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                                <p className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(item.eur, 'EUR')}</p>
                                                <p className="text-[9px] font-bold text-emerald-500 mt-0.5">≈ {formatCurrency(item.brl, 'BRL')}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center py-2">
                                        Preço não disponível no Cardmarket
                                    </p>
                                )}
                            </div>

                            {/* Manual Links */}
                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                                    Busca Manual (Brasil)
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <a
                                        href={priceData.manualLinks.ligaPokemon}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 h-12 bg-yellow-50 hover:bg-yellow-100 border border-yellow-100 rounded-2xl transition-all active:scale-95"
                                    >
                                        <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Liga Pokémon ↗</span>
                                    </a>
                                    <a
                                        href={priceData.manualLinks.mypCards}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 h-12 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl transition-all active:scale-95"
                                    >
                                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">MYP Cards ↗</span>
                                    </a>
                                </div>
                            </div>

                            {/* Timestamp */}
                            {priceData.fetchedAt && (
                                <p className="text-center text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                                    Última consulta: {new Date(priceData.fetchedAt).toLocaleString('pt-BR')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* If not loaded yet and not loading */}
                    {!priceData && !loading && !error && (
                        <div className="text-center py-6">
                            <button
                                onClick={fetchPrices}
                                className="px-6 h-12 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all shadow-lg"
                            >
                                Buscar Preços Agora
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
