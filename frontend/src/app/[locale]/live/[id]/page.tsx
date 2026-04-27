'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import LiveChat from '@/components/LiveChat';

export default function LiveRoomPage() {
    const params = useParams();
    const router = useRouter();
    const liveId = params.id as string;
    
    const [liveData, setLiveData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bidding, setBidding] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [winnerHistory, setWinnerHistory] = useState<any[]>([]);
    const [userBalance, setUserBalance] = useState<number | null>(null);
    const [customBid, setCustomBid] = useState<string>('');
    const [viewerCount, setViewerCount] = useState<number>(1);

    useEffect(() => {
        loadSession();

        const timer = setInterval(() => {
            setLiveData((prev: any) => {
                if (!prev || !prev.ends_at) return prev;
                const msLeft = new Date(prev.ends_at).getTime() - Date.now();
                const secondsLeft = Math.max(0, Math.floor(msLeft / 1000));
                setTimeLeft(secondsLeft);
                return prev;
            });
        }, 1000);

        const channel = supabase.channel(`live_bids_${liveId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_auctions', filter: `id=eq.${liveId}` }, (payload) => {
                setLiveData(payload.new);
                if (payload.new.ends_at) {
                    const msLeft = new Date(payload.new.ends_at).getTime() - Date.now();
                    setTimeLeft(Math.max(0, Math.floor(msLeft / 1000)));
                } else {
                    setTimeLeft(0);
                }
            })
            .subscribe();

        const historyChannel = supabase.channel(`live_history_${liveId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_auction_history', filter: `live_id=eq.${liveId}` }, (payload) => {
                setWinnerHistory(prev => {
                    // Deduplica: ignora se já existe um item com o mesmo id
                    if (prev.some(h => h.id === payload.new.id)) return prev;
                    return [payload.new, ...prev].slice(0, 5);
                });
            })
            .subscribe();

        return () => {
            clearInterval(timer);
            supabase.removeChannel(channel);
            supabase.removeChannel(historyChannel);
        };
    }, [liveId]);

    // Track Realtime Presence (Viewer Count)
    useEffect(() => {
        const presenceChannel = supabase.channel(`live_presence_${liveId}`, {
            config: { presence: { key: userId || Math.random().toString() } }
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                setViewerCount(Math.max(1, Object.keys(state).length));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, [liveId, userId]);

    const fetchHistory = async () => {
        try {
            const res = await fetch(`/api/live/history?liveId=${liveId}`);
            if (res.ok) {
                const json = await res.json();
                setWinnerHistory(json.history || []);
            }
        } catch (err) {
            console.error('Erro ao buscar historico:', err);
        }
    };

    const loadSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUserId(session?.user?.id || null);
        setUserName(session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '');

        if (session?.user?.id) {
            const { data: wallet } = await supabase
                .from('auction_credits')
                .select('balance, locked')
                .eq('user_id', session.user.id)
                .single();
            if (wallet) setUserBalance(wallet.balance - wallet.locked);
        }

        const { data, error } = await supabase.from('live_auctions').select('*').eq('id', liveId).single();
        if (error || !data) { router.push('/lives'); return; }

        setLiveData(data);
        if (data.ends_at) setTimeLeft(Math.max(0, Math.floor((new Date(data.ends_at).getTime() - Date.now()) / 1000)));
        setLoading(false);
        
        // Busca o histórico após carregar os dados da live
        await fetchHistory();
    };

    const placeBid = async (amount: number, isAbsolute: boolean = false) => {
        if (!userId) { alert('Faça login para participar.'); router.push('/auth/login'); return; }
        if (timeLeft <= 0) { alert('Lote encerrado.'); return; }
        if (!liveData || bidding) return;

        setBidding(true);
        const nextBid = isAbsolute ? amount : Number(liveData.current_bid) + amount;

        if (nextBid <= Number(liveData.current_bid)) {
            alert('O lance deve ser maior que o lance atual.');
            setBidding(false);
            return;
        }

        const { data, error } = await supabase.rpc('place_live_bid', {
            p_live_id: liveId,
            p_user_id: userId,
            p_amount: nextBid,
            p_user_name: userName
        });

        if (error) {
            alert(`Erro: ${error.message}`);
        } else if (data && !data.success) {
            alert('Não foi possível processar: ' + data.message);
        } else {
            setCustomBid('');
            // Anti-sniper
            const msLeft = new Date(liveData.ends_at).getTime() - Date.now();
            if (msLeft > 0 && msLeft <= 15000) {
                await supabase.from('live_auctions').update({ ends_at: new Date(Date.now() + 15000).toISOString() }).eq('id', liveId);
            }
            const { data: wallet } = await supabase.from('auction_credits').select('balance, locked').eq('user_id', userId).single();
            if (wallet) setUserBalance(wallet.balance - wallet.locked);
        }
        setBidding(false);
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center" style={{ background: '#0c1324' }}>
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-t-rose-600 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/50 font-black uppercase tracking-widest text-xs">Conectando à Arena...</p>
            </div>
        </div>
    );
    if (liveData?.status === 'ENDED') return (
        <div className="h-screen flex flex-col items-center justify-center" style={{ background: '#0c1324' }}>
            <span className="text-6xl mb-4">📺</span>
            <h2 className="text-white font-black uppercase tracking-widest text-xl">Transmissão Encerrada</h2>
            <p className="text-white/40 mt-2 text-sm">Obrigado por participar!</p>
        </div>
    );

    const isSold = timeLeft <= 0 && liveData?.current_item_name && liveData?.current_item_name !== 'Aguardando Lote...';
    const isWaiting = !liveData?.ends_at || liveData?.current_item_name === 'Aguardando Lote...';
    const timerColor = timeLeft <= 10 ? '#e11d48' : timeLeft <= 30 ? '#f59e0b' : '#ffffff';

    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0c1324', fontFamily: 'Inter, sans-serif' }}>

            {/* TOP BAR */}
            <div className="flex items-center justify-between px-6 py-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(12,19,36,0.95)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shadow-[0_0_12px_#e11d48]"></div>
                    <span className="text-white font-black uppercase tracking-widest text-xs">TCG MEGASTORE</span>
                    <span className="text-white/30 font-bold text-xs">·</span>
                    <span className="text-white/50 font-medium text-xs truncate max-w-[300px]">{liveData?.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-black" style={{ color: '#6ee591' }}>
                    <span>●</span>
                    <span>{viewerCount} Online</span>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex flex-1 min-h-0">

                {/* LEFT: VIDEO */}
                <div className="flex flex-col" style={{ width: '38%', background: '#070d1f', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1 relative overflow-hidden">
                        {liveData?.video_url ? (
                            <iframe
                                src={liveData.video_url.includes('twitch.tv')
                                    ? `https://player.twitch.tv/?channel=${liveData.video_url.split('/').pop()}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`
                                    : liveData.video_url}
                                className="w-full h-full border-0"
                                allowFullScreen
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                <span className="text-5xl">📡</span>
                                <p className="font-black uppercase tracking-widest text-xs">Aguardando Sinal...</p>
                            </div>
                        )}
                    </div>

                    {/* ÚLTIMOS ARREMATES */}
                    <div className="shrink-0" style={{ height: '220px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Últimos Arremates</span>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar" style={{ height: '165px' }}>
                            {winnerHistory.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Sem arremates ainda</p>
                                </div>
                            ) : winnerHistory.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        {item.item_image ? <img src={item.item_image} alt="" className="w-full h-full object-contain" /> : <span className="text-lg">{item.item_type === 'Carta' ? '🎴' : '📦'}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-white truncate uppercase tracking-tight">{item.item_name}</p>
                                        <p className="text-xs font-bold truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.winner_name}</p>
                                    </div>
                                    <span className="text-xs font-black tabular-nums shrink-0" style={{ color: '#f59e0b' }}>R$ {Number(item.final_bid).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CENTER: AUCTION */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(225,29,72,0.08) 0%, transparent 70%)' }}></div>

                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                        {isWaiting ? (
                            <div className="text-center">
                                <div className="w-24 h-24 border-4 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ borderColor: 'rgba(225,29,72,0.2)', borderTopColor: '#e11d48', animation: 'spin 3s linear infinite' }}>
                                    <span className="text-3xl">🔨</span>
                                </div>
                                <h2 className="text-white font-black uppercase tracking-widest text-2xl mb-2">Aguardando Lote...</h2>
                                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>O streamer está preparando o próximo item</p>
                            </div>
                        ) : (
                            <div className="w-full max-w-lg">
                                {/* Item badge */}
                                <div className="flex items-center gap-2 mb-4 justify-center">
                                    <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></div>
                                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#e11d48' }}>LOTE EM DISPUTA</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-black uppercase" style={{ background: 'rgba(225,29,72,0.15)', color: '#e11d48' }}>{liveData?.current_item_type || 'Geral'}</span>
                                </div>

                                {/* Item image */}
                                {liveData?.current_item_image && (
                                    <div className="mx-auto mb-6 rounded-2xl overflow-hidden" style={{ width: '200px', height: '200px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(225,29,72,0.3)', boxShadow: '0 0 40px rgba(225,29,72,0.15)' }}>
                                        <img src={liveData.current_item_image} alt="Item" className="w-full h-full object-contain" />
                                    </div>
                                )}

                                {/* Item name */}
                                <h1 className="text-center text-white font-black uppercase text-3xl tracking-tighter leading-tight mb-8" style={{ textShadow: '0 0 40px rgba(225,29,72,0.3)' }}>
                                    {liveData?.current_item_name}
                                </h1>

                                {/* Stats grid */}
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Lance Atual</p>
                                        <p className="text-2xl font-black tabular-nums" style={{ color: '#f59e0b' }}>R$ {Number(liveData?.current_bid || 0).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${timeLeft <= 10 ? 'rgba(225,29,72,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                                        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Encerra em</p>
                                        <p className="text-2xl font-black tabular-nums font-mono" style={{ color: timerColor, textShadow: timeLeft <= 10 ? '0 0 20px rgba(225,29,72,0.5)' : 'none', animation: timeLeft <= 10 ? 'pulse 1s infinite' : 'none' }}>
                                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Novo Dono</p>
                                        <p className="text-lg font-black truncate" style={{ color: '#6ee591' }}>{liveData?.winning_user_name || '—'}</p>
                                    </div>
                                </div>

                                {/* Você está ganhando */}
                                {liveData?.winning_user_id === userId && userId && (
                                    <div className="text-center py-2.5 rounded-xl font-black uppercase text-xs tracking-widest mb-4 animate-pulse" style={{ background: 'rgba(110,229,145,0.1)', color: '#6ee591', border: '1px solid rgba(110,229,145,0.2)' }}>
                                        👑 VOCÊ ESTÁ GANHANDO!
                                    </div>
                                )}

                                {/* Anti-sniper badge */}
                                <div className="flex justify-center">
                                    <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                                        🛡️ Anti-Sniper Ativo (+15s)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* VENDIDO OVERLAY */}
                    {isSold && (
                        <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: 'rgba(7,13,31,0.85)', backdropFilter: 'blur(12px)' }}>
                            <div className="text-center p-10 rounded-[40px] max-w-sm w-full" style={{ background: 'rgba(25,31,49,0.95)', border: '1px solid rgba(225,29,72,0.3)', boxShadow: '0 30px 80px rgba(225,29,72,0.2)' }}>
                                <div className="text-6xl mb-4">💎</div>
                                <h3 className="text-5xl font-black uppercase tracking-tighter text-white mb-2">VENDIDO!</h3>
                                {liveData?.winning_user_id ? (
                                    <>
                                        <p className="text-sm font-bold mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                            Arrematado por <span style={{ color: '#f59e0b' }}>R$ {Number(liveData.current_bid).toFixed(2).replace('.', ',')}</span>
                                        </p>
                                        <div className="py-4 rounded-2xl" style={{ background: 'rgba(110,229,145,0.08)', border: '1px solid rgba(110,229,145,0.2)' }}>
                                            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Novo Dono</p>
                                            <p className="text-2xl font-black uppercase tracking-tight" style={{ color: '#6ee591' }}>{liveData.winning_user_name}</p>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm font-medium mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Nenhuma oferta. Aguarde o próximo lote!</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* BIDDING BAR */}
                    <div className="shrink-0 px-6 py-4 flex items-center gap-4 flex-wrap" style={{ background: 'rgba(7,13,31,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
                        {userId && userBalance !== null && (
                            <div className="rounded-xl px-4 py-2 shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Saldo</p>
                                <p className="text-lg font-black tabular-nums" style={{ color: '#6ee591' }}>R$ {userBalance.toFixed(2).replace('.', ',')}</p>
                            </div>
                        )}

                        {/* Custom bid */}
                        <div className="flex items-center rounded-xl overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span className="px-3 font-black text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>R$</span>
                            <input
                                type="number"
                                value={customBid}
                                onChange={(e) => setCustomBid(e.target.value)}
                                placeholder="Livre..."
                                className="bg-transparent text-white font-black text-sm outline-none w-20 py-2.5 tabular-nums"
                                style={{ caretColor: '#e11d48' }}
                            />
                            <button
                                disabled={bidding || timeLeft <= 0 || !customBid || Number(customBid) <= Number(liveData?.current_bid)}
                                onClick={() => placeBid(Number(customBid), true)}
                                className="px-4 py-2.5 font-black uppercase text-xs tracking-widest transition-all"
                                style={{ background: bidding || !customBid ? 'rgba(255,255,255,0.1)' : '#e11d48', color: bidding || !customBid ? 'rgba(255,255,255,0.3)' : 'white' }}
                            >
                                Enviar
                            </button>
                        </div>

                        {/* Quick bids */}
                        <div className="flex gap-2 flex-wrap">
                            {[5, 10, 50, 100].map(amt => {
                                const total = (Number(liveData?.current_bid) || 0) + amt;
                                return (
                                    <button
                                        key={amt}
                                        disabled={bidding || timeLeft <= 0}
                                        onClick={() => placeBid(amt)}
                                        className="flex flex-col items-center px-4 py-2 rounded-xl font-black transition-all active:scale-95"
                                        style={{
                                            background: bidding || timeLeft <= 0 ? 'rgba(255,255,255,0.05)' : 'rgba(225,29,72,0.1)',
                                            border: `1px solid ${bidding || timeLeft <= 0 ? 'rgba(255,255,255,0.08)' : 'rgba(225,29,72,0.3)'}`,
                                            color: bidding || timeLeft <= 0 ? 'rgba(255,255,255,0.3)' : 'white'
                                        }}
                                    >
                                        <span className="text-xs font-bold opacity-60">+{amt}</span>
                                        <span className="text-sm font-black" style={{ color: bidding || timeLeft <= 0 ? 'rgba(255,255,255,0.3)' : '#f59e0b' }}>R$ {total}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT: CHAT */}
                <div className="flex flex-col shrink-0" style={{ width: '280px', borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#070d1f' }}>
                    <div className="px-4 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Chat Ao Vivo</span>
                        <span className="text-xs font-black px-2 py-0.5 rounded" style={{ background: 'rgba(110,229,145,0.1)', color: '#6ee591' }}>● Msg Simultâneas</span>
                    </div>
                    <div className="flex-1 min-h-0">
                        <LiveChat liveId={liveId} currentUser={userId ? { id: userId, name: userName } : null} />
                    </div>
                </div>
            </div>

            <style jsx global>{`
                nav, footer { display: none !important; }
                body { overflow: hidden !important; background: #0c1324 !important; padding-bottom: 0 !important; }
                main { padding-top: 0 !important; min-height: 100dvh !important; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 20px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            `}</style>
        </div>
    );
}
