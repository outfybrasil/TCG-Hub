"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Filter, LayoutGrid, List, SlidersHorizontal, ShoppingCart, Star, RotateCcw } from 'lucide-react';
import { EDITIONS } from '../_data';
import { motion, AnimatePresence } from 'framer-motion';

// Aceita tanto inglês (EN) quanto português (PT) direto da API TCGdex
const RARITY_MAP: Record<string, string> = {
    // Inglês → Português
    'Common': 'Comum',
    'Uncommon': 'Incomum',
    'Rare': 'Rara',
    'Double Rare': 'Rara Dupla',
    'Ultra Rare': 'Ultra Rara',
    'Illustration Rare': 'Ilustração Rara',
    'Special Illustration Rare': 'Ilustração Rara Especial',
    'Hyper Rare': 'Rara Hiper',
    'Rare Holo': 'Rara Holo',
    'Promo': 'Promocional',
    'Rare ACE': 'Rara ACE',
    'Radiant Rare': 'Radiante',
    'Mega Attack Rare': 'Mega Attack Rare',
    // Português → Português (pass-through para raridades já salvas em PT)
    'Comum': 'Comum',
    'Incomum': 'Incomum',
    'Rara': 'Rara',
    'Rara Dupla': 'Rara Dupla',
    'Ultra Rara': 'Ultra Rara',
    'Ilustração Rara': 'Ilustração Rara',
    'Ilustração Rara Especial': 'Ilustração Rara Especial',
    'Rara Hiper': 'Rara Hiper',
    'Rara Holo': 'Rara Holo',
    'Promocional': 'Promocional',
    'Rara ACE': 'Rara ACE',
    'Radiante': 'Radiante',
};

const TYPE_MAP: Record<string, string> = {
    // Inglês → Português
    'Colorless': 'Incolor',
    'Darkness': 'Escuridão',
    'Fighting': 'Luta',
    'Fire': 'Fogo',
    'Grass': 'Planta',
    'Lightning': 'Raios',
    'Metal': 'Metal',
    'Psychic': 'Psíquica',
    'Water': 'Água',
    'Dragon': 'Dragão',
    'Fairy': 'Fada',
    'Energy': 'Energia',
    // Português → Português (pass-through para tipos já em PT)
    'Incolor': 'Incolor',
    'Escuridão': 'Escuridão',
    'Luta': 'Luta',
    'Fogo': 'Fogo',
    'Planta': 'Planta',
    'Raios': 'Raios',
    'Psíquica': 'Psíquica',
    'Água': 'Água',
    'Dragão': 'Dragão',
    'Fada': 'Fada',
    'Energia': 'Energia',
};

interface PokemonCard {
    id: string;
    name: string;
    name_en?: string;
    set_id: string;
    set_name: string;
    local_id: string;
    image_url: string;
    rarity: string;
    types: string[];
}

export default function EditionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [cards, setCards] = useState<PokemonCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('number-asc');

    // Build flat set list with named fields for clarity
    const allSets = useMemo(() =>
        EDITIONS.flatMap(y => y.sets.map(([name, code, alias]) => ({ name, code, alias, year: y.year })))
    , []);

    // Try to find by primary code first, then by alias (backward compat)
    const currentIndex = useMemo(() => {
        let idx = allSets.findIndex(s => s.code === id);
        if (idx === -1) idx = allSets.findIndex(s => s.alias === id);
        return idx;
    }, [allSets, id]);
    const currentSet = allSets[currentIndex] ?? null;
    const primaryCode = currentSet ? currentSet.code : id; // resolved TCGdex ID
    const prevSet = currentIndex > 0 ? allSets[currentIndex - 1] : null;
    const nextSet = currentIndex < allSets.length - 1 ? allSets[currentIndex + 1] : null;

    // If the URL is using an alias, redirect to the canonical primary code
    useEffect(() => {
        if (currentSet && currentSet.code !== id) {
            router.replace(`/edicoes/${currentSet.code}`);
        }
    }, [currentSet, id, router]);

    const CACHE_TTL = 24 * 60 * 60 * 1000;
    const cacheKey = `tcg_cards_${primaryCode}`;

    const fetchCards = async (forceRefresh = false) => {
        // If URL is an alias, wait for redirect — don't fetch with wrong key
        if (currentSet && currentSet.code !== id) return;

        if (forceRefresh) {
            setRefreshing(true);
            setCards([]);
            // Clear both old alias key and current key to avoid stale data
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(`tcg_cards_${id}`);
        } else {
            setLoading(true);
        }

        try {
            // Check cache with the canonical key
            if (!forceRefresh) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const { data: cachedData, timestamp } = JSON.parse(cached);
                        if (Date.now() - timestamp < CACHE_TTL && cachedData?.length > 0) {
                            setCards(cachedData);
                            setLoading(false);
                            return;
                        }
                    } catch {
                        localStorage.removeItem(cacheKey);
                    }
                }
            }

            // Query by primary TCGdex code
            let { data, error } = await supabase
                .from('pokemon_cards')
                .select('id, name, name_en, set_id, set_name, local_id, image_url, rarity, types')
                .eq('set_id', primaryCode)
                .order('local_id', { ascending: true });

            // Fallback: if primary returns nothing, try the alias (old code)
            if (!error && (!data || data.length === 0) && currentSet?.alias && currentSet.alias !== primaryCode) {
                const fallback = await supabase
                    .from('pokemon_cards')
                    .select('id, name, name_en, set_id, set_name, local_id, image_url, rarity, types')
                    .eq('set_id', currentSet.alias)
                    .order('local_id', { ascending: true });
                if (!fallback.error && fallback.data && fallback.data.length > 0) {
                    data = fallback.data;
                    error = null;
                }
            }

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            const result = data || [];
            setCards(result);

            // Só salva no cache se tiver dados válidos
            if (result.length > 0) {
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        data: result,
                        timestamp: Date.now()
                    }));
                } catch { /* localStorage cheio */ }
            }
        } catch (err) {
            console.error('Error fetching cards:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (id) fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);


    // Derived filters with counts
    const rarityStats = useMemo(() => {
        const counts: Record<string, number> = {};
        cards.forEach(c => {
            const rawRarity = c.rarity || 'Outras';
            const r = RARITY_MAP[rawRarity] || rawRarity;
            counts[r] = (counts[r] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [cards]);

    const typeStats = useMemo(() => {
        const counts: Record<string, number> = {};
        cards.forEach(c => {
            const types = c.types && c.types.length > 0 ? c.types : ['Energia']; // Default to Energia if no type (like trainers/energies)
            types.forEach(rawType => {
                const t = TYPE_MAP[rawType] || rawType;
                counts[t] = (counts[t] || 0) + 1;
            });
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [cards]);

    const filteredCards = useMemo(() => {
        let result = cards.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                c.local_id.includes(searchQuery);
            const rawRarity = c.rarity || 'Outras';
            const translatedRarity = RARITY_MAP[rawRarity] || rawRarity;
            const matchesRarity = selectedRarities.length === 0 || selectedRarities.includes(translatedRarity);
            
            const cardTypes = c.types && c.types.length > 0 ? c.types : ['Energy'];
            const translatedTypes = cardTypes.map(t => TYPE_MAP[t] || t);
            const matchesType = selectedTypes.length === 0 || translatedTypes.some(t => selectedTypes.includes(t));
            
            return matchesSearch && matchesRarity && matchesType;
        });

        // Sorting
        result.sort((a, b) => {
            const numA = parseInt(a.local_id.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.local_id.replace(/\D/g, '')) || 0;

            switch (sortBy) {
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'number-asc': return numA - numB || a.local_id.localeCompare(b.local_id);
                case 'number-desc': return numB - numA || b.local_id.localeCompare(a.local_id);
                default: return 0;
            }
        });

        return result;
    }, [cards, searchQuery, selectedRarities, selectedTypes, sortBy]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0c1324]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Carregando Coleção...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0c1324] text-white">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-[#0f172a] border-b border-white/5">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                
                <div className="max-w-[1600px] mx-auto px-6 py-12 relative">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        {/* Nav Left */}
                        <div className="hidden lg:block w-72">
                            {prevSet && (
                                <Link href={`/edicoes/${prevSet.code}`} className="group flex items-center gap-4 p-3 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center group-hover:bg-rose-600 transition-colors shadow-xl">
                                        <ChevronLeft className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Anterior</p>
                                        <p className="text-xs font-black text-slate-200 truncate">{prevSet.name}</p>
                                    </div>
                                </Link>
                            )}
                        </div>

                        {/* Center Info */}
                        <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-3">
                                <div className="h-px w-8 bg-rose-600/30" />
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">{currentSet?.year}</span>
                                <div className="h-px w-8 bg-rose-600/30" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">{currentSet?.name}</h1>
                            <div className="flex items-center justify-center gap-6">
                                <div className="flex flex-col items-center">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Cards</p>
                                    <p className="text-sm font-black text-slate-200">{cards.length}</p>
                                </div>
                                <div className="w-px h-6 bg-white/5" />
                                <div className="flex flex-col items-center">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Código</p>
                                    <p className="text-sm font-black text-rose-500">{id.toUpperCase()}</p>
                                </div>
                                <div className="w-px h-6 bg-white/5" />
                                <div className="flex flex-col items-center">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Data</p>
                                    <p className="text-sm font-black text-slate-200">2026</p>
                                </div>
                            </div>
                        </div>

                        {/* Nav Right */}
                        <div className="hidden lg:block w-72 text-right">
                            {nextSet && (
                                <Link href={`/edicoes/${nextSet.code}`} className="group flex items-center gap-4 p-3 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Próxima</p>
                                        <p className="text-xs font-black text-slate-200 truncate">{nextSet.name}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center group-hover:bg-rose-600 transition-colors shadow-xl">
                                        <ChevronRight className="w-6 h-6" />
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
                {/* Sidebar Filters */}
                <aside className="w-full lg:w-80 shrink-0 space-y-8">
                    <div className="bg-[#0f172a] border border-white/5 rounded-[40px] p-8 space-y-10 sticky top-32">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-xl bg-rose-600/10 flex items-center justify-center">
                                    <Filter className="w-4 h-4 text-rose-500" />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.2em]">Filtros</h2>
                            </div>
                            
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                <input 
                                    type="text" 
                                    placeholder="Procurar Card..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold placeholder:text-slate-600 outline-none focus:border-rose-600 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <Star className="w-3 h-3 text-rose-500 fill-rose-500/20" />
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Raridade</label>
                                </div>
                                {selectedRarities.length > 0 && (
                                    <button onClick={() => setSelectedRarities([])} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Limpar</button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {rarityStats.map(([rarity, count]) => (
                                    <button
                                        key={rarity}
                                        onClick={() => setSelectedRarities(prev => 
                                            prev.includes(rarity) ? prev.filter(r => r !== rarity) : [...prev, rarity]
                                        )}
                                        className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                                            selectedRarities.includes(rarity)
                                                ? 'bg-rose-600/10 border-rose-600/30 text-rose-500'
                                                : 'bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300'
                                        }`}
                                    >
                                        <span>{rarity}</span>
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] ${selectedRarities.includes(rarity) ? 'bg-rose-600 text-white' : 'bg-white/5 text-slate-600'}`}>{count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <Star className="w-3 h-3 text-rose-500 fill-rose-500/20" />
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Energia / Tipo</label>
                                </div>
                                {selectedTypes.length > 0 && (
                                    <button onClick={() => setSelectedTypes([])} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Limpar</button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {typeStats.map(([type, count]) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedTypes(prev => 
                                            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                                        )}
                                        className={`flex flex-col gap-1 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                            selectedTypes.includes(type)
                                                ? 'bg-blue-600/10 border-blue-600/30 text-blue-500'
                                                : 'bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300'
                                        }`}
                                    >
                                        <span>{type}</span>
                                        <span className="text-[8px] opacity-40">{count} cards</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 space-y-10">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#0f172a] border border-white/5 p-6 rounded-[32px]">
                        <div className="flex items-center gap-3">
                            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-transparent border-none text-[10px] font-black uppercase tracking-[0.2em] text-slate-200 outline-none cursor-pointer focus:text-rose-500 transition-colors"
                            >
                                <option value="number-asc">Numeração [0-9]</option>
                                <option value="number-desc">Numeração [9-0]</option>
                                <option value="name-asc">Nome [A-Z]</option>
                                <option value="name-desc">Nome [Z-A]</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                             <button
                                onClick={() => fetchCards(true)}
                                disabled={refreshing}
                                title="Forçar atualização dos dados"
                                className="h-10 px-3 bg-white/5 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                            >
                                <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                                {refreshing ? 'Atualizando...' : 'Atualizar'}
                            </button>
                             <div className="h-10 px-4 bg-white/5 rounded-xl flex items-center gap-3">
                                <LayoutGrid className="w-4 h-4 text-rose-500" />
                                <span className="w-px h-4 bg-white/10" />
                                <List className="w-4 h-4 text-slate-600 hover:text-white transition-colors cursor-pointer" />
                             </div>
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:block">
                                {filteredCards.length} de {cards.length} cards
                            </p>
                        </div>
                    </div>

                    {/* Card Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                        <AnimatePresence mode="popLayout">
                            {filteredCards.map((card, idx) => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: idx * 0.02 }}
                                    key={card.id} 
                                    className="group"
                                >
                                    <div className="relative aspect-[2/2.8] rounded-[24px] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:-translate-y-3 group-hover:shadow-rose-600/30 group-hover:border-rose-500/50">
                                        <img 
                                            src={card.image_url} 
                                            alt={card.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                                                <p className="text-[9px] font-black text-white/80 tracking-widest uppercase">#{card.local_id}</p>
                                            </div>
                                        </div>
                                        <Link href={`/edicoes/card/${card.id}`} className="absolute inset-0 z-10" />
                                    </div>

                                    <div className="mt-5 space-y-4">
                                        <div className="px-1">
                                            <h3 className="text-xs font-black text-slate-100 truncate group-hover:text-rose-500 transition-colors uppercase tracking-tight">{card.name}</h3>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1.5">
                                                {RARITY_MAP[card.rarity] || card.rarity || 'Comum'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Menor</p>
                                                <p className="text-[11px] font-black text-slate-300 tracking-tighter">R$ 0,17</p>
                                            </div>
                                            <div className="text-right border-l border-white/5 pl-3">
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Médio</p>
                                                <p className="text-[11px] font-black text-rose-500 tracking-tighter">R$ 2,25</p>
                                            </div>
                                        </div>

                                        <button className="w-full h-11 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:border-rose-500 transition-all flex items-center justify-center gap-2 group/btn">
                                            <ShoppingCart className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" /> 
                                            LISTA DE COMPRAS
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {filteredCards.length === 0 && (
                        <div className="py-32 text-center space-y-6">
                            <div className="w-24 h-24 bg-rose-600/10 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-rose-500/20">
                                <Search className="w-10 h-10 text-rose-500" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Nenhum card encontrado</h3>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest max-w-xs mx-auto">Tente ajustar seus filtros para encontrar o que procura nesta coleção</p>
                            <button 
                                onClick={() => { setSearchQuery(''); setSelectedRarities([]); setSelectedTypes([]); }}
                                className="px-10 h-14 bg-rose-600 text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-600/30 hover:bg-rose-700 transition-all active:scale-95"
                            >
                                Limpar Todos os Filtros
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
