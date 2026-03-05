"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface TcgSet { id: string; name: string; }
interface PokemonCard { id: string; name: string; set_name: string; local_id: string; image_url: string; }

export default function NewAssetPage() {
    const [name, setName] = useState('');
    const [set, setSet] = useState('');
    const [number, setNumber] = useState('');
    const [language, setLanguage] = useState('PT-BR');
    const [condition, setCondition] = useState('NM');
    const [finish, setFinish] = useState('Normal');
    const [isPromo, setIsPromo] = useState(false);
    const [buyPrice, setBuyPrice] = useState('');
    const [marketValue, setMarketValue] = useState('');
    const [notes, setNotes] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);

    // TCGdex Integration State
    const [cardId, setCardId] = useState<string | null>(null);
    const [showCardModal, setShowCardModal] = useState(false);
    const [tcgSets, setTcgSets] = useState<TcgSet[]>([]);
    const [selectedSet, setSelectedSet] = useState<string>('');
    const [cards, setCards] = useState<PokemonCard[]>([]);
    const [cardSearchTerm, setCardSearchTerm] = useState('');
    const [loadingCards, setLoadingCards] = useState(false);

    const router = useRouter();

    // Fetch sets on mount
    React.useEffect(() => {
        const fetchSets = async () => {
            const res = await fetch('https://api.tcgdex.net/v2/pt/sets');
            const data = await res.json();
            setTcgSets(data.reverse());
        };
        fetchSets();
    }, []);

    // Fetch cards when set is selected OR modal opens
    const fetchCards = async (setId: string) => {
        setLoadingCards(true);
        const { data } = await supabase
            .from('pokemon_cards')
            .select('*')
            .eq('set_id', setId)
            .order('local_id', { ascending: true });

        if (data) setCards(data);
        setLoadingCards(false);
    };

    const handleSelectCard = (card: PokemonCard) => {
        setCardId(card.id);
        setName(card.name);
        setSet(card.set_name);
        setNumber(card.local_id);
        setImageUrl(card.image_url);
        setShowCardModal(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.from('inventory').insert({
                user_id: user.id,
                card_id: cardId, // Novo campo link catalog
                name,
                set,
                number,
                language,
                condition,
                finish,
                is_promo: isPromo,
                price: parseFloat(marketValue),
                buy_price: parseFloat(buyPrice),
                notes,
                image_url: imageUrl,
                grade: condition === 'M' ? '10' : condition === 'NM' ? '9' : '7'
            });

            if (error) throw error;
            router.push('/estoque');
        } catch (_error) {
            console.error(_error);
            alert("Erro ao publicar item. Verifique a conexão.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-up">
            <div className="mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Protocolo de Listagem de Item</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                    Novo Item na <span className="text-rose-600">Loja.</span>
                </h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">Publicação direta no catálogo exclusivo TCG Mega Store.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                {/* Section 1: Identification */}
                <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-sm space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Busca no Catálogo TCGdex</h2>
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Coleção Oficial</label>
                            <select
                                value={selectedSet}
                                onChange={e => {
                                    setSelectedSet(e.target.value);
                                    fetchCards(e.target.value);
                                }}
                                className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                            >
                                <option value="">Selecione uma coleção...</option>
                                {tcgSets.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={() => setShowCardModal(true)}
                                disabled={!selectedSet}
                                className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-800 transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {loadingCards ? 'Carregando Cards...' : '🔍 Buscar Carta na Coleção'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-4">
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou preencha manualmente</span>
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Carta</label>
                            <input
                                required value={name} onChange={e => setName(e.target.value)}
                                placeholder="Charizard Base Set"
                                className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Edição / Expansão</label>
                            <input
                                required value={set} onChange={e => setSet(e.target.value)}
                                placeholder="Base Set 1999"
                                className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número da Carta <span className="text-rose-600">*</span></label>
                            <input required value={number} onChange={e => setNumber(e.target.value)} placeholder="021/094" className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma</label>
                            <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer">
                                <option>PT-BR</option>
                                <option>EN-US</option>
                                <option>JP</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between p-4 bg-slate-50 border border-transparent rounded-2xl">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-2">Possui Selo Promo?</span>
                            <button
                                type="button"
                                onClick={() => setIsPromo(!isPromo)}
                                className={`w-14 h-8 rounded-full transition-all relative ${isPromo ? 'bg-rose-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all ${isPromo ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 2: Attributes */}
                <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-sm space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Estado e Acabamento</h2>
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Condição Física</label>
                            <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer text-slate-900">
                                <option value="M">Mint (10)</option>
                                <option value="NM">Near Mint (9)</option>
                                <option value="LP">Lightly Played (7)</option>
                                <option value="MP">Moderately Played (5)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Finish / Brilho</label>
                            <select
                                value={finish}
                                onChange={e => setFinish(e.target.value)}
                                className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer text-slate-900"
                            >
                                <option>Normal</option>
                                <option>Holo</option>
                                <option>Reverse Holo</option>
                                <option>Foil</option>
                                <option>Full Art</option>
                                <option>Secret Rare</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da Imagem de Exibição</label>
                        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://exemplo.com/charizard.png" className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm" />
                    </div>
                </div>

                {/* Section 3: Financials */}
                <div className="bg-slate-900 p-8 sm:p-12 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-16 -mt-16" />
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500 whitespace-nowrap">Valores de Venda</h2>
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Custo de Aquisição (BRL)</label>
                            <input required type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="0.00" className="w-full h-16 px-6 bg-white/5 border border-white/5 text-white rounded-3xl focus:border-rose-600 focus:bg-black/20 outline-none transition-all font-black text-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest ml-2">Preço de Venda em Loja (BRL)</label>
                            <input required type="number" value={marketValue} onChange={e => setMarketValue(e.target.value)} placeholder="0.00" className="w-full h-16 px-6 bg-white/5 border border-white/5 text-yellow-400 rounded-3xl focus:border-rose-600 focus:bg-black/20 outline-none transition-all font-black text-2xl" />
                        </div>
                    </div>

                    <div className="space-y-2 relative z-10">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descrição Técnica para o Cliente</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full p-8 bg-white/5 border border-white/5 text-slate-300 rounded-[30px] focus:border-rose-600 focus:bg-black/20 outline-none transition-all font-medium text-sm leading-relaxed" placeholder="Adicione detalhes sobre o estado da carta, centragem e qualquer detalhe relevante para o colecionador..."></textarea>
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        disabled={loading}
                        className="w-full h-20 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[30px] shadow-2xl shadow-rose-500/30 hover:bg-rose-700 transition-all transform hover:-translate-y-1.5 disabled:opacity-50"
                    >
                        {loading ? 'PUBLICANDO NO CATÁLOGO...' : 'PUBLICAR ITEM NA TCG Mega Store'}
                    </button>
                    <p className="text-center mt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-50">Log de segurança: Item será visível no marketplace imediatamente após publicação.</p>
                </div>
            </form>

            {/* Selection Modal */}
            {showCardModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/90 backdrop-blur-xl animate-fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black tracking-tighter text-slate-900">Selecione a Carta</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Coleção: <span className="text-rose-600">{tcgSets.find(s => s.id === selectedSet)?.name}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCardModal(false)}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all font-black"
                            >✕</button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-6 bg-slate-50 border-b border-slate-100">
                            <input
                                type="text"
                                value={cardSearchTerm}
                                onChange={e => setCardSearchTerm(e.target.value)}
                                placeholder="🔍 Buscar por nome ou número (ex: Pikachu ou 025)..."
                                className="w-full h-14 px-6 bg-white border border-slate-200 rounded-2xl focus:border-rose-600 outline-none transition-all font-bold text-sm shadow-sm"
                            />
                        </div>

                        {/* Card Grid */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                {cards.filter(c =>
                                    c.name.toLowerCase().includes(cardSearchTerm.toLowerCase()) ||
                                    c.local_id.includes(cardSearchTerm)
                                ).map(card => (
                                    <div
                                        key={card.id}
                                        onClick={() => handleSelectCard(card)}
                                        className="group cursor-pointer space-y-3"
                                    >
                                        <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 relative shadow-md group-hover:shadow-xl group-hover:shadow-rose-500/20 transition-all group-hover:-translate-y-2">
                                            <img
                                                src={card.image_url}
                                                alt={card.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-rose-600/0 group-hover:bg-rose-600/20 transition-all flex items-center justify-center">
                                                <span className="opacity-0 group-hover:opacity-100 bg-white text-rose-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all">Selecionar</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900 truncate">{card.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{card.local_id}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
