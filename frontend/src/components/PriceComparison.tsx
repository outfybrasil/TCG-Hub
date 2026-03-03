'use client';

import React, { useState } from 'react';

interface PriceComparisonProps {
    cardName: string;
    cardSet?: string;
    cardNumber?: string;
    size?: 'sm' | 'md';
}

const sites = [
    {
        name: 'Liga Pokémon',
        shortName: 'Liga',
        icon: '⚡',
        color: 'hover:bg-yellow-400 hover:text-slate-900 hover:border-yellow-300',
        getUrl: (name: string) =>
            `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(name)}`,
    },
    {
        name: 'MYP Cards',
        shortName: 'MYP',
        icon: '🃏',
        color: 'hover:bg-blue-600 hover:text-white hover:border-blue-500',
        getUrl: (name: string) =>
            `https://mypcards.com/busca?q=${encodeURIComponent(name)}`,
    },
    {
        name: 'TCGPlayer',
        shortName: 'TCG',
        icon: '🌍',
        color: 'hover:bg-slate-900 hover:text-white hover:border-slate-800',
        getUrl: (name: string) =>
            `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(name)}&view=grid`,
    },
];

export default function PriceComparison({ cardName, cardSet, cardNumber, size = 'md' }: PriceComparisonProps) {
    const [expanded, setExpanded] = useState(false);
    // Build the most precise search query possible
    const searchName = [cardName, cardNumber, cardSet].filter(Boolean).join(' ');

    if (size === 'sm') {
        return (
            <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ver em:</span>
                {sites.map(site => (
                    <a
                        key={site.name}
                        href={site.getUrl(cardName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Ver preço no ${site.name}`}
                        className={`h-7 px-2.5 flex items-center gap-1 bg-white border border-slate-200 text-slate-600 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${site.color}`}
                    >
                        <span className="text-[10px]">{site.icon}</span>
                        {site.shortName}
                    </a>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors group"
            >
                <span className="text-base">🔎</span>
                Consultar Preço em Outros Sites
                <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {expanded && (
                <div className="border border-dashed border-slate-200 rounded-2xl p-5 space-y-3 animate-fade-up bg-slate-50/50">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Comparando: <span className="text-slate-900">{searchName}</span>
                    </p>
                    <div className="flex flex-col gap-2.5">
                        {sites.map(site => (
                            <a
                                key={site.name}
                                href={site.getUrl(searchName)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-between px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 transition-all group/link ${site.color}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{site.icon}</span>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">{site.name}</p>
                                        <p className="text-[8px] text-slate-400 group-hover/link:text-current font-bold transition-colors">
                                            Clique para buscar no site →
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black opacity-40 group-hover/link:opacity-100 transition-opacity">ABRIR ↗</span>
                            </a>
                        ))}
                    </div>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center pt-1">
                        Os preços são exibidos nos sites externos. Compare e veja o melhor negócio!
                    </p>
                </div>
            )}
        </div>
    );
}
