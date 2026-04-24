"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TcgSet { id: string; name: string; }
interface PokemonCard { id: string; name: string; set_name: string; local_id: string; image_url: string; }

interface SelectedItem {
    id: string;
    card_id: string;
    name: string;
    set_name: string;
    number: string;
    image_url: string;
    quantity: number;
    purchase_price: number;
    condition: string;
    finish: string;
    language: string;
    is_graded: boolean;
    grading_company: string;
    grading_score: string;
}

export default function NewInventoryItemPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [sets, setSets] = useState<TcgSet[]>([]);
    const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
    const [selectedSet, setSelectedSet] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
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
        if (!searchTerm && !selectedSet) return;
        setSearching(true);
        try {
            let query = supabase.from('pokemon_cards').select('*');
            if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%,name_es.ilike.%${searchTerm}%`);
            if (selectedSet) query = query.eq('set_id', selectedSet);

            const { data, error } = await query.limit(100);
            if (!error && data) {
                setSearchResults(data);
            }
        } finally {
            setSearching(false);
        }
    };

    const addToBasket = (card: PokemonCard) => {
        const existing = selectedItems.find(item => item.card_id === card.id);
        if (existing) {
            updateItem(existing.id, { quantity: existing.quantity + 1 });
            return;
        }
        const newItem: SelectedItem = {
            id: card.id + Date.now(), // unique for the list
            card_id: card.id,
            name: card.name,
            set_name: card.set_name,
            number: card.local_id,
            image_url: card.image_url,
            quantity: 1,
            purchase_price: 0,
            condition: 'NM',
            finish: 'Normal',
            language: 'Português',
            is_graded: false,
            grading_company: '',
            grading_score: ''
        };
        setSelectedItems(prev => [...prev, newItem]);
    };

    const updateItem = (id: string, updates: Partial<SelectedItem>) => {
        setSelectedItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const removeItem = (id: string) => {
        setSelectedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSave = async () => {
        if (selectedItems.length === 0) return;
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            const res = await fetch('/api/user/inventory', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(selectedItems)
            });

            if (!res.ok) throw new Error('Failed to save items');
            
            router.push('/minha-conta/inventario');
        } catch (error) {
            console.error(error);
            alert('Erro ao guardar cartas no inventário.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up">
            <div className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Adicionar <span className="text-rose-600">Cards.</span></h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Selecione múltiplos cards e guarde na sua coleção</p>
                </div>
                <Link href="/minha-conta/inventario">
                    <button className="h-10 px-6 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-10">
                {/* Search Section */}
                <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm space-y-8">
                    <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Buscar na Database</label>
                        <div className="flex flex-col md:flex-row gap-4">
                            <input
                                type="text"
                                placeholder="Nome da carta..."
                                className="flex-1 h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-rose-600 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchCards()}
                            />
                            <select
                                value={selectedSet}
                                onChange={(e) => setSelectedSet(e.target.value)}
                                className="flex-1 h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
                            >
                                <option value="">Todas as Coleções</option>
                                {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button
                                onClick={searchCards}
                                disabled={searching}
                                className="h-14 px-8 bg-slate-950 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all"
                            >
                                {searching ? '...' : 'BUSCAR'}
                            </button>
                        </div>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-slate-50 rounded-3xl max-h-[400px] overflow-y-auto">
                            {searchResults.map((card) => {
                                const isSelected = selectedItems.some(item => item.card_id === card.id);
                                return (
                                <div
                                    key={card.id}
                                    onClick={() => addToBasket(card)}
                                    className={`bg-white border p-2 rounded-2xl cursor-pointer transition-all group relative ${
                                        isSelected
                                            ? 'border-emerald-400 bg-emerald-50/30 ring-2 ring-emerald-200'
                                            : 'border-slate-100 hover:border-rose-500'
                                    }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-1.5 left-1.5 z-10 bg-emerald-500 text-white p-0.5 rounded-full shadow">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                    <img src={card.image_url} alt={card.name} className={`w-full h-auto rounded-lg mb-2 transition-transform ${isSelected ? 'opacity-70' : 'group-hover:scale-105'}`} />
                                    <p className="text-[9px] font-black text-slate-900 truncate">{card.name}</p>
                                    <p className="text-[7px] text-slate-400 font-bold uppercase truncate">{card.set_name}</p>
                                    {isSelected && (
                                        <p className="text-[7px] font-black text-emerald-600 uppercase mt-0.5">✓ Selecionada</p>
                                    )}
                                    {!isSelected && (
                                        <div className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Basket Section */}
                {selectedItems.length > 0 && (
                    <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm space-y-8 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">2. Itens Selecionados ({selectedItems.length})</h2>
                            <button 
                                onClick={() => setSelectedItems([])}
                                className="text-[9px] font-black text-slate-400 uppercase hover:text-rose-600 transition-colors"
                            >
                                Limpar Tudo
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="pb-4 pt-0 px-2">Card</th>
                                        <th className="pb-4 pt-0 px-2">Qtd</th>
                                        <th className="pb-4 pt-0 px-2">Pago (R$)</th>
                                        <th className="pb-4 pt-0 px-2">Estado</th>
                                        <th className="pb-4 pt-0 px-2">Acabamento</th>
                                        <th className="pb-4 pt-0 px-2">Idioma</th>
                                        <th className="pb-4 pt-0 px-2">Grading</th>
                                        <th className="pb-4 pt-0 px-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-950 font-bold text-sm">
                                    {selectedItems.map((item) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-3">
                                                    <img src={item.image_url} alt={item.name} className="w-10 h-auto rounded shadow-sm" />
                                                    <div>
                                                        <p className="text-[11px] leading-tight mb-0.5">{item.name}</p>
                                                        <p className="text-[8px] text-slate-400 uppercase tracking-tighter">{item.set_name} #{item.number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2">
                                                <input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                                    className="w-16 h-10 bg-slate-100/50 border-none rounded-xl text-center focus:bg-white focus:ring-2 focus:ring-rose-500/20 outline-none text-xs"
                                                />
                                            </td>
                                            <td className="py-4 px-2">
                                                <input 
                                                    type="number" 
                                                    value={item.purchase_price} 
                                                    onChange={e => updateItem(item.id, { purchase_price: parseFloat(e.target.value) || 0 })}
                                                    className="w-20 h-10 bg-slate-100/50 border-none rounded-xl text-center focus:bg-white focus:ring-2 focus:ring-rose-500/20 outline-none text-xs text-emerald-600"
                                                />
                                            </td>
                                            <td className="py-4 px-2">
                                                <select 
                                                    value={item.condition} 
                                                    onChange={e => updateItem(item.id, { condition: e.target.value })}
                                                    className="h-10 px-2 bg-slate-100/50 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 outline-none text-[10px] cursor-pointer"
                                                >
                                                    <option>M</option><option>NM</option><option>SP</option><option>MP</option><option>HP</option><option>D</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-2">
                                                <select 
                                                    value={item.finish} 
                                                    onChange={e => updateItem(item.id, { finish: e.target.value })}
                                                    className="h-10 px-2 bg-slate-100/50 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 outline-none text-[10px] cursor-pointer"
                                                >
                                                    <option>Normal</option><option>Foil</option><option>Reverse Foil</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-2">
                                                <select 
                                                    value={item.language} 
                                                    onChange={e => updateItem(item.id, { language: e.target.value })}
                                                    className="h-10 px-2 bg-slate-100/50 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 outline-none text-[10px] cursor-pointer"
                                                >
                                                    <option>Português</option><option>Inglês</option><option>Japonês</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-2">
                                                <div className="flex flex-col gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItem(item.id, {
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
                                                                onChange={(e) => updateItem(item.id, { grading_company: e.target.value })}
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
                                                                onChange={(e) => updateItem(item.id, { grading_score: e.target.value })}
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
                                            <td className="py-4 px-2 text-right">
                                                <button 
                                                    onClick={() => removeItem(item.id)}
                                                    className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="h-16 px-12 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[25px] shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'SALVANDO...' : `GUARDAR ${selectedItems.length} CARDS NO INVENTÁRIO`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
