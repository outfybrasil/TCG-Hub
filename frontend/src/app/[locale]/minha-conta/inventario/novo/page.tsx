"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EDITIONS } from '../../../edicoes/_data';

interface TcgSet { id: string; name: string; alias?: string; }
interface PokemonCard { id: string; name: string; set_name: string; local_id: string; image_url: string; rarity: string; }

interface SelectedItem {
    id: string; card_id: string; name: string; set_name: string; number: string;
    image_url: string; quantity: number; purchase_price: number; condition: string;
    finish: string; language: string; is_graded: boolean; grading_company: string;
    grading_score: string; rarity?: string;
}

const SEL = "h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-brand-text outline-none focus:border-brand-rose/50 cursor-pointer";
const INP = "h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-brand-text outline-none focus:border-brand-rose/50 text-center w-full";

export default function NewInventoryItemPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [sets, setSets] = useState<TcgSet[]>([]);
    const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
    const [selectedSet, setSelectedSet] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSets, setShowSets] = useState(false);
    const [setSearchQuery, setSetSearchQuery] = useState('');
    const [setCards, setSetCards] = useState<PokemonCard[]>([]);
    const [searchingCards, setSearchingCards] = useState(false);
    const [cardSearchQuery, setCardSearchQuery] = useState('');
    const [showCardList, setShowCardList] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const allSets: TcgSet[] = EDITIONS.flatMap(y =>
            y.sets.map(([name, id, alias]) => ({ id, name, alias }))
        ).sort((a, b) => a.name.localeCompare(b.name));
        setSets(allSets);
    }, []);

    const filteredSets = sets.filter(s =>
        s.name.toLowerCase().includes(setSearchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(setSearchQuery.toLowerCase()) ||
        (s.alias && s.alias.toLowerCase().includes(setSearchQuery.toLowerCase()))
    );

    useEffect(() => {
        if (!selectedSet) { setSetCards([]); return; }
        setSearchingCards(true);
        supabase.from('pokemon_cards').select('id, name, local_id, set_name, image_url, rarity')
            .eq('set_id', selectedSet).order('local_id')
            .then(({ data }) => { setSetCards((data as any) || []); setSearchingCards(false); });
    }, [selectedSet]);

    const filteredCardList = setCards.filter(c =>
        c.name.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
        c.local_id.toLowerCase().includes(cardSearchQuery.toLowerCase())
    );

    const searchCards = async () => {
        setSearching(true); setShowSets(false); setShowCardList(false);
        let q = supabase.from('pokemon_cards').select('*');
        if (searchTerm) q = q.or(`name.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%`);
        if (selectedSet) q = q.eq('set_id', selectedSet);
        const { data } = await q.limit(150);
        setSearchResults(data || []);
        setSearching(false);
    };

    const addToBasket = (card: PokemonCard) => {
        setSelectedItems(prev => {
            const ex = prev.find(i => i.card_id === card.id);
            if (ex) return prev.map(i => i.card_id === card.id ? { ...i, quantity: i.quantity + 1 } : i);
            const r = card.rarity?.toLowerCase() || '';
            const isUltra = r.includes('ultra') || r.includes('illustration') || r.includes('hyper');
            return [...prev, {
                id: Math.random().toString(36).substr(2, 9), card_id: card.id,
                name: card.name, set_name: card.set_name, number: card.local_id,
                image_url: card.image_url, quantity: 1, purchase_price: 0,
                condition: 'NM', finish: isUltra ? 'Foil' : 'Normal',
                language: 'Português', is_graded: false,
                grading_company: '', grading_score: '', rarity: card.rarity,
            }];
        });
    };

    const updateItem = (id: string, u: Partial<SelectedItem>) =>
        setSelectedItems(prev => prev.map(i => i.id === id ? { ...i, ...u } : i));

    const removeItem = (id: string) =>
        setSelectedItems(prev => prev.filter(i => i.id !== id));

    const handleSave = async () => {
        if (!selectedItems.length) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { error } = await supabase.from('user_inventory').insert(
                selectedItems.map(item => ({
                    user_id: user.id, card_id: item.card_id, quantity: item.quantity,
                    purchase_price: item.purchase_price, condition: item.condition,
                    finish: item.finish, language: item.language, is_graded: item.is_graded,
                    grading_company: item.grading_company, grading_score: item.grading_score,
                    status: 'in_stock',
                }))
            );
            if (error) throw error;
            router.push('/minha-conta/inventario');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar itens no inventário.');
        } finally { setLoading(false); }
    };

    return (
        <div className="animate-fade-up pb-24 pt-24">
            <div className="page-frame flex flex-col gap-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-muted">Inventário pessoal</p>
                        <h1 className="mt-2 text-4xl font-black tracking-tight text-brand-text">
                            Adicionar <span className="text-brand-rose">Cards.</span>
                        </h1>
                        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-brand-muted">
                            Selecione uma coleção e escolha as cartas
                        </p>
                    </div>
                    <Link href="/minha-conta/inventario">
                        <button className="h-10 px-6 rounded-xl border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text hover:border-white/20 transition-all">
                            Cancelar
                        </button>
                    </Link>
                </div>

                {/* Step 1 — Search */}
                <div className="surface-card rounded-3xl p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-rose text-[10px] font-black text-white">1</div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text">Selecionar Carta</h2>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/3 p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex flex-col md:flex-row gap-4">

                            {/* Coleção */}
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">1. Coleção</label>
                                <div className="relative">
                                    <div
                                        onClick={() => setShowSets(!showSets)}
                                        className="h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-brand-text flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
                                    >
                                        <span className={selectedSet ? 'text-brand-text' : 'text-brand-muted'}>
                                            {selectedSet ? sets.find(s => s.id === selectedSet)?.name : 'Escolher Coleção...'}
                                        </span>
                                        <svg className={`w-4 h-4 text-brand-muted transition-transform ${showSets ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                    {showSets && (
                                        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden" style={{ background: '#0c1324' }}>
                                            <div className="p-3 border-b border-white/5">
                                                <input autoFocus type="text" placeholder="Buscar por nome ou sigla..."
                                                    className="w-full h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-brand-text outline-none focus:border-brand-rose/50"
                                                    value={setSearchQuery} onChange={e => setSetSearchQuery(e.target.value)} onClick={e => e.stopPropagation()} />
                                            </div>
                                            <div className="max-h-[250px] overflow-y-auto">
                                                {filteredSets.map(s => (
                                                    <div key={s.id} onClick={() => { setSelectedSet(s.id); setShowSets(false); setSetSearchQuery(''); }}
                                                        className={`px-5 py-3 cursor-pointer text-xs font-bold transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group ${selectedSet === s.id ? 'text-brand-rose bg-brand-rose/5' : 'text-brand-text hover:bg-white/5'}`}>
                                                        <span>{s.name}</span>
                                                        <span className="text-[10px] opacity-40 font-black uppercase">{s.alias || s.id}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Carta */}
                            {selectedSet && (
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">2. Carta</label>
                                    <div className="relative">
                                        <div onClick={() => setShowCardList(!showCardList)}
                                            className="h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold flex items-center justify-between cursor-pointer hover:border-white/20 transition-all">
                                            <span className="text-brand-muted">{searchingCards ? 'Carregando...' : 'Buscar por nome ou número...'}</span>
                                            <svg className={`w-4 h-4 text-brand-muted transition-transform ${showCardList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                        {showCardList && (
                                            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden" style={{ background: '#0c1324' }}>
                                                <div className="p-3 border-b border-white/5">
                                                    <input autoFocus type="text" placeholder="Nome ou número (ex: 001)..."
                                                        className="w-full h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-brand-text outline-none focus:border-brand-rose/50"
                                                        value={cardSearchQuery} onChange={e => setCardSearchQuery(e.target.value)} onClick={e => e.stopPropagation()} />
                                                </div>
                                                <div className="max-h-[300px] overflow-y-auto">
                                                    {filteredCardList.map(c => (
                                                        <div key={c.id} onClick={() => { addToBasket(c); setShowCardList(false); setCardSearchQuery(''); }}
                                                            className="px-5 py-3 hover:bg-white/5 cursor-pointer text-xs font-bold transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group text-brand-text">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-black text-brand-muted w-8">{c.local_id}</span>
                                                                <span>{c.name}</span>
                                                            </div>
                                                            <span className="text-[9px] font-black text-emerald-400 opacity-0 group-hover:opacity-100">+ Add</span>
                                                        </div>
                                                    ))}
                                                    {filteredCardList.length === 0 && (
                                                        <div className="p-8 text-center text-brand-muted text-xs font-bold uppercase tracking-widest">Nenhuma carta encontrada</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Buscar imagens */}
                            <div className="flex items-end">
                                <button onClick={searchCards} disabled={searching}
                                    className="h-12 px-8 bg-brand-rose hover:bg-brand-rose-dim text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-brand-rose/20 disabled:opacity-50">
                                    {searching ? '...' : 'Ver Galeria'}
                                </button>
                            </div>
                        </div>

                        {/* Busca global por nome */}
                        {!selectedSet && (
                            <div className="pt-3 border-t border-white/5">
                                <label className="text-[9px] font-black text-brand-muted/60 uppercase tracking-widest mb-2 block italic">Ou busque pelo nome em todas as coleções:</label>
                                <input type="text" placeholder="Charizard, Mewtwo, Pikachu..."
                                    className="w-full h-12 px-5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-brand-text outline-none focus:border-brand-rose/50 transition-all"
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchCards()} />
                            </div>
                        )}
                    </div>

                    {/* Galeria de resultados */}
                    {searchResults.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Resultados ({searchResults.length})</p>
                                <button onClick={() => setSearchResults([])} className="text-[9px] font-bold text-brand-rose uppercase hover:underline">Fechar</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 rounded-2xl border border-white/5 max-h-[480px] overflow-y-auto" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                {searchResults.map(card => {
                                    const sel = selectedItems.some(i => i.card_id === card.id);
                                    return (
                                        <div key={card.id} onClick={() => addToBasket(card)}
                                            className={`relative p-2 rounded-2xl cursor-pointer transition-all group border ${sel ? 'border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20' : 'border-white/10 bg-white/5 hover:border-brand-rose/40 hover:bg-brand-rose/5 hover:-translate-y-1'}`}>
                                            {sel && (
                                                <div className="absolute top-1.5 left-1.5 z-10 bg-emerald-500 text-white p-0.5 rounded-full shadow">
                                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                            <img src={card.image_url} alt={card.name} className={`w-full h-auto rounded-lg mb-2 transition-transform ${sel ? 'opacity-70' : 'group-hover:scale-105'}`} />
                                            <p className="text-[9px] font-black text-brand-text truncate">{card.name}</p>
                                            <p className="text-[7px] text-brand-muted font-bold uppercase truncate">{card.set_name} #{card.local_id}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 2 — Selected items table */}
                {selectedItems.length > 0 && (
                    <div className="surface-card rounded-3xl p-8 space-y-6 animate-fade-up">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-[10px] font-black text-white">2</div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text">Itens Selecionados ({selectedItems.length})</h2>
                            </div>
                            <button onClick={() => setSelectedItems([])} className="text-[9px] font-black text-brand-muted uppercase hover:text-brand-rose transition-colors">Limpar Tudo</button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[9px] font-black text-brand-muted uppercase tracking-widest border-b border-white/5">
                                        {['Card','Qtd','Pago (R$)','Estado','Acabamento','Idioma','Grading',''].map(h => (
                                            <th key={h} className="pb-4 pt-0 px-2">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {selectedItems.map(item => (
                                        <tr key={item.id} className="hover:bg-white/3 transition-colors" style={{ '--tw-bg-opacity': '0.03' } as React.CSSProperties}>
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-3">
                                                    <img src={item.image_url} alt={item.name} className="w-10 h-auto rounded-lg shadow" />
                                                    <div>
                                                        <p className="text-[11px] font-bold text-brand-text leading-tight">{item.name}</p>
                                                        <p className="text-[8px] text-brand-muted uppercase tracking-tight">{item.set_name} #{item.number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2">
                                                <input type="number" value={item.quantity} min="1"
                                                    onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                                    className={INP + " w-16"} />
                                            </td>
                                            <td className="py-4 px-2">
                                                <input type="number" value={item.purchase_price} min="0"
                                                    onChange={e => updateItem(item.id, { purchase_price: parseFloat(e.target.value) || 0 })}
                                                    className={INP + " w-20 text-emerald-400"} />
                                            </td>
                                            <td className="py-4 px-2">
                                                <select value={item.condition} onChange={e => updateItem(item.id, { condition: e.target.value })} className={SEL}>
                                                    <option>M</option><option>NM</option><option>SP</option><option>MP</option><option>HP</option><option>D</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-2">
                                                <select value={item.finish} onChange={e => updateItem(item.id, { finish: e.target.value })} className={SEL}>
                                                    {(() => {
                                                        const r = item.rarity?.toLowerCase() || '';
                                                        if (r.includes('ultra') || r.includes('illustration') || r.includes('hyper'))
                                                            return <option value="Foil">Foil / Holo</option>;
                                                        if (r === 'rare' || r.includes('holo')) return (<><option value="Foil">Foil / Holo</option><option value="Reverse Foil">Reverse Holo</option><option value="Normal">Normal</option></>);
                                                        return (<><option value="Normal">Normal</option><option value="Reverse Foil">Reverse Holo</option></>);
                                                    })()}
                                                </select>
                                            </td>
                                            <td className="py-4 px-2">
                                                <select value={item.language} onChange={e => updateItem(item.id, { language: e.target.value })} className={SEL}>
                                                    <option>Português</option><option>Inglês</option><option>Japonês</option><option>Espanhol</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-2">
                                                <div className="flex flex-col gap-1.5">
                                                    <button type="button"
                                                        onClick={() => updateItem(item.id, { is_graded: !item.is_graded, grading_company: !item.is_graded ? 'PSA' : '', grading_score: !item.is_graded ? '10' : '' })}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${item.is_graded ? 'bg-brand-amber/10 border border-brand-amber/30 text-brand-amber' : 'bg-white/5 border border-white/10 text-brand-muted hover:bg-white/10'}`}>
                                                        <div className={`w-7 h-4 rounded-full relative transition-colors ${item.is_graded ? 'bg-brand-amber' : 'bg-white/20'}`}>
                                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${item.is_graded ? 'left-3.5' : 'left-0.5'}`} />
                                                        </div>
                                                        {item.is_graded ? 'Gradada' : 'Sem Grade'}
                                                    </button>
                                                    {item.is_graded && (
                                                        <div className="flex gap-1.5">
                                                            <select value={item.grading_company} onChange={e => updateItem(item.id, { grading_company: e.target.value })}
                                                                className="h-8 px-1.5 bg-brand-amber/10 border border-brand-amber/25 rounded-lg text-[9px] font-black text-brand-amber outline-none cursor-pointer">
                                                                <option>PSA</option><option>CGC</option><option>BGS</option><option>TAG</option><option>ACE</option>
                                                            </select>
                                                            <select value={item.grading_score} onChange={e => updateItem(item.id, { grading_score: e.target.value })}
                                                                className="h-8 px-1.5 bg-brand-amber/10 border border-brand-amber/25 rounded-lg text-[9px] font-black text-brand-amber outline-none cursor-pointer">
                                                                {['10','9.5','9','8.5','8','7.5','7','6','5','4','3','2','1'].map(v => <option key={v} value={v}>{v}</option>)}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-2">
                                                <button onClick={() => removeItem(item.id)} className="p-2 text-brand-muted hover:text-brand-rose transition-colors">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button onClick={handleSave} disabled={loading}
                                className="h-14 px-12 bg-brand-rose hover:bg-brand-rose-dim text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-brand-rose/20 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50">
                                {loading ? 'Salvando...' : `Guardar ${selectedItems.length} card${selectedItems.length > 1 ? 's' : ''} no Inventário`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
