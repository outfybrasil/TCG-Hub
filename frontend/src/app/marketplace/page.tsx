"use client";

import React, { useState } from 'react';
import CardGallery from '@/components/CardGallery';
import FilterSidebar from '@/components/FilterSidebar';

const MOCK_CARDS = [
    { id: '1', name: 'Charizard', set: 'Base Set', imageUrl: 'https://images.pokemontcg.io/base1/4.png', price: 12500, grade: '10', finish: 'Holo' },
    { id: '2', name: 'Pikachu', set: 'Base Set', imageUrl: 'https://images.pokemontcg.io/base1/58.png', price: 450, grade: '9', isPromo: true },
    { id: '3', name: 'Mewtwo', set: 'Base Set', imageUrl: 'https://images.pokemontcg.io/base1/10.png', price: 2800, grade: '8.5', finish: 'Holo' },
    { id: '4', name: 'Blastoise', set: 'Base Set', imageUrl: 'https://images.pokemontcg.io/base1/2.png', price: 8900, grade: '7', finish: 'Holo' },
];

export default function MarketplacePage() {
    const [searchTerm, setSearchTerm] = useState('');

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
                        <FilterSidebar />
                    </div>
                </aside>

                {/* Results Area */}
                <main className="flex-1 space-y-12">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-6">
                        <span>Exibindo 120 Ativos Premium</span>
                        <div className="flex gap-6 items-center">
                            <span>Ordem: Valor (Maior)</span>
                            <span className="cursor-pointer text-rose-600 hover:text-rose-700">Alterar</span>
                        </div>
                    </div>

                    <CardGallery cards={MOCK_CARDS} />

                    <div className="pt-20 text-center">
                        <button className="h-14 px-12 border border-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-900 hover:text-white transition-all">Carregar Mais Ativos</button>
                    </div>
                </main>
            </div>
        </div>
    );
}
