'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuction } from '@/hooks/useAuction';
import { supabase } from '@/lib/supabase';
import CountdownTimer from '@/components/CountdownTimer';
import PriceComparison from '@/components/PriceComparison';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const RuleItem = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
    <div className="flex gap-4 group/rule">
        <div className="h-10 w-10 shrink-0 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-lg shadow-sm group-hover/rule:border-rose-200 group-hover/rule:bg-rose-50 transition-all duration-300">
            {icon}
        </div>
        <div className="space-y-1">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{title}</h4>
            <p className="text-[9px] text-slate-400 font-bold leading-relaxed uppercase tracking-tight">{desc}</p>
        </div>
    </div>
);

let mpInitialized = false;

export default function AuctionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { auction, bids, loading, refetch } = useAuction(id);
    const [user, setUser] = useState<{ id: string; name: string } | null>(null);
    const [bidding, setBidding] = useState(false);
    const [bidError, setBidError] = useState('');
    const [bidSuccess, setBidSuccess] = useState(false);
    const [userCredits, setUserCredits] = useState<{ balance: number; locked: number } | null>(null);

    // Reload Modal State
    const [showReload, setShowReload] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositing, setDepositing] = useState(false);
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [depositError, setDepositError] = useState('');
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [imageError, setImageError] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showEndConfirmation, setShowEndConfirmation] = useState(false);
    const [endingAuction, setEndingAuction] = useState(false);

    useEffect(() => {
        if (!mpInitialized) {
            mpInitialized = true;
            initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY as string, { locale: 'pt-BR' });
        }

        supabase.auth.getUser()
            .then(({ data: { user } }) => {
                if (user) {
                    setUser({ id: user.id, name: user.user_metadata?.name || user.email || '' });

                    // Check if Admin
                    const ADMIN_EMAILS = ['admin@tcghub.com.br', 'contato@tcgmegastore.com.br'];
                    setIsAdmin(ADMIN_EMAILS.includes(user.email || ''));

                    // Fetch auction credits
                    supabase.from('auction_credits')
                        .select('balance, locked')
                        .eq('user_id', user.id)
                        .single()
                        .then(({ data }) => setUserCredits(data || { balance: 0, locked: 0 }));
                } else {
                    setUser(null);
                }
            })
            .catch(() => setUser(null));

        const interval = setInterval(() => {
            if (user && preferenceId) { // Check periodically if credits updated while modal is open
                supabase.from('auction_credits')
                    .select('balance, locked')
                    .eq('user_id', user.id)
                    .single()
                    .then(({ data }) => setUserCredits(data || { balance: 0, locked: 0 }));
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [user?.id, preferenceId]);

    useEffect(() => {
        if (auction?.imageUrl) {
            setCurrentImageUrl(auction.imageUrl);
            setImageError(false);
        }
    }, [auction?.imageUrl]);

    const isExpired = auction ? new Date(auction.endsAt) <= new Date() : false;

    const handleQuickDeposit = async () => {
        const amount = parseFloat(depositAmount);
        if (!amount || amount < 10) {
            setDepositError('Valor mínimo: R$ 10,00');
            return;
        }
        setDepositError('');
        setDepositing(true);
        setPreferenceId(null);

        try {
            const res = await fetch('/api/creditos/preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    userId: user?.id,
                    payerEmail: user?.name?.includes('@') ? user.name : undefined,
                    payerFirstName: user?.name?.split(' ')[0] || 'Cliente',
                    payerLastName: user?.name?.split(' ').slice(1).join(' ') || 'TCG'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPreferenceId(data.id);
        } catch (err: any) {
            setDepositError(err.message || 'Erro ao preparar checkout.');
        } finally {
            setDepositing(false);
        }
    };

    const handleEndAuction = async () => {
        if (!id || !user || !isAdmin) return;

        setEndingAuction(true);
        try {
            // Set end_at to now and status to finished
            const { error } = await supabase
                .from('auctions')
                .update({
                    ends_at: new Date().toISOString(),
                    status: 'finished'
                })
                .eq('id', id);

            if (error) throw error;

            setShowEndConfirmation(false);
            refetch();
        } catch (err) {
            console.error(err);
            alert('Erro ao finalizar leilão.');
        } finally {
            setEndingAuction(false);
        }
    };

    const handleBid = async (increment: number) => {
        setBidError('');
        setBidSuccess(false);

        if (!user) { router.push('/auth/login'); return; }
        if (!auction) return;

        const amount = auction.currentBid + increment;
        const available = (userCredits?.balance || 0) - (userCredits?.locked || 0);

        if (available < amount) {
            setBidError(`Créditos insuficientes. Você tem R$ ${available.toFixed(2)} disponíveis e o lance é de R$ ${amount.toFixed(2)}.`);
            return;
        }

        setBidding(true);
        try {
            const { data: result, error: rpcError } = await supabase.rpc('place_bid_with_credits', {
                p_bidder_id: user.id,
                p_auction_id: id,
                p_bid_amount: amount,
                p_prev_bidder_id: auction.highestBidderId || null,
                p_prev_bid_amount: auction.currentBid,
                p_bidder_name: user.name
            });

            if (rpcError) throw rpcError;
            if (result === 'insufficient_credits') {
                setBidError('Créditos insuficientes para cobrir este lance.');
                return;
            }

            const { error: bidEr } = await supabase.from('bids').insert({
                auction_id: id,
                user_id: user.id,
                user_name: user.name,
                amount,
                credit_locked: amount
            });
            if (bidEr) throw bidEr;

            const { error: auctionError } = await supabase.from('auctions').update({
                current_bid: amount,
                bid_count: auction.bidCount + 1,
                highest_bidder_id: user.id,
                highest_bidder_name: user.name,
            }).eq('id', id);
            if (auctionError) throw auctionError;

            setUserCredits(prev => prev ? { ...prev, locked: (prev.locked || 0) + amount } : prev);
            setBidSuccess(true);
            refetch();
        } catch (err) {
            console.error(err);
            setBidError('Erro ao registrar lance. Verifique sua conexão.');
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
                <h2 className="text-2xl font-black text-slate-900">Leilão não encontrado.</h2>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up border-t border-slate-50">

            {/* Breadcrumb */}
            <div className="flex items-center gap-3 mb-16">
                <button onClick={() => router.push('/leilao')} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
                    ← Leilões
                </button>
                <span className="text-slate-200 text-xs">/</span>
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest truncate max-w-xs">{auction.cardName}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

                {/* Left: Card Image & History */}
                <div className="space-y-8">
                    <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm group relative overflow-hidden">
                        <div className="absolute top-6 left-6 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-100 italic">
                            <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">{auction.condition}</span>
                        </div>
                        <img
                            src={currentImageUrl || auction.imageUrl}
                            alt={auction.cardName}
                            onError={() => {
                                if (!imageError && currentImageUrl) {
                                    setImageError(true);
                                    if (!currentImageUrl.includes('/pt/')) {
                                        const ptUrl = currentImageUrl.replace(/\/(ja|en)\//, '/pt/');
                                        setCurrentImageUrl(ptUrl);
                                    }
                                }
                            }}
                            className="w-full aspect-square object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                        {imageError && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                                <div className="bg-rose-600/90 backdrop-blur-sm text-white text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-lg border border-rose-400 whitespace-nowrap">
                                    Variant {auction.language || 'original'} unavailable - Fallback active
                                </div>
                            </div>
                        )}
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
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Leilão Certificado</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-tight uppercase">
                            {auction.cardName} <br />
                            <span className="text-rose-600 text-3xl">{auction.cardSet}</span>
                        </h1>
                        <div className="flex items-center gap-6">
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">STATUS DO LEILÃO</p>
                                <div className="flex items-center gap-2 group cursor-help">
                                    <span className={`h-2 w-2 rounded-full ${isExpired ? 'bg-slate-400' : 'bg-rose-600 animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.5)]'}`} />
                                    <p className="text-xs font-black text-slate-900 uppercase">{isExpired ? 'Encerrado' : 'Em Andamento'}</p>
                                </div>
                            </div>
                            <div className="w-[1px] h-8 bg-slate-100" />
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Coleção TCG</p>
                                <p className="text-xs font-black text-slate-900 uppercase">{auction.cardSet}</p>
                            </div>
                        </div>
                        {auction.notes && (
                            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-lg">{auction.notes}</p>
                        )}

                        {/* Admin Action */}
                        {isAdmin && !isExpired && (
                            <div className="pt-4 animate-fade-up">
                                <button
                                    onClick={() => setShowEndConfirmation(true)}
                                    className="px-6 h-10 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-rose-600 animate-pulse" />
                                    Encerrar Leilão Manualmente
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Countdown Timer */}
                    <div className="bg-slate-50 border border-slate-100 p-8 rounded-[30px] space-y-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {isExpired ? 'Status do Leilão' : 'Tempo Restante_'}
                        </p>
                        <CountdownTimer endsAt={auction.endsAt} size="lg" />
                    </div>

                    {/* Current Bid & Bid Count */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-12 -mt-12" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Lance Atual_</span>
                            <p className="text-3xl font-black text-yellow-400 tracking-tighter">{formatBRL(auction.currentBid)}</p>
                        </div>
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total de Lances_</span>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">{auction.bidCount}</p>
                        </div>
                    </div>

                    {/* Bid Area */}
                    {isExpired ? (
                        <div className="bg-slate-900 p-8 rounded-3xl space-y-4 relative overflow-hidden text-center">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-12 -mt-12" />
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] block">Leilão Encerrado</span>
                            <h2 className="text-2xl font-black text-white tracking-tighter">
                                {auction.highestBidderName ? `Vencedor: ${auction.highestBidderName}` : 'Sem lances registrados'}
                            </h2>
                            {auction.highestBidderName && (
                                <>
                                    <p className="text-yellow-400 font-black text-xl tracking-tighter mb-2">{formatBRL(auction.currentBid)}</p>
                                    {user?.id === auction.highestBidderId && (auction.status === 'active' || !auction.status) && (
                                        <button
                                            onClick={() => router.push(`/leilao/checkout/${id}`)}
                                            className="w-full mt-2 h-14 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20"
                                        >
                                            Finalizar Compra / Definir Frete
                                        </button>
                                    )}
                                    {user?.id === auction.highestBidderId && auction.status === 'finished' && (
                                        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                            ✓ Pagamento & Envio Confirmados
                                        </div>
                                    )}
                                </>
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
                                        Faça login para participar do leilão
                                    </p>
                                    <button
                                        onClick={() => router.push('/auth/login')}
                                        className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all"
                                    >
                                        Entrar no Sistema
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Créditos Disponíveis</p>
                                            <p className="text-lg font-black text-emerald-600">
                                                {formatBRL((userCredits?.balance || 0) - (userCredits?.locked || 0))}
                                            </p>
                                        </div>
                                        <button onClick={() => setShowReload(true)} className="h-9 px-4 bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all">
                                            Recarregar
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lances Rápidos (Soma ao Atual)</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[5, 10, 20, 50, 100, 200].map(val => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    disabled={bidding}
                                                    onClick={() => handleBid(val)}
                                                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 transition-all font-black text-sm text-slate-900 disabled:opacity-50"
                                                >
                                                    + {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {bidError && (
                                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest text-center">{bidError}</p>
                                        </div>
                                    )}
                                    {bidSuccess && (
                                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest text-center">✓ Lance registrado com sucesso!</p>
                                        </div>
                                    )}

                                    <p className="text-center text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-50">
                                        Participando como: {user.name}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tools Area */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Lance Inicial_</span>
                            <p className="text-sm font-black text-slate-900">{formatBRL(auction.startingBid)}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Encerra Em_</span>
                            <p className="text-sm font-black text-slate-900">{formatDate(auction.endsAt)}</p>
                        </div>
                    </div>

                    <PriceComparison cardName={auction.cardName} cardSet={auction.cardSet} cardNumber={auction.cardNumber} />

                    {/* General Rules Section */}
                    <div className="bg-slate-50/50 border border-slate-100 p-8 rounded-[40px] space-y-8 animate-fade-up">
                        <div className="flex items-center gap-4">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Regras Gerais</h2>
                            <div className="h-[1px] flex-1 bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                            <RuleItem
                                icon="⏱️"
                                title="Anti-sniper Ativo"
                                desc="Lances nos últimos 15 segundos adicionam +15s ao cronômetro."
                            />
                            <RuleItem
                                icon="🛡️"
                                title="Lance é Compromisso"
                                desc="Lances são vinculativos. O não pagamento gera banimento da plataforma."
                            />
                            <RuleItem
                                icon="📦"
                                title="Logística de Frete"
                                desc="O valor do frete é combinado diretamente com o vendedor após o término."
                            />
                            <RuleItem
                                icon="💳"
                                title="Saldo em Créditos"
                                desc="Certifique-se de ter saldo em conta para cobrir o valor total do seu lance."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Reload Modal */}
            {showReload && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl relative animate-fade-up">
                        <button onClick={() => { setShowReload(false); setPreferenceId(null); }} className="absolute top-8 right-8 text-slate-300 hover:text-rose-600 transition-colors">✕</button>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Recarga Rápida</h3>

                        {!preferenceId ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {[50, 100, 200, 500].map(v => (
                                        <button key={v} onClick={() => setDepositAmount(String(v))} className={`h-14 font-black rounded-2xl border transition-all ${depositAmount === String(v) ? 'bg-rose-600 text-white border-rose-600 shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300'}`}>R$ {v}</button>
                                    ))}
                                </div>
                                <input type="number" placeholder="Outro valor..." value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="w-full h-14 px-6 border border-slate-200 rounded-2xl text-slate-900 font-black text-sm outline-none focus:border-rose-600 transition-all font-mono" />

                                {depositError && <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest text-center">{depositError}</p>}

                                <button onClick={handleQuickDeposit} disabled={depositing || !depositAmount} className="w-full h-16 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-rose-700 transition-all disabled:opacity-50 shadow-xl shadow-rose-100">
                                    {depositing ? 'Gerando Checkout...' : 'Confirmar Depósito'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 text-center">
                                <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl mb-4 flex justify-between items-center text-left">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor da Recarga</p>
                                        <p className="text-2xl font-black text-slate-900">R$ {parseFloat(depositAmount).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <button onClick={() => setPreferenceId(null)} className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline">Alterar</button>
                                </div>

                                <Wallet
                                    initialization={{ preferenceId }}
                                />

                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest animate-pulse mt-4">Aguardando pagamento seguro...</p>
                                <button onClick={() => { setShowReload(false); setPreferenceId(null); }} className="w-full h-14 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-200">Voltar pro Leilão</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* End Confirmation Modal */}
            {showEndConfirmation && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl relative animate-fade-up border border-slate-100">
                        <div className="text-center space-y-6">
                            <div className="h-20 w-20 bg-rose-50 rounded-[28px] flex items-center justify-center text-4xl mx-auto border border-rose-100 animate-bounce">⚠️</div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Encerrar Leilão?</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                                    Esta ação é irreversível. O leilão será finalizado imediatamente e o vencedor será o portador do lance atual.
                                </p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-left">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lance Atual</p>
                                    <p className="text-lg font-black text-slate-900">{formatBRL(auction.currentBid)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Vencedor</p>
                                    <p className="text-xs font-black text-rose-600 uppercase">{auction.highestBidderName || 'Nenhum'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <button
                                    onClick={() => setShowEndConfirmation(false)}
                                    disabled={endingAuction}
                                    className="h-16 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleEndAuction}
                                    disabled={endingAuction}
                                    className="h-16 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {endingAuction ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirmar Encerramento'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
