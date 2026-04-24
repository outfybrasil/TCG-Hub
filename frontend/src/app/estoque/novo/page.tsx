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
            <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up">
                <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Novo <span className="text-rose-600">Estoque (Bulk).</span></h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Adicionar múltiplos itens ao inventário global</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/estoque">
                            <button className="h-12 px-8 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
                        </Link>
                        <button 
                            onClick={handleSave}
                            disabled={loading || selectedItems.length === 0}
                            className="h-12 px-8 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all transform hover:-translate-y-1 disabled:opacity-50"
                        >
                            {loading ? 'PUBLICANDO...' : `PUBLICAR ${selectedItems.length} ITENS`}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-12">
                    {/* Search Section */}
                    <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm space-y-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">1. Buscar Cartas</h2>
                            <div className="h-[1px] flex-1 bg-slate-100" />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <input
                                type="text"
                                placeholder="Nome da TCG Card..."
                                className="flex-1 h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-bold text-slate-900"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchCards()}
                            />
                            <select
                                value={selectedSetSearch}
                                onChange={(e) => setSelectedSetSearch(e.target.value)}
                                className="flex-1 h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-bold text-slate-900 appearance-none cursor-pointer"
                            >
                                <option value="">Todas as Coleções</option>
                                {sets.map(set => (
                                    <option key={set.id} value={set.id}>{set.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={searchCards}
                                disabled={searching}
                                className="h-14 px-12 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all disabled:opacity-50 shadow-xl"
                            >
                                {searching ? 'Buscando...' : 'Buscar'}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 max-h-[500px] overflow-y-auto p-2 animate-fade-in">
                                {searchResults.map((card) => {
                                    const isSelected = selectedItems.some(item => item.cardId === card.id);
                                    return (
                                    <div
                                        key={card.id}
                                        onClick={() => addToBasket(card)}
                                        className={`bg-white border p-3 rounded-3xl cursor-pointer transition-all group relative ${
                                            isSelected 
                                                ? 'border-emerald-400 bg-emerald-50/30 ring-2 ring-emerald-200' 
                                                : 'border-slate-100 hover:border-rose-500 hover:shadow-2xl'
                                        }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white p-1 rounded-full shadow">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <div className={`${isSelected ? 'bg-emerald-500' : 'bg-rose-600'} text-white p-1.5 rounded-full shadow-lg`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                            </div>
                                        </div>
                                        <div className="aspect-[3/4] relative mb-3">
                                            <img src={card.image_url} alt={card.name} className={`w-full h-full object-contain rounded-xl shadow-md transition-transform duration-500 ${isSelected ? 'opacity-70' : 'group-hover:scale-105'}`} />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-900 truncate px-1">{card.name}</p>
                                        <p className="text-[8px] font-bold text-slate-400 truncate uppercase mt-0.5 px-1">{card.set_name}</p>
                                        {isSelected && (
                                            <p className="text-[8px] font-black text-emerald-600 uppercase mt-1 px-1">✓ Selecionada (clique para +1)</p>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Selection Basket */}
                    {selectedItems.length > 0 && (
                        <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm space-y-8 animate-fade-up">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">2. Cesto de Seleção ({selectedItems.length})</h2>
                                    <div className="h-[1px] flex-1 bg-slate-100" />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Carta</th>
                                            <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Qtd</th>
                                            <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço Sugerido (R$)</th>
                                            <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Condição</th>
                                            <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Idioma / Finish</th>
                                            <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Grading</th>
                                            <th className="text-right py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {selectedItems.map((item) => (
                                            <tr key={item.tempId} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-16 w-12 flex-shrink-0">
                                                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain rounded-md shadow-sm" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm text-slate-900">{item.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{item.set} #{item.number}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-6">
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={item.quantity} 
                                                        onChange={(e) => updateItem(item.tempId, { quantity: parseInt(e.target.value) || 1 })}
                                                        className="w-16 h-10 px-3 bg-slate-100 border-transparent rounded-xl text-center text-sm font-black focus:bg-white focus:border-rose-500 outline-none transition-all"
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
                                                            className="w-24 h-10 px-3 bg-slate-100 border-transparent rounded-xl text-sm font-black focus:bg-white focus:border-rose-500 outline-none transition-all text-rose-600"
                                                        />
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            placeholder="Original"
                                                            value={item.originalPrice || ''} 
                                                            onChange={(e) => updateItem(item.tempId, { originalPrice: parseFloat(e.target.value) || null })}
                                                            className="w-24 h-10 px-3 bg-slate-50 border-transparent rounded-xl text-[10px] font-bold focus:bg-white focus:border-slate-300 outline-none transition-all"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-6">
                                                    <select 
                                                        value={item.condition}
                                                        onChange={(e) => updateItem(item.tempId, { condition: e.target.value })}
                                                        className="h-10 px-3 bg-slate-100 border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest focus:bg-white focus:border-rose-500 outline-none transition-all cursor-pointer"
                                                    >
                                                        <option value="M">Mint</option>
                                                        <option value="NM">Near Mint</option>
                                                        <option value="LP">Lightly Played</option>
                                                        <option value="MP">Moderately Played</option>
                                                        <option value="HP">Heavily Played</option>
                                                        <option value="Dmg">Damaged</option>
                                                    </select>
                                                </td>
                                                <td className="py-6">
                                                    <div className="flex flex-col gap-2">
                                                        <select 
                                                            value={item.language}
                                                            onChange={(e) => updateItem(item.tempId, { language: e.target.value })}
                                                            className="h-10 px-3 bg-slate-100 border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest focus:bg-white focus:border-rose-500 outline-none transition-all cursor-pointer"
                                                        >
                                                            <option>Português</option>
                                                            <option>Inglês</option>
                                                            <option>Japonês</option>
                                                        </select>
                                                        <select 
                                                            value={item.finish}
                                                            onChange={(e) => updateItem(item.tempId, { finish: e.target.value })}
                                                            className="h-10 px-3 bg-slate-100 border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest focus:bg-white focus:border-rose-500 outline-none transition-all cursor-pointer"
                                                        >
                                                            <option>Normal</option>
                                                            <option>Foil / Holo</option>
                                                            <option>Reverse Holo</option>
                                                            <option>Full Art</option>
                                                            <option>Alternative Art</option>
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
                                                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm'
                                                                    : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                                                            }`}
                                                        >
                                                            <div className={`w-7 h-4 rounded-full relative transition-colors ${
                                                                item.is_graded ? 'bg-amber-400' : 'bg-slate-300'
                                                            }`}>
                                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                                                                    item.is_graded ? 'left-3.5' : 'left-0.5'
                                                                }`} />
                                                            </div>
                                                            {item.is_graded ? 'Gradada' : 'Sem Grade'}
                                                        </button>
                                                        {item.is_graded && (
                                                            <div className="flex gap-1.5">
                                                                <select
                                                                    value={item.grading_company}
                                                                    onChange={(e) => updateItem(item.tempId, { grading_company: e.target.value })}
                                                                    className="h-8 px-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[9px] font-black text-amber-800 outline-none cursor-pointer"
                                                                >
                                                                    <option value="PSA">PSA</option>
                                                                    <option value="CGC">CGC</option>
                                                                    <option value="BGS">BGS</option>
                                                                    <option value="TAG">TAG</option>
                                                                    <option value="ACE">ACE</option>
                                                                </select>
                                                                <select
                                                                    value={item.grading_score}
                                                                    onChange={(e) => updateItem(item.tempId, { grading_score: e.target.value })}
                                                                    className="h-8 px-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[9px] font-black text-amber-800 outline-none cursor-pointer"
                                                                >
                                                                    <option value="10">10 — Gem Mint</option>
                                                                    <option value="9.5">9.5 — Gem Mint</option>
                                                                    <option value="9">9 — Mint</option>
                                                                    <option value="8.5">8.5 — NM-MT+</option>
                                                                    <option value="8">8 — NM-MT</option>
                                                                    <option value="7.5">7.5 — Near Mint+</option>
                                                                    <option value="7">7 — Near Mint</option>
                                                                    <option value="6.5">6.5 — EX-MT+</option>
                                                                    <option value="6">6 — EX-MT</option>
                                                                    <option value="5.5">5.5 — Excellent+</option>
                                                                    <option value="5">5 — Excellent</option>
                                                                    <option value="4">4 — VG-EX</option>
                                                                    <option value="3">3 — VG</option>
                                                                    <option value="2">2 — Good</option>
                                                                    <option value="1.5">1.5 — Fair</option>
                                                                    <option value="1">1 — Poor</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-6 text-right">
                                                    <button 
                                                        onClick={() => removeItem(item.tempId)}
                                                        className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
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
                            
                            <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo do Lançamento_</p>
                                    <p className="text-xl font-black text-slate-900">{selectedItems.reduce((acc, curr) => acc + curr.quantity, 0)} Ativos no total</p>
                                </div>
                                <button 
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="h-16 px-12 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl hover:bg-rose-600 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
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
