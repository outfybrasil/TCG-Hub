"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

const durationOptions = [
    { label: '1 hora', hours: 1 },
    { label: '2 horas', hours: 2 },
    { label: '6 horas', hours: 6 },
    { label: '12 horas', hours: 12 },
    { label: '1 dia', hours: 24 },
    { label: '2 dias', hours: 48 },
    { label: '3 dias', hours: 72 },
    { label: '7 dias', hours: 168 },
];

const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function CreateAuctionPage() {
    const router = useRouter();
    const [cardName, setCardName] = useState('');
    const [cardSet, setCardSet] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [condition, setCondition] = useState('NM');
    const [language, setLanguage] = useState('Português');
    const [startingBid, setStartingBid] = useState('');
    const [durationHours, setDurationHours] = useState(24);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [sets, setSets] = useState<{ id: string; name: string; }[]>([]);
    const [searchResults, setSearchResults] = useState<{ id: string; name: string; set_name: string; local_id: string; image_url: string; }[]>([]);
    const [selectedSet, setSelectedSet] = useState<string>('');
    const [imageError, setImageError] = useState(false);
    const prevLangRef = React.useRef(language);

    // Mapping languages to TCGdex codes
    const langMap: Record<string, string> = {
        'Português': 'pt',
        'Inglês': 'en',
        'Japonês': 'ja'
    };

    // Update image when language changes
    React.useEffect(() => {
        const langChanged = prevLangRef.current !== language;
        prevLangRef.current = language;

        if (imageUrl && imageUrl.includes('assets.tcgdex.net')) {
            const currentLangCode = Object.values(langMap).find(code => imageUrl.includes(`/${code}/`));
            const targetCode = langMap[language];

            // Only force sync if language changed OR if there's no error detected yet
            if (langChanged || !imageError) {
                if (currentLangCode && targetCode && currentLangCode !== targetCode) {
                    const newUrl = imageUrl.replace(`/${currentLangCode}/`, `/${targetCode}/`);
                    if (newUrl !== imageUrl) {
                        setImageUrl(newUrl);
                        setImageError(false); // Reset error state on intentional swap
                    }
                }
            }
        }
    }, [language, imageUrl, imageError]);

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
        if (!cardName && !selectedSet) return;
        setSearching(true);
        try {
            let query = supabase.from('pokemon_cards').select('*');
            if (cardName) query = query.ilike('name', `%${cardName}%`);
            if (selectedSet) query = query.eq('set_id', selectedSet);

            const { data, error } = await query.limit(20);
            if (!error && data) setSearchResults(data);
        } finally {
            setSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
            const startBid = parseFloat(startingBid);

            const { data, error } = await supabase.from('auctions').insert({
                card_name: cardName,
                card_set: cardSet,
                card_number: cardNumber,
                image_url: imageUrl || `https://images.pokemontcg.io/base1/4.png`,
                condition,
                starting_bid: startBid,
                current_bid: startBid,
                bid_count: 0,
                ends_at: endsAt,
                created_by: user.id,
                status: 'active',
                notes,
                language,
            }).select('id').single();

            if (error) throw error;
            router.push(`/leilao/${data.id}`);
        } catch (err) {
            console.error(err);
            alert('Erro ao criar leilão.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminGuard>
            <div className="max-w-6xl mx-auto px-6 py-16 animate-fade-up">
                <div className="mb-16 space-y-6 relative">
                    <div className="inline-flex items-center gap-2 bg-rose-50/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-rose-100 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Protocolo de Criação de Leilão</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[0.9] flex flex-col">
                            Novo Leilão
                            <span className="text-rose-600 relative inline-block">
                                Exclusivo.
                                <div className="absolute -bottom-2 left-0 w-24 h-2 bg-rose-600/10 rounded-full" />
                            </span>
                        </h1>
                    </div>
                    <p className="max-w-lg text-slate-500 font-bold text-sm uppercase tracking-widest leading-relaxed opacity-60">
                        Configure um leilão público para a comunidade <span className="text-slate-900">TCG Mega Store</span>.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8">
                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-8 sm:p-12 rounded-[48px] shadow-2xl shadow-slate-200/50 space-y-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50" />

                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 whitespace-nowrap">Identificação da Carta</h2>
                                    <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-100 to-transparent" />
                                </div>

                                <div className="space-y-4 mb-8 bg-slate-50/50 backdrop-blur-md p-2 rounded-[32px] border border-slate-200/60 relative z-10 shadow-inner">
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <div className="flex-[2] relative group">
                                            <input
                                                type="text"
                                                placeholder="Buscar na Database TCGDex..."
                                                className="w-full h-16 px-8 bg-white border border-transparent rounded-[24px] text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all font-bold text-slate-900 shadow-sm group-hover:border-slate-200"
                                                value={cardName}
                                                onChange={(e) => setCardName(e.target.value)}
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>
                                        </div>
                                        <div className="flex-1 relative">
                                            <select
                                                value={selectedSet}
                                                onChange={(e) => setSelectedSet(e.target.value)}
                                                className="w-full h-16 px-6 bg-white border border-transparent rounded-[24px] text-[11px] focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all font-black text-slate-900 appearance-none cursor-pointer shadow-sm uppercase tracking-widest"
                                            >
                                                <option value="">Coleções</option>
                                                {sets.map(set => (
                                                    <option key={set.id} value={set.id}>{set.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={searchCards}
                                            disabled={searching}
                                            className="h-16 px-10 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-[24px] hover:bg-rose-600 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                                        >
                                            {searching ? '...' : 'Buscar'}
                                        </button>
                                    </div>
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="mb-8 p-6 bg-rose-50/50 rounded-3xl border border-rose-100/50 max-h-80 overflow-y-auto animate-fade-in">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {searchResults.map((card) => (
                                                <div
                                                    key={card.id}
                                                    onClick={() => {
                                                        setCardName(card.name);
                                                        setCardSet(card.set_name);
                                                        setCardNumber(card.local_id || '');
                                                        const currentTargetCode = langMap[language];
                                                        const url = card.image_url.replace('/pt/', `/${currentTargetCode}/`);
                                                        setImageUrl(url);
                                                        setImageError(false);
                                                    }}
                                                    className="bg-white border border-slate-200 p-4 rounded-3xl hover:border-rose-500 cursor-pointer transition-all hover:shadow-xl group"
                                                >
                                                    <img src={card.image_url} alt={card.name} className="w-full h-auto rounded-xl mb-3 shadow-md group-hover:scale-105 transition-transform" />
                                                    <p className="text-[10px] font-black text-slate-900 truncate">{card.name}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 truncate uppercase mt-0.5">{card.set_name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 relative z-10">
                                    <div className="group space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-rose-600 transition-colors">Nome da Carta</label>
                                        <input
                                            required value={cardName} onChange={e => setCardName(e.target.value)}
                                            placeholder="Charizard Base Set"
                                            className="w-full h-16 px-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:border-rose-600 focus:bg-white focus:ring-[6px] focus:ring-rose-50 outline-none transition-all font-bold text-sm shadow-sm"
                                        />
                                    </div>
                                    <div className="group space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-rose-600 transition-colors">Edição / Expansão</label>
                                        <input
                                            required value={cardSet} onChange={e => setCardSet(e.target.value)}
                                            placeholder="Base Set 1999"
                                            className="w-full h-16 px-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:border-rose-600 focus:bg-white focus:ring-[6px] focus:ring-rose-50 outline-none transition-all font-bold text-sm shadow-sm"
                                        />
                                    </div>

                                    <div className="group space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-rose-600 transition-colors">Número da Carta <span className="text-rose-500">*</span></label>
                                        <input
                                            required value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                                            placeholder="021/094"
                                            className="w-full h-16 px-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:border-rose-600 focus:bg-white focus:ring-[6px] focus:ring-rose-50 outline-none transition-all font-bold text-sm shadow-sm"
                                        />
                                        <p className="text-[9px] text-slate-400 font-bold ml-2 opacity-60">Exemplo: 021/094</p>
                                    </div>
                                    <div className="group space-y-3 relative">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-rose-600 transition-colors">Condição</label>
                                        <select
                                            value={condition} onChange={e => setCondition(e.target.value)}
                                            className="w-full h-16 px-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:border-rose-600 focus:bg-white focus:ring-[6px] focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer text-slate-900 shadow-sm"
                                        >
                                            <option value="M">Mint (M)</option>
                                            <option value="NM">Near Mint (NM)</option>
                                            <option value="LP">Lightly Played (LP)</option>
                                            <option value="MP">Moderately Played (MP)</option>
                                            <option value="HP">Heavily Played (HP)</option>
                                        </select>
                                        <div className="absolute right-6 top-[54px] pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>

                                    <div className="group space-y-3 relative">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-rose-600 transition-colors">Idioma</label>
                                        <select
                                            value={language} onChange={e => setLanguage(e.target.value)}
                                            className="w-full h-16 px-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:border-rose-600 focus:bg-white focus:ring-[6px] focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer text-slate-900 shadow-sm"
                                        >
                                            <option>Português</option>
                                            <option>Inglês</option>
                                            <option>Japonês</option>
                                        </select>
                                        <div className="absolute right-6 top-[54px] pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                    <div className="group space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-rose-600 transition-colors">URL da Imagem</label>
                                        <input
                                            value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                                            placeholder="https://images.pokemontcg.io/..."
                                            className="w-full h-16 px-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:border-rose-600 focus:bg-white focus:ring-[6px] focus:ring-rose-50 outline-none transition-all font-bold text-sm shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-12 rounded-[48px] shadow-3xl shadow-slate-900/40 space-y-10 relative overflow-hidden group/dark">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full -mr-40 -mt-40 blur-3xl opacity-50 group-hover/dark:bg-rose-500/20 transition-all duration-700" />

                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-rose-500 whitespace-nowrap">Configuração do Leilão</h2>
                                    <div className="h-[2px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Lance Inicial (BRL)</label>
                                        <div className="relative group/input">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-rose-500/50">R$</div>
                                            <input
                                                required type="number" min="1" step="0.01"
                                                value={startingBid} onChange={e => setStartingBid(e.target.value)}
                                                placeholder="0,00"
                                                className="w-full h-20 pl-16 pr-8 bg-white/5 border border-white/5 text-yellow-400 rounded-[28px] focus:border-rose-500/50 focus:bg-white/10 outline-none transition-all font-black text-3xl shadow-2xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Duração Limite</label>
                                        <div className="relative">
                                            <select
                                                value={durationHours}
                                                onChange={e => setDurationHours(Number(e.target.value))}
                                                className="w-full h-20 px-8 bg-white/5 border border-white/5 text-white rounded-[28px] focus:border-rose-500/50 focus:bg-white/10 outline-none transition-all font-black text-xl appearance-none cursor-pointer shadow-2xl"
                                            >
                                                {durationOptions.map(opt => (
                                                    <option key={opt.hours} value={opt.hours} className="bg-slate-900">{opt.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-rose-500">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Descritivo Técnico</label>
                                    <textarea
                                        value={notes} onChange={e => setNotes(e.target.value)}
                                        rows={6}
                                        placeholder="Descreva o estado de conservação, raridade e detalhes do card..."
                                        className="w-full p-8 bg-white/5 border border-white/5 text-slate-300 rounded-[32px] focus:border-rose-500/50 focus:bg-white/10 outline-none transition-all font-medium text-sm leading-relaxed shadow-inner"
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="lg:col-span-4">
                        <div className="sticky top-12 space-y-8">
                            <div className="bg-white border border-slate-200 p-10 rounded-[48px] shadow-2xl shadow-slate-200/50 space-y-8 relative overflow-hidden group/preview">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-400" />

                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Preview Realtime</label>
                                    <div className="px-2 py-0.5 bg-rose-50 rounded-md">
                                        <span className="text-[8px] font-black text-rose-600 uppercase">Live</span>
                                    </div>
                                </div>

                                <div className="aspect-[3/4] bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden group-hover/preview:border-rose-200 transition-colors">
                                    {imageUrl ? (
                                        <div className="relative w-full h-full flex flex-col items-center animate-fade-in group">
                                            <div className="relative w-full aspect-[21/30] mb-6">
                                                <img
                                                    src={imageUrl}
                                                    alt="Preview"
                                                    onError={() => {
                                                        if (!imageError) {
                                                            setImageError(true);
                                                            if (!imageUrl.includes('/pt/')) {
                                                                const ptUrl = imageUrl.replace(/\/(ja|en)\//, '/pt/');
                                                                setImageUrl(ptUrl);
                                                            }
                                                        }
                                                    }}
                                                    className="w-full h-full object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] transform group-hover:scale-110 transition-transform duration-700 ease-out z-10 relative"
                                                />
                                                <div className="absolute inset-x-0 bottom-0 h-10 bg-black/20 blur-2xl rounded-full scale-x-75 -z-0 opacity-50" />
                                            </div>

                                            {imageError && (
                                                <div className="mb-4 bg-rose-600 text-white text-[8px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-bounce">
                                                    Mockup: Card {language} Indisponível
                                                </div>
                                            )}

                                            <div className="text-center space-y-2">
                                                <h3 className="font-black text-slate-900 tracking-tighter text-2xl leading-[0.9]">{cardName || 'Nome da Carta'}</h3>
                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{cardSet || 'Coleção'}</p>
                                            </div>

                                            <div className="absolute top-2 right-2 flex flex-col gap-2">
                                                <div className="bg-slate-900/90 backdrop-blur-md text-white h-10 w-10 rounded-2xl flex items-center justify-center text-[10px] font-black shadow-xl">
                                                    {condition}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-6 opacity-30 group-hover:opacity-50 transition-opacity">
                                            <div className="flex justify-center">
                                                <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-3xl">🔨</div>
                                            </div>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Aguardando Dados...</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lance Inicial</span>
                                            <span className="text-xl font-black text-slate-900 leading-none mt-1">{formatBRL(parseFloat(startingBid) || 0)}</span>
                                        </div>
                                        <svg className="w-6 h-6 text-slate-200" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.39 2.1-1.39 1.47 0 2.01.59 2.06 1.47h1.73c-.05-1.44-1.02-2.55-2.59-2.91V5.5h-2.5v1.64c-1.67.37-2.73 1.46-2.73 2.91 0 1.95 1.51 2.8 3.82 3.38 2.06.52 2.48 1.1 2.48 1.83 0 1.05-.78 1.54-2.22 1.54-1.75 0-2.43-.8-2.53-1.89h-1.73c.11 1.66 1.25 2.76 2.89 3.12v1.67h2.5v-1.64c1.71-.34 2.84-1.39 2.84-2.9 0-2.25-1.95-2.88-4.14-3.41z" /></svg>
                                    </div>

                                    <button
                                        onClick={(e) => handleSubmit(e as any)}
                                        disabled={loading || !imageUrl}
                                        className="w-full h-20 bg-rose-600 text-white font-black uppercase tracking-[0.2em] text-[12px] rounded-[30px] shadow-2xl shadow-rose-500/40 hover:bg-rose-700 hover:shadow-rose-600/50 transition-all transform hover:-translate-y-1 active:scale-[0.98] disabled:opacity-30 disabled:hover:translate-y-0"
                                    >
                                        {loading ? 'PUBLICANDO...' : 'PUBLICAR AGORA'}
                                    </button>
                                </div>

                                <div className="pt-2">
                                    <div className="p-5 bg-slate-900 rounded-[28px] relative group/contract overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-transparent opacity-0 group-hover/contract:opacity-100 transition-opacity" />
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1 relative z-10">Contrato de Leilão</p>
                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed relative z-10 uppercase text-[8px] tracking-tight">
                                            A publicação implica na aceitação dos termos de lances e irreversibilidade imediata após o primeiro lance.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminGuard>
    );
}
