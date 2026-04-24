"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

interface TcgSet { id: string; name: string; }
interface PokemonCard { id: string; name: string; set_name: string; local_id: string; image_url: string; types?: string[]; }

interface SelectedItem {
    tempId: string;
    cardId?: string;
    name: string;
    set: string;
    number: string;
    price: number;
    originalPrice: number | null;
    quantity: number;
    imageUrl: string;
    condition: string;
    finish: string;
    language: string;
    isPromo: boolean;
    notes: string;
    types: string[];
    is_graded: boolean;
    grading_company: string;
    grading_score: string;
}

export default function NewAssetPage() {
    const [name, setName] = useState('');
    const [selectedSetSearch, setSelectedSetSearch] = useState<string>('');
    const [searching, setSearching] = useState(false);
    const [sets, setSets] = useState<TcgSet[]>([]);
    const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

    const router = useRouter();

    // Mapping languages to TCGdex codes
    const langMap: Record<string, string> = {
        'Português': 'pt',
        'Inglês': 'en',
        'Japonês': 'ja'
    };

    React.useEffect(() => {
        const fetchSets = async () => {
            const { data, error } = await supabase
                .from('pokemon_cards')
                .select('set_id, set_name')
                .order('set_name');

            if (!error && data) {
                const uniqueSets = Array.from(new Map(data.map(item => [item.set_id, { id: item.set_id, name: item.set_name }])).values());
                setSets(uniqueSets as any);
            }
        };
        fetchSets();
    }, []);

    const searchCards = async () => {
        if (!name && !selectedSetSearch) return;
        setSearching(true);
        try {
            let query = supabase.from('pokemon_cards').select('*');
            if (name) query = query.or(`name.ilike.%${name}%,name_en.ilike.%${name}%,name_es.ilike.%${name}%`);
            if (selectedSetSearch) query = query.eq('set_id', selectedSetSearch);

            const { data, error } = await query.limit(150);
            if (!error && data) {
                const sortedData = [...data].sort((a, b) => {
                    const numA = parseInt(a.local_id?.split('/')[0] || '0');
                    const numB = parseInt(b.local_id?.split('/')[0] || '0');
                    return numA - numB;
                });
                setSearchResults(sortedData);
            }
        } finally {
            setSearching(false);
        }
    };

    const addToBasket = (card: PokemonCard) => {
        const existing = selectedItems.find(item => item.cardId === card.id);
        if (existing) {
            updateItem(existing.tempId, { quantity: existing.quantity + 1 });
            return;
        }
        const newItem: SelectedItem = {
            tempId: `${card.id}-${Date.now()}`,
            cardId: card.id,
            name: card.name,
            set: card.set_name,
            number: card.local_id || '',
            price: 0,
            originalPrice: null,
            quantity: 1,
            imageUrl: card.image_url,
            condition: 'NM',
            finish: 'Normal',
            language: 'Português',
            isPromo: false,
            notes: '',
            types: card.types || [],
            is_graded: false,
            grading_company: '',
            grading_score: ''
        };
        setSelectedItems([...selectedItems, newItem]);
    };

    const updateItem = (tempId: string, updates: Partial<SelectedItem>) => {
        setSelectedItems(selectedItems.map(item => 
            item.tempId === tempId ? { ...item, ...updates } : item
        ));
    };

    const removeItem = (tempId: string) => {
        setSelectedItems(selectedItems.filter(item => item.tempId !== tempId));
    };

    const handleSave = async () => {
        if (selectedItems.length === 0) {
            alert('Adicione pelo menos uma carta ao cesto.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const itemsToInsert = selectedItems.map(item => ({
                user_id: user.id,
                name: item.name,
                set: item.set,
                number: item.number,
                price: item.price,
                original_price: item.originalPrice,
                quantity: item.quantity,
                image_url: item.imageUrl,
                condition: item.condition,
                grade: item.condition, // Keep consistent with previous logic
                finish: item.finish,
                language: item.language,
                is_promo: item.isPromo,
                notes: item.notes,
                types: item.types,
                grading_company: item.is_graded ? item.grading_company : null,
                grading_score: item.is_graded ? parseFloat(item.grading_score) : null,
            }));

            const { error } = await supabase.from('inventory').insert(itemsToInsert);

            if (error) throw error;
            alert(`${selectedItems.length} itens salvos no estoque com sucesso!`);
            router.push('/estoque');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar ativos no estoque.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminGuard>
            <div className="min-h-screen bg-slate-900 text-white selection:bg-rose-500/30">
                <div className="max-w-7xl mx-auto px-6 py-20 animate-fade-up">
                    <div className="mb-16 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/10 pb-12">
                        <div className="space-y-4">
                            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
                                Novo <span className="text-rose-600">Estoque (Bulk).</span>
                            </h1>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Adicionar múltiplos itens ao inventário global</p>
                        </div>
                        <div className="flex gap-4">
                            <Link href="/estoque">
                                <button className="h-12 px-8 bg-white/5 text-slate-400 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/5">Cancelar</button>
                            </Link>
                            <button 
                                onClick={handleSave}
                                disabled={loading || selectedItems.length === 0}
                                className="h-12 px-8 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl shadow-rose-600/30 hover:bg-rose-700 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'PUBLICANDO...' : `PUBLICAR ${selectedItems.length} ITENS`}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-12">
                        {/* Search Section */}
                        <div className="bg-white/5 border border-white/10 p-10 md:p-16 rounded-[40px] shadow-2xl backdrop-blur-sm space-y-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/5 blur-[100px] -z-10"></div>
                            
                            <div className="flex items-center gap-4">
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500 whitespace-nowrap">1. Buscar Cartas</h2>
                                <div className="h-[1px] flex-1 bg-white/10" />
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                                <input
                                    type="text"
                                    placeholder="Nome da TCG Card..."
                                    className="flex-1 h-14 px-6 bg-slate-900 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition-all font-bold text-white placeholder:text-slate-600"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchCards()}
                                />
                                <select
                                    value={selectedSetSearch}
                                    onChange={(e) => setSelectedSetSearch(e.target.value)}
                                    className="flex-1 h-14 px-6 bg-slate-900 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition-all font-bold text-white appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-slate-900">Todas as Coleções</option>
                                    {sets.map(set => (
                                        <option key={set.id} value={set.id} className="bg-slate-900">{set.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={searchCards}
                                    disabled={searching}
                                    className="h-14 px-12 bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all disabled:opacity-50 border border-white/5"
                                >
                                    {searching ? 'Buscando...' : 'Buscar'}
                                </button>
                            </div>

                            {searchResults.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 max-h-[500px] overflow-y-auto pr-4 animate-fade-in custom-scrollbar">
                                    {searchResults.map((card) => {
                                        const isSelected = selectedItems.some(item => item.cardId === card.id);
                                        return (
                                        <div
                                            key={card.id}
                                            onClick={() => addToBasket(card)}
                                            className={`bg-white/5 border p-3 rounded-3xl cursor-pointer transition-all group relative ${
                                                isSelected 
                                                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20' 
                                                    : 'border-white/5 hover:border-rose-500 hover:bg-white/10'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                                                <div className={`${isSelected ? 'bg-emerald-500' : 'bg-rose-600'} text-white p-1.5 rounded-full shadow-xl transform group-hover:scale-110`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                                </div>
                                            </div>
                                            <div className="aspect-[3/4] relative mb-3">
                                                <img src={card.image_url} alt={card.name} className={`w-full h-full object-contain rounded-xl shadow-lg transition-transform duration-500 ${isSelected ? 'opacity-50' : 'group-hover:scale-105'}`} />
                                            </div>
                                            <p className="text-[10px] font-black text-white truncate px-1">{card.name}</p>
                                            <p className="text-[8px] font-bold text-slate-500 truncate uppercase mt-0.5 px-1">{card.set_name}</p>
                                            {isSelected && (
                                                <p className="text-[8px] font-black text-emerald-500 uppercase mt-1 px-1">✓ Selecionada</p>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    {/* Selection Basket */}
                    {selectedItems.length > 0 && (
                        <div className="bg-white/5 border border-white/10 p-10 md:p-16 rounded-[40px] shadow-2xl backdrop-blur-sm space-y-10 relative overflow-hidden animate-fade-up">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[100px] -z-10"></div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500 whitespace-nowrap">2. Cesto de Seleção ({selectedItems.length})</h2>
                                    <div className="h-[1px] flex-1 bg-white/10" />
                                </div>
                            </div>

                            <div className="overflow-x-auto -mx-10 md:-mx-16">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="px-10 md:px-16 text-left py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Carta</th>
                                            <th className="text-left py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Qtd</th>
                                            <th className="text-left py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Preço Sugerido (R$)</th>
                                            <th className="text-left py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Condição</th>
                                            <th className="text-left py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Idioma / Finish</th>
                                            <th className="text-left py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Grading</th>
                                            <th className="px-10 md:px-16 text-right py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {selectedItems.map((item) => (
                                            <tr key={item.tempId} className="group hover:bg-white/5 transition-colors">
                                                <td className="px-10 md:px-16 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-16 w-12 flex-shrink-0">
                                                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain rounded-md shadow-2xl transition-transform group-hover:scale-110" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm text-white uppercase tracking-tight">{item.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{item.set} #{item.number}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-6">
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={item.quantity} 
                                                        onChange={(e) => updateItem(item.tempId, { quantity: parseInt(e.target.value) || 1 })}
                                                        className="w-16 h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-center text-sm font-black text-white focus:border-rose-600 outline-none transition-all"
                                                    />
                                                </td>
                                                <td className="py-6">
                                                    <div className="flex flex-col gap-2">
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            placeholder="Venda"
                                                            value={item.price} 
                                                            onChange={(e) => updateItem(item.tempId, { price: parseFloat(e.target.value) || 0 })}
                                                            className="w-24 h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black text-rose-500 focus:border-rose-600 outline-none transition-all"
                                                        />
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            placeholder="Original"
                                                            value={item.originalPrice || ''} 
                                                            onChange={(e) => updateItem(item.tempId, { originalPrice: parseFloat(e.target.value) || null })}
                                                            className="w-24 h-10 px-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 focus:border-white/20 outline-none transition-all placeholder:text-slate-700"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-6">
                                                    <select 
                                                        value={item.condition}
                                                        onChange={(e) => updateItem(item.tempId, { condition: e.target.value })}
                                                        className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white focus:border-rose-600 outline-none transition-all cursor-pointer appearance-none"
                                                    >
                                                        <option value="M" className="bg-slate-900">Mint</option>
                                                        <option value="NM" className="bg-slate-900">Near Mint</option>
                                                        <option value="LP" className="bg-slate-900">Lightly Played</option>
                                                        <option value="MP" className="bg-slate-900">Moderately Played</option>
                                                        <option value="HP" className="bg-slate-900">Heavily Played</option>
                                                        <option value="Dmg" className="bg-slate-900">Damaged</option>
                                                    </select>
                                                </td>
                                                <td className="py-6">
                                                    <div className="flex flex-col gap-2">
                                                        <select 
                                                            value={item.language}
                                                            onChange={(e) => updateItem(item.tempId, { language: e.target.value })}
                                                            className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white focus:border-rose-600 outline-none transition-all cursor-pointer appearance-none"
                                                        >
                                                            <option className="bg-slate-900">Português</option>
                                                            <option className="bg-slate-900">Inglês</option>
                                                            <option className="bg-slate-900">Japonês</option>
                                                        </select>
                                                        <select 
                                                            value={item.finish}
                                                            onChange={(e) => updateItem(item.tempId, { finish: e.target.value })}
                                                            className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white focus:border-rose-600 outline-none transition-all cursor-pointer appearance-none"
                                                        >
                                                            <option className="bg-slate-900">Normal</option>
                                                            <option className="bg-slate-900">Foil / Holo</option>
                                                            <option className="bg-slate-900">Reverse Holo</option>
                                                            <option className="bg-slate-900">Full Art</option>
                                                            <option className="bg-slate-900">Alternative Art</option>
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="py-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateItem(item.tempId, {
                                                                is_graded: !item.is_graded,
                                                                grading_company: !item.is_graded ? 'PSA' : '',
                                                                grading_score: !item.is_graded ? '10' : ''
                                                            })}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
                                                                item.is_graded
                                                                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                                                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <div className={`w-7 h-4 rounded-full relative transition-colors ${
                                                                item.is_graded ? 'bg-amber-500' : 'bg-slate-700'
                                                            }`}>
                                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                                                                    item.is_graded ? 'left-3.5' : 'left-0.5'
                                                                }`} />
                                                            </div>
                                                            {item.is_graded ? 'Gradada' : 'Sem Grade'}
                                                        </button>
                                                        {item.is_graded && (
                                                            <div className="flex gap-1.5 animate-fade-in">
                                                                <select
                                                                    value={item.grading_company}
                                                                    onChange={(e) => updateItem(item.tempId, { grading_company: e.target.value })}
                                                                    className="h-8 px-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9px] font-black text-amber-500 outline-none cursor-pointer"
                                                                >
                                                                    <option value="PSA" className="bg-slate-900">PSA</option>
                                                                    <option value="CGC" className="bg-slate-900">CGC</option>
                                                                    <option value="BGS" className="bg-slate-900">BGS</option>
                                                                    <option value="TAG" className="bg-slate-900">TAG</option>
                                                                    <option value="ACE" className="bg-slate-900">ACE</option>
                                                                </select>
                                                                <select
                                                                    value={item.grading_score}
                                                                    onChange={(e) => updateItem(item.tempId, { grading_score: e.target.value })}
                                                                    className="h-8 px-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9px] font-black text-amber-500 outline-none cursor-pointer"
                                                                >
                                                                    <option value="10" className="bg-slate-900">10</option>
                                                                    <option value="9.5" className="bg-slate-900">9.5</option>
                                                                    <option value="9" className="bg-slate-900">9</option>
                                                                    <option value="8.5" className="bg-slate-900">8.5</option>
                                                                    <option value="8" className="bg-slate-900">8</option>
                                                                    <option value="7.5" className="bg-slate-900">7.5</option>
                                                                    <option value="7" className="bg-slate-900">7</option>
                                                                    <option value="6.5" className="bg-slate-900">6.5</option>
                                                                    <option value="6" className="bg-slate-900">6</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-10 md:px-16 py-6 text-right">
                                                    <button 
                                                        onClick={() => removeItem(item.tempId)}
                                                        className="h-10 w-10 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all ml-auto"
                                                        title="Remover"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumo do Lançamento_</p>
                                    <p className="text-xl font-black text-white uppercase tabular-nums">{selectedItems.reduce((acc, curr) => acc + curr.quantity, 0)} Ativos no total</p>
                                </div>
                                <button 
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="h-16 px-12 bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl shadow-rose-600/30 hover:bg-rose-700 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? 'PROCESSANDO...' : 'FINALIZAR E PUBLICAR NO ESTOQUE'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminGuard>
    );
}
