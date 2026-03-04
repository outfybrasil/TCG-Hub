'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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

export default function CreateAuctionPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [cardName, setCardName] = useState('');
    const [cardSet, setCardSet] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [condition, setCondition] = useState('NM');
    const [startingBid, setStartingBid] = useState('');
    const [durationHours, setDurationHours] = useState(24);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUser(user);
                } else {
                    router.push('/auth/login');
                }
            } catch (error) {
                router.push('/auth/login');
            } finally {
                setAuthLoading(false);
            }
        };

        checkSession();
    }, [router]);

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
            }).select('id').single();

            if (error) throw error;
            router.push(`/leilao/${data.id}`);
        } catch (err) {
            console.error(err);
            alert('Erro ao criar pregão. Verifique se as tabelas do Supabase estão configuradas e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user || user.email !== 'admin@tcghub.com.br') {
        return (
            <div className="max-w-7xl mx-auto px-6 py-32 text-center animate-fade-up">
                <div className="max-w-md mx-auto space-y-8 bg-white p-12 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-rose-100">🔒</div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Acesso Restrito ao <span className="text-rose-600">Admin</span></h2>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-relaxed">Apenas o administrador da TCG Mega Store pode criar leilões.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-up">
            <div className="mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Protocolo de Criação de Pregão</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                    Novo Pregão <span className="text-rose-600">Exclusivo.</span>
                </h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
                    Configure um leilão público para a comunidade TCG Mega Store.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                {/* Card Data */}
                <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-sm space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Identificação da Carta</h2>
                        <div className="h-[1px] flex-1 bg-slate-100" />
                    </div>

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
                                pattern="\d{1,3}/\d{1,3}"
                                title="Formato: 021/094"
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

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da Imagem</label>
                        <input
                            value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                            placeholder="https://images.pokemontcg.io/base1/4.png"
                            className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                        />
                        <p className="text-[9px] text-slate-400 font-bold ml-1">Use o formato: https://images.pokemontcg.io/{'{set_code}'}/{'{number}'}.png</p>
                    </div>
                </div>

                {/* Auction Config – dark section */}
                <div className="bg-slate-900 p-8 sm:p-12 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/10 rounded-bl-full -mr-20 -mt-20" />
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500 whitespace-nowrap">Configuração do Pregão</h2>
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
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Duração do Pregão</label>
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

                <div className="pt-6">
                    <button
                        disabled={loading}
                        className="w-full h-20 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[30px] shadow-2xl shadow-rose-500/30 hover:bg-rose-700 transition-all transform hover:-translate-y-1.5 disabled:opacity-50"
                    >
                        {loading ? 'INICIANDO PREGÃO...' : 'PUBLICAR PREGÃO NA TCG Mega Store'}
                    </button>
                    <p className="text-center mt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-50">
                        O pregão será visível publicamente imediatamente após a publicação.
                    </p>
                </div>
            </form>
        </div>
    );
}
