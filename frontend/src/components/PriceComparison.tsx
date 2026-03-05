'use client';

import React, { useState } from 'react';

interface PriceComparisonProps {
    cardName: string;
    cardSet?: string;
    cardNumber?: string;
    size?: 'sm' | 'md';
    prices?: Record<string, number>;
    currentPrice?: number;
}

const sites = [
    {
        name: 'Liga Pokémon',
        shortName: 'Liga',
        defaultColor: 'hover:bg-yellow-400 hover:text-slate-900 hover:border-yellow-300',
        getUrl: (name: string, number?: string) =>
            `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(number || name)}`,
    },
    {
        name: 'MYP Cards',
        shortName: 'MYP',
        defaultColor: 'hover:bg-blue-600 hover:text-white hover:border-blue-500',
        getUrl: (name: string, number?: string) =>
            `https://mypcards.com/pokemon/busca?q=${encodeURIComponent(number || name)}`,
    },
];

export default function PriceComparison({ cardName, cardSet, cardNumber, size = 'md', prices = {}, currentPrice }: PriceComparisonProps) {
    const [expanded, setExpanded] = useState(false);
    // Build the most precise search query possible
    const searchName = [cardName, cardNumber, cardSet].filter(Boolean).join(' ');

    const getRankedStyles = (storeName: string, price: number) => {
        const allPrices: { name: string; price: number }[] = [];
        if (currentPrice) allPrices.push({ name: 'TCG Hub', price: currentPrice });
        Object.entries(prices).forEach(([name, val]) => {
            if (val > 0) allPrices.push({ name, price: val });
        });

        if (allPrices.length < 2) return {
            bg: 'bg-white border-slate-100 text-slate-400',
            label: '---'
        };

        const sorted = [...allPrices].sort((a, b) => a.price - b.price);
        const rank = sorted.findIndex(p => p.price === price);

        if (rank === 0) return {
            bg: 'bg-emerald-50 border-emerald-100 text-emerald-600',
            label: 'MELHOR'
        };
        if (rank === sorted.length - 1) return {
            bg: 'bg-rose-50 border-rose-100 text-rose-600',
            label: 'CARO'
        };
        return {
            bg: 'bg-amber-50 border-amber-100 text-amber-600',
            label: 'MÉDIO'
        };
    };

    if (size === 'sm') {
        const allSources = [
            { name: 'TCG Hub', shortName: 'Site' },
            ...sites.map(s => ({ ...s }))
        ];

        return (
            <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-[9px] font-black tracking-tight">
                {allSources.map((source, idx) => {
                    const price = source.name === 'TCG Hub' ? currentPrice : prices[source.name];
                    const styles = price ? getRankedStyles(source.name, price) : { bg: 'text-slate-300', label: '' };

                    const isExternal = source.name !== 'TCG Hub';
                    const site = isExternal ? sites.find(s => s.name === source.name) : null;

                    return (
                        <React.Fragment key={source.name}>
                            {idx > 0 && <span className="text-slate-200">|</span>}
                            {site ? (
                                <a
                                    href={site.getUrl(cardName, cardNumber)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline transition-all hover:brightness-75"
                                >
                                    <span className={`${styles.bg.split(' ')[2]} whitespace-nowrap uppercase`}>
                                        {source.shortName}: R$ {price ? price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                                    </span>
                                </a>
                            ) : (
                                <span className={`${styles.bg.split(' ')[2]} whitespace-nowrap uppercase`}>
                                    {source.shortName}: R$ {price ? price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                                </span>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center gap-2.5 py-2 px-4 bg-white border border-slate-100 rounded-full shadow-sm hover:border-rose-200 hover:shadow-md transition-all group"
            >
                <span className="text-base animate-pulse">📊</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-rose-600 transition-colors">
                    Comparar com o Mercado
                </span>
                <span className={`text-[10px] text-slate-300 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {expanded && (
                <div className="bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[2rem] p-6 space-y-4 animate-fade-up shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Análise de Mercado
                        </p>
                        <span className="text-[8px] font-bold text-slate-300 italic">Preços em tempo real</span>
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* Current Site Price first for reference */}
                        {currentPrice && (
                            <div className={`flex items-center justify-between px-5 py-4 border rounded-2xl ${getRankedStyles('TCG Hub', currentPrice).bg}`}>
                                <div className="flex items-center gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Meu Site (TCG Hub)</p>
                                        <p className="text-[8px] font-bold opacity-70">
                                            Seu valor de venda atual
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black tracking-tight">R$ {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    <p className="text-[7px] font-black uppercase opacity-60 tracking-widest">{getRankedStyles('TCG Hub', currentPrice).label}</p>
                                </div>
                            </div>
                        )}

                        <div className="h-[1px] bg-slate-100 my-1"></div>

                        {sites.map(site => {
                            const price = prices[site.name];
                            const sourceStyles = price ? getRankedStyles(site.name, price) : { bg: 'bg-white border-slate-100 text-slate-900', label: 'BUSCAR' };

                            return (
                                <a
                                    key={site.name}
                                    href={site.getUrl(searchName, cardNumber)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center justify-between px-5 py-4 border rounded-2xl transition-all duration-300 group/link active:scale-95 ${sourceStyles.bg} hover:shadow-lg`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest">{site.name}</p>
                                            <p className="text-[8px] font-bold opacity-60 group-hover/link:opacity-100">
                                                {price ? `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - Ver anúncio →` : 'Clique para buscar no site →'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {price && <p className="text-xl font-black tracking-tighter leading-none">R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                                        <p className="text-[8px] font-black uppercase opacity-60 tracking-widest mt-1.5">
                                            {sourceStyles.label} ↗
                                        </p>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
