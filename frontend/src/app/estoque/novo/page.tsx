"use client";

import React, { useState } from 'react';
import { databases, APPWRITE_CONFIG, account } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { useRouter } from 'next/navigation';

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

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await account.get();
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.inventory,
                ID.unique(),
                {
                    userId: user.$id,
                    name,
                    set,
                    number,
                    language,
                    condition,
                    finish,
                    isPromo,
                    price: parseFloat(marketValue),
                    buyPrice: parseFloat(buyPrice),
                    notes,
                    imageUrl,
                    grade: condition === 'M' ? '10' : condition === 'NM' ? '9' : '7'
                }
            );
            router.push('/estoque');
        } catch (error) {
            console.error(error);
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
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">Publicação direta no catálogo exclusivo TCGStore.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                {/* Section 1: Identification */}
                <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-sm space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Dados da Carta</h2>
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
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número</label>
                            <input value={number} onChange={e => setNumber(e.target.value)} placeholder="4/102" className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm" />
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
                        {loading ? 'PUBLICANDO NO CATÁLOGO...' : 'PUBLICAR ITEM NA TCGSTORE'}
                    </button>
                    <p className="text-center mt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-50">Log de segurança: Item será visível no marketplace imediatamente após publicação.</p>
                </div>
            </form>
        </div>
    );
}
