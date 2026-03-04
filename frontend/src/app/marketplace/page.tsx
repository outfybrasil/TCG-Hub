"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CardGallery from '@/components/CardGallery';
import FilterSidebar from '@/components/FilterSidebar';

export default function MarketplacePage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCards = async () => {
            const { data, error } = await supabase
                .from('enriched_inventory')
                .select('*')
                .order('price', { ascending: false });

            if (data) setCards(data);
            setLoading(false);
        };

        fetchCards();

        // Real-time subscription for inventory changes
        const channel = supabase
            .channel('inventory-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setCards(prev => prev.map(card =>
                        card.id === payload.new.id ? { ...card, ...payload.new } : card
                    ));
                } else if (payload.eventType === 'INSERT') {
                    setCards(prev => [...prev, payload.new]);
                } else if (payload.eventType === 'DELETE') {
                    setCards(prev => prev.filter(card => card.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredCards = cards.filter(card =>
        card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.set?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.official_set_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.local_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        <span>Exibindo {filteredCards.length} Ativos Premium</span>
                        <div className="flex gap-6 items-center">
                            <span>Ordem: Valor (Maior)</span>
                            <span className="cursor-pointer text-rose-600 hover:text-rose-700">Alterar</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-96 bg-slate-50 animate-pulse rounded-2xl border border-slate-100" />
                            ))}
                        </div>
                    ) : (
                        <CardGallery cards={filteredCards.map(c => ({
                            id: c.id,
                            name: c.official_name || c.name,
                            set: c.official_set_name || c.set || 'Desconhecido',
                            imageUrl: c.official_image_url || c.image_url || 'https://images.pokemontcg.io/base1/1.png',
                            price: c.price,
                            grade: c.grade,
                            finish: c.finish,
                            isPromo: c.is_promo || c.isPromo,
                            quantity: c.quantity ?? 1
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

