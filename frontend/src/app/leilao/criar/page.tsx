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
            <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-up">
                <div className="mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Protocolo de Criação de Leilão</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                        Novo Leilão <span className="text-rose-600">Exclusivo.</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
                        Configure um leilão público para a comunidade TCG Mega Store.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm space-y-8">
                                <div className="flex items-center gap-4 mb-4">
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Identificação da Carta</h2>
                                    <div className="h-[1px] flex-1 bg-slate-100" />
                                </div>

                                <div className="space-y-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar na Database TCGDex</label>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <input
                                            type="text"
                                            placeholder="Nome da TCG Card..."
                                            className="flex-1 h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-bold text-slate-900"
                                            value={cardName}
                                            onChange={(e) => setCardName(e.target.value)}
                                        />
                                        <select
                                            value={selectedSet}
                                            onChange={(e) => setSelectedSet(e.target.value)}
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
                                            className="h-14 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all disabled:opacity-50"
                                        >
                                            {searching ? 'Buscando...' : 'Buscar'}
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Carta</label>
                                        <input
                                            required value={cardName} onChange={e => setCardName(e.target.value)}
                                            placeholder="Charizard Base Set"
                                            className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Edição / Expansão</label>
                                        <input
                                            required value={cardSet} onChange={e => setCardSet(e.target.value)}
                                            placeholder="Base Set 1999"
                                            className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número da Carta <span className="text-rose-500">*</span></label>
                                        <input
                                            required value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                                            placeholder="021/094"
                                            className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                                        />
                                        <p className="text-[9px] text-slate-400 font-bold ml-1">Formato: 021/094</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Condição</label>
                                        <select
                                            value={condition} onChange={e => setCondition(e.target.value)}
                                            className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer text-slate-900"
                                        >
                                            <option value="M">Mint (M)</option>
                                            <option value="NM">Near Mint (NM)</option>
                                            <option value="LP">Lightly Played (LP)</option>
                                            <option value="MP">Moderately Played (MP)</option>
                                            <option value="HP">Heavily Played (HP)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma do Card</label>
                                        <select
                                            value={language} onChange={e => setLanguage(e.target.value)}
                                            className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer text-slate-900"
                                        >
                                            <option>Português</option>
                                            <option>Inglês</option>
                                            <option>Japonês</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da Imagem</label>
                                        <input
                                            value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                                            placeholder="https://images.pokemontcg.io/base1/4.png"
                                            className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-8 sm:p-12 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/10 rounded-bl-full -mr-20 -mt-20" />
                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500 whitespace-nowrap">Configuração do Leilão</h2>
                                    <div className="h-[1px] flex-1 bg-white/5" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Lance Inicial (BRL)</label>
                                        <input
                                            required type="number" min="1" step="0.01"
                                            value={startingBid} onChange={e => setStartingBid(e.target.value)}
                                            placeholder="500.00"
                                            className="w-full h-16 px-6 bg-white/5 border border-white/5 text-yellow-400 rounded-3xl focus:border-rose-600 focus:bg-black/20 outline-none transition-all font-black text-2xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Duração do Leilão</label>
                                        <select
                                            value={durationHours}
                                            onChange={e => setDurationHours(Number(e.target.value))}
                                            className="w-full h-16 px-6 bg-white/5 border border-white/5 text-white rounded-3xl focus:border-rose-600 focus:bg-black/20 outline-none transition-all font-black text-lg appearance-none cursor-pointer"
                                        >
                                            {durationOptions.map(opt => (
                                                <option key={opt.hours} value={opt.hours}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 relative z-10">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descrição Técnica</label>
                                    <textarea
                                        value={notes} onChange={e => setNotes(e.target.value)}
                                        rows={4}
                                        placeholder="Adicione detalhes sobre o estado da carta, centragem, brilho e qualquer detalhe relevante para o colecionador..."
                                        className="w-full p-8 bg-white/5 border border-white/5 text-slate-300 rounded-[30px] focus:border-rose-600 focus:bg-black/20 outline-none transition-all font-medium text-sm leading-relaxed"
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Right: Preview & Publish */}
                    <div className="space-y-8">
                        <div className="sticky top-12 space-y-8">
                            <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm space-y-6">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preview do Leilão</label>
                                <div className="aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[30px] overflow-hidden flex flex-col items-center justify-center p-8 group transition-all hover:border-rose-200 relative">
                                    {imageUrl ? (
                                        <div className="space-y-6 text-center animate-fade-in relative w-full">
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
                                                className="w-full h-auto rounded-xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                                            />
                                            {imageError && (
                                                <div className="absolute inset-0 flex items-center justify-center p-4">
                                                    <div className="bg-rose-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                                                        Imagem {language} indisponível - Usando Padrão
                                                    </div>
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <p className="font-black text-slate-900 tracking-tight text-xl leading-none">{cardName || '---'}</p>
                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">{cardSet || '---'}</p>
                                            </div>
                                            <div className="absolute bottom-4 right-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                {condition}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-4 opacity-40">
                                            <div className="text-5xl">🔨</div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando seleção...</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Lance Inicial_</span>
                                        <span className="text-slate-900 text-sm">{formatBRL(parseFloat(startingBid) || 0)}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleSubmit(e as any)}
                                        disabled={loading || !imageUrl}
                                        className="w-full h-16 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[25px] shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? 'PUBLICANDO...' : 'PUBLICAR LEILÃO'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-900 rounded-[30px] text-center space-y-2">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Contrato de Leilão</p>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                    Ao publicar, o leilão entrará em vigor imediatamente e não poderá ser cancelado se houver lances.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminGuard>
    );
}
