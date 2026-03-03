'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuction } from '@/hooks/useAuction';
import { supabase } from '@/lib/supabase';
import CountdownTimer from '@/components/CountdownTimer';
import PriceComparison from '@/components/PriceComparison';

const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function AuctionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { auction, bids, loading, refetch } = useAuction(id);
    const [user, setUser] = useState<{ id: string; name: string } | null>(null);
    const [bidAmount, setBidAmount] = useState('');
    const [bidding, setBidding] = useState(false);
    const [bidError, setBidError] = useState('');
    const [bidSuccess, setBidSuccess] = useState(false);

    useEffect(() => {
        supabase.auth.getUser()
            .then(({ data: { user } }) => {
                if (user) {
                    setUser({ id: user.id, name: user.user_metadata?.name || user.email });
                } else {
                    setUser(null);
                }
            })
            .catch(() => setUser(null));
    }, []);

    const isExpired = auction ? new Date(auction.endsAt) <= new Date() : false;
    const minBid = auction ? auction.currentBid + 1 : 0;

    const handleBid = async (e: React.FormEvent) => {
        e.preventDefault();
        setBidError('');
        setBidSuccess(false);
        const amount = parseFloat(bidAmount);

        if (!user) { router.push('/auth/login'); return; }
        if (!auction) return;
        if (amount <= auction.currentBid) {
            setBidError(`O lance deve ser superior a ${formatBRL(auction.currentBid)}.`);
            return;
        }

        setBidding(true);
        try {
            // Register bid
            const { error: bidError } = await supabase.from('bids').insert({
                auction_id: id,
                user_id: user.id,
                user_name: user.name,
                amount
            });
            if (bidError) throw bidError;

            // Update auction's current bid
            const { error: auctionError } = await supabase.from('auctions').update({
                current_bid: amount,
                bid_count: auction.bidCount + 1,
                highest_bidder_id: user.id,
                highest_bidder_name: user.name,
            }).eq('id', id);

            if (auctionError) throw auctionError;

            setBidSuccess(true);
            setBidAmount('');
            refetch();
        } catch (err) {
            console.error(err);
            setBidError('Erro ao registrar lance. Verifique a conexão com o Supabase.');
        } finally {
            setBidding(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!auction) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-32 text-center">
                <h2 className="text-2xl font-black text-slate-900">Pregão não encontrado.</h2>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up border-t border-slate-50">

            {/* Breadcrumb */}
            <div className="flex items-center gap-3 mb-16">
                <button onClick={() => router.push('/leilao')} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
                    ← Pregões
                </button>
                <span className="text-slate-200 text-xs">/</span>
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest truncate max-w-xs">{auction.cardName}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

                {/* Left: Card Image */}
                <div className="space-y-8">
                    <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm group relative overflow-hidden">
                        <div className="absolute top-6 left-6 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">{auction.condition}</span>
                        </div>
                        <img
                            src={auction.imageUrl}
                            alt={auction.cardName}
                            className="w-full aspect-square object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>

                    {/* Bid History */}
                    <div className="bg-white border border-slate-200 rounded-[30px] overflow-hidden shadow-sm">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Histórico de Lances</h3>
                        </div>
                        {bids.length === 0 ? (
                            <div className="px-8 py-10 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nenhum lance ainda. Seja o primeiro!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {bids.slice(0, 8).map((bid, i) => (
                                    <div key={bid.id} className={`flex justify-between items-center px-8 py-4 transition-colors ${i === 0 ? 'bg-rose-50/30' : 'hover:bg-slate-50/40'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[8px] font-black ${i === 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {i === 0 ? '🏆' : i + 1}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-900">{bid.userName}</span>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <p className={`text-sm font-black tracking-tight ${i === 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                                {formatBRL(bid.amount)}
                                            </p>
                                            <p className="text-[8px] text-slate-400 font-bold">{formatDate(bid.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Info + Bid Form */}
                <div className="space-y-10">

                    {/* Card Identity */}
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Pregão #{auction.id.slice(-6).toUpperCase()}</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{auction.cardSet}_</p>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none uppercase">
                            {auction.cardName}
                        </h1>
                        {auction.notes && (
                            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-lg">{auction.notes}</p>
                        )}
                    </div>

                    {/* Countdown Hero */}
                    <div className="space-y-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {isExpired ? 'Status do Pregão' : 'Tempo Restante_'}
                        </span>
                        <CountdownTimer endsAt={auction.endsAt} size="lg" />
                    </div>

                    {/* Current Bid Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 p-6 rounded-2xl">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Lance Atual_</span>
                            <p className="text-3xl font-black text-yellow-400 tracking-tighter">{formatBRL(auction.currentBid)}</p>
                        </div>
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total de Lances_</span>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">{auction.bidCount}</p>
                        </div>
                    </div>

                    {auction.highestBidderName && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-lg">🏆</span>
                            <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Maior Lance Por_</span>
                                <span className="text-sm font-black text-slate-900">{auction.highestBidderName}</span>
                            </div>
                        </div>
                    )}

                    {/* Bid Form or Closed banner */}
                    {isExpired ? (
                        <div className="bg-slate-900 p-8 rounded-3xl space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-12 -mt-12" />
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] block">Pregão Encerrado</span>
                            <h2 className="text-2xl font-black text-white tracking-tighter">
                                {auction.highestBidderName ? `Vencedor: ${auction.highestBidderName}` : 'Sem lances registrados'}
                            </h2>
                            {auction.highestBidderName && (
                                <p className="text-yellow-400 font-black text-xl">{formatBRL(auction.currentBid)}</p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Dar Lance</h2>
                                <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>

                            {!user ? (
                                <div className="text-center py-4 space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Faça login para participar do pregão
                                    </p>
                                    <button
                                        onClick={() => router.push('/auth/login')}
                                        className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all"
                                    >
                                        Entrar no Sistema
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleBid} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Seu Lance (Mín: {formatBRL(minBid)})
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={minBid}
                                            step="0.01"
                                            value={bidAmount}
                                            onChange={e => { setBidAmount(e.target.value); setBidError(''); setBidSuccess(false); }}
                                            placeholder={String(minBid)}
                                            className="w-full h-16 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-black text-2xl text-slate-900"
                                        />
                                    </div>

                                    {bidError && (
                                        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                            <span className="text-rose-600 text-xs">⚠</span>
                                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-wide">{bidError}</p>
                                        </div>
                                    )}

                                    {bidSuccess && (
                                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                                            <span className="text-green-600 text-xs">✓</span>
                                            <p className="text-[9px] font-black text-green-700 uppercase tracking-wide">Lance registrado com sucesso!</p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={bidding}
                                        className="w-full h-16 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                        {bidding ? 'Registrando Lance...' : 'Confirmar Lance →'}
                                    </button>

                                    <p className="text-center text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-50">
                                        Participando como: {user.name}
                                    </p>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Lance Inicial_</span>
                            <p className="text-sm font-black text-slate-900">{formatBRL(auction.startingBid)}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Encerra Em_</span>
                            <p className="text-sm font-black text-slate-900">{formatDate(auction.endsAt)}</p>
                        </div>
                    </div>

                    {/* External Price Comparison */}
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                        <PriceComparison cardName={auction.cardName} cardSet={auction.cardSet} cardNumber={auction.cardNumber} size="md" />
                    </div>

                </div>
            </div>
        </div>
    );
}
