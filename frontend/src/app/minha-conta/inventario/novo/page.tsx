"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TcgSet { id: string; name: string; }
interface PokemonCard { id: string; name: string; set_name: string; local_id: string; image_url: string; }

export default function NewInventoryItemPage() {
    const [name, setName] = useState('');
    const [set, setSet] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('0');
    const [quantity, setQuantity] = useState('1');
    const [imageUrl, setImageUrl] = useState('');
    
    const [grade, setGrade] = useState('NM');
    const [finish, setFinish] = useState('Normal');
    const [language, setLanguage] = useState('Português');
    
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
        if (!name && !selectedSet) return;
        setSearching(true);
        try {
            let query = supabase.from('pokemon_cards').select('*');
            if (name) query = query.ilike('name', `%${name}%`);
            if (selectedSet) query = query.eq('set_id', selectedSet);

            const { data, error } = await query.limit(1000);
            if (!error && data) {
                setSearchResults(data);
            }
        } finally {
            setSearching(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            const res = await fetch('/api/user/inventory', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    name,
                    set_name: set,
                    number: cardNumber,
                    purchase_price: parseFloat(purchasePrice),
                    quantity: parseInt(quantity),
                    image_url: imageUrl,
                    condition: grade,
                    finish,
                    language
                })
            });

            if (!res.ok) throw new Error('Failed to save item');
            
            router.push('/minha-conta/inventario');
        } catch (error) {
            console.error(error);
            alert('Erro ao guardar carta no inventário.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-up">
            <div className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Adicionar <span className="text-rose-600">Coleção.</span></h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Guarde seus cards e acompanhe o mercado</p>
                </div>
                <Link href="/minha-conta/inventario">
                    <button className="h-10 px-6 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-10">
                    <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm space-y-8">
                        {/* Search Section */}
                        <div className="space-y-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar na Database</label>
                            <div className="flex flex-col md:flex-row gap-4">
                                <input
                                    type="text"
                                    placeholder="Nome da carta..."
                                    className="flex-1 h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-rose-600 transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
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
                                    {searching ? '...' : 'Buscar'}
                                </button>
                            </div>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-3xl max-h-64 overflow-y-auto">
                                {searchResults.map((card) => (
                                    <div
                                        key={card.id}
                                        onClick={() => {
                                            setName(card.name);
                                            setSet(card.set_name);
                                            setCardNumber(card.local_id);
                                            setImageUrl(card.image_url);
                                        }}
                                        className="bg-white border border-slate-100 p-2 rounded-2xl cursor-pointer hover:border-rose-500 transition-all group"
                                    >
                                        <img src={card.image_url} alt={card.name} className="w-full h-auto rounded-lg mb-2" />
                                        <p className="text-[9px] font-black text-slate-900 truncate">{card.name}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Coleção</label>
                                <input value={set} onChange={e => setSet(e.target.value)} className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-bold" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qtd</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pago (R$)</label>
                                <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-bold text-emerald-600" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acabamento</label>
                                <select value={finish} onChange={e => setFinish(e.target.value)} className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-bold appearance-none cursor-pointer">
                                    <option>Normal</option><option>Foil</option><option>Reverse Foil</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                                <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-bold appearance-none cursor-pointer text-sm">
                                    <option>NM</option><option>M</option><option>SP</option><option>MP</option><option>HP</option><option>D</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma</label>
                                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-bold appearance-none cursor-pointer text-sm">
                                    <option>Português</option><option>Inglês</option><option>Japonês</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm text-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 block text-left">Preview</label>
                        <div className="aspect-[3/4] bg-slate-50 rounded-[30px] overflow-hidden flex items-center justify-center p-6 mb-8 border-2 border-dashed border-slate-100">
                            {imageUrl ? (
                                <img src={imageUrl} alt="Preview" className="w-full h-auto rounded-xl shadow-2xl" />
                            ) : (
                                <span className="text-4xl opacity-20">🃏</span>
                            )}
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading || !name}
                            className="w-full h-16 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[25px] shadow-xl hover:bg-rose-700 transition-all disabled:opacity-50"
                        >
                            {loading ? 'SALVANDO...' : 'GUARDAR NO INVENTÁRIO'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
