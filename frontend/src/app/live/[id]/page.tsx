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
    const [hasPlacedBid, setHasPlacedBid] = useState(false);

    useEffect(() => {
        loadSession();
        
        // Timer Loop (1s) para decrementar o tempo visualmente
        const timer = setInterval(() => {
            setLiveData((prev: any) => {
                if (!prev || !prev.ends_at) return prev;
                const msLeft = new Date(prev.ends_at).getTime() - Date.now();
                const secondsLeft = Math.max(0, Math.floor(msLeft / 1000));
                setTimeLeft(secondsLeft);
                // Parar o timer quando chegar a 0
                if (secondsLeft <= 0) clearInterval(timer);
                return prev;
            });
        }, 1000);

        // Assinar WebSockets dessa Live especifica
        const channel = supabase.channel(`live_bids_${liveId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_auctions', filter: `id=eq.${liveId}` }, (payload) => {
                setLiveData(payload.new);
                // Calcula o tempo imediatamente ao receber o novo payload
                if (payload.new.ends_at) {
                    const msLeft = new Date(payload.new.ends_at).getTime() - Date.now();
                    setTimeLeft(Math.max(0, Math.floor(msLeft / 1000)));
                } else {
                    setTimeLeft(0);
                }
            })
            .subscribe();

        // Assinar Novas Vitrines de Vencedores
        const historyChannel = supabase.channel(`live_history_${liveId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_auction_history', filter: `live_id=eq.${liveId}` }, (payload) => {
                console.log("NOVO ARREMATE RECEBIDO:", payload.new);
                setWinnerHistory(prev => [payload.new, ...prev].slice(0, 5));
            })
            .subscribe();

        return () => {
            clearInterval(timer);
            supabase.removeChannel(channel);
            supabase.removeChannel(historyChannel);
        };
    }, [liveId]);

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

        const { data, error } = await supabase
            .from('live_auctions')
            .select('*')
            .eq('id', liveId)
            .single();
        
        // Buscar Histórico Existente
        const { data: history } = await supabase
            .from('live_auction_history')
            .select('*')
            .eq('live_id', liveId)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (history) setWinnerHistory(history);

        if (error || !data) {
            router.push('/lives');
            return;
        } else {
            setLiveData(data);
            if (data.ends_at) {
                setTimeLeft(Math.max(0, Math.floor((new Date(data.ends_at).getTime() - Date.now()) / 1000)));
            }
        }
        setLoading(false);
    };

    const placeBid = async (addedAmount: number) => {
        if (!userId) {
            alert('Faça login para participar do leilão.');
            router.push('/auth/login');
            return;
        }
        if (timeLeft <= 0) {
            alert('Você não pode dar lance num lote encerrado.');
            return;
        }
        if (!liveData || bidding) return;
        
        setBidding(true);
        const nextBid = Number(liveData.current_bid) + addedAmount;
        console.log("Dando lance de:", nextBid, "para live:", liveId);

        const { data, error } = await supabase.rpc('place_live_bid', {
            p_live_id: liveId,
            p_user_id: userId,
            p_amount: nextBid,
            p_user_name: userName
        });

        if (error) {
            console.error("ERRO RPC DETALHADO:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            alert(`Erro no banco: ${error.message} (${error.code})`);
        } else if (data && !data.success) {
            console.warn("Lance recusado pelo servidor:", data.message);
            alert("Não foi possível processar: " + data.message);
        } else {
            console.log("Lance processado com sucesso!", data);
            setHasPlacedBid(true);
            // Atualizar saldo local após lance com sucesso
            const { data: wallet } = await supabase
                .from('auction_credits')
                .select('balance, locked')
                .eq('user_id', userId)
                .single();
            if (wallet) setUserBalance(wallet.balance - wallet.locked);
        }
        
        setBidding(false);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-emerald-500 animate-pulse font-black uppercase tracking-widest">Conectando à Arena...</div>;
    if (liveData?.status === 'ENDED') return <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-500 font-black uppercase tracking-widest"><span className="text-6xl mb-4">📺</span> Transmissão Encerrada</div>;

    // Extrair ID da Twitch do video_url (Ex: https://twitch.tv/gaules -> gaules)
    const twitchChannel = liveData?.video_url?.match(/twitch\.tv\/([a-zA-Z0-9_]+)/)?.[1];

    return (
        <div className="h-screen bg-slate-950 text-white selection:bg-rose-500/30 overflow-hidden font-sans flex flex-col lg:flex-row">
            
            {/* 🎥 Lado Esquerdo: Transmissão e Controles (Largo) */}
            <div className="flex-1 flex flex-col relative bg-black border-r border-white/5">
                
                {/* 📺 Video Central Area */}
                <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                    {liveData.video_url ? (
                        <div className="w-full h-full">
                            <iframe 
                                src={liveData.video_url.includes('twitch.tv') 
                                    ? `https://player.twitch.tv/?channel=${liveData.video_url.split('/').pop()}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`
                                    : liveData.video_url}
                                className="w-full h-full border-0"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-slate-800">
                             <div className="w-20 h-20 rounded-full border-4 border-slate-900 border-t-rose-500 animate-spin"></div>
                             <p className="font-black uppercase tracking-widest text-[10px]">Aguardando Sinal...</p>
                        </div>
                    )}

                    {/* 🏷️ Overlay: Item Atual */}
                    <div className={`absolute top-8 left-8 z-10 max-w-sm transition-all duration-500 ${!liveData.current_item_name || timeLeft <= 0 ? 'opacity-0 -translate-x-10 pointer-events-none' : 'opacity-100 translate-x-0'}`}>
                        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-6 rounded-[32px] shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                            
                            {liveData.current_item_image && (
                                <div className="relative aspect-video rounded-2xl overflow-hidden mb-5 border border-white/10 bg-black/40">
                                    <img src={liveData.current_item_image} alt="Produto" className="w-full h-full object-contain" />
                                </div>
                            )}

                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                                    LOTE EM DISPUTA
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    • {liveData.current_item_type || 'Geral'}
                                </span>
                            </div>
                            
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight mb-6">
                                {liveData.current_item_name}
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Lance Atual</div>
                                    <div className="text-2xl font-black text-emerald-400">R$ {liveData.current_bid?.toFixed(2).replace('.', ',')}</div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Encerra em</div>
                                    <div className={`text-2xl font-black ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Player Status Indicator */}
                            {liveData.winning_user_id === userId && liveData.winning_user_id !== null && (
                                <div className="mt-4 bg-emerald-500 text-emerald-950 text-[10px] font-black uppercase tracking-[0.2em] py-2.5 rounded-xl text-center shadow-[0_5px_15px_rgba(16,185,129,0.3)] animate-pulse">
                                    👑 VOCÊ ESTÁ GANHANDO!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 🔨 Overlay: Arrematado / Encerrado */}
                    {timeLeft <= 0 && liveData.current_item_name && liveData.current_item_name !== 'Aguardando Lote...' && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
                            <div className="bg-slate-900 border border-white/10 p-10 rounded-[48px] text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] max-w-sm animate-in zoom-in-95 duration-300">
                                <div className="text-6xl mb-6">{liveData.winning_user_id ? '💎' : '💨'}</div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
                                    {liveData.winning_user_id ? 'VENDIDO!' : 'SEM LANCES'}
                                </h3>
                                
                                {liveData.winning_user_id ? (
                                    <>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                            Arrematado por R$ {Number(liveData.current_bid).toFixed(2).replace('.', ',')}
                                        </p>
                                        <div className="mt-8 pt-8 border-t border-white/5">
                                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] mb-2">Novo Dono_</p>
                                            <div className="text-2xl font-black text-emerald-400 truncate tracking-tighter uppercase px-4">
                                                {liveData.winning_user_name}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-slate-500 font-medium text-sm mt-4">Nenhuma oferta foi feita. Aguarde o próximo lote!</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 🕹️ Bidding Control Bar */}
                <div className="h-28 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 px-8 flex items-center justify-between gap-8 z-30">
                    <div className="flex items-center gap-6">
                        {userId && userBalance !== null && (
                            <div className="bg-slate-950 border border-white/5 py-3 px-5 rounded-2xl">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Seu Saldo_</span>
                                <div className="text-xl font-black text-emerald-400 tabular-nums">R$ {userBalance.toFixed(2).replace('.', ',')}</div>
                            </div>
                        )}
                        <div className="hidden md:block">
                            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Dê seu Lance!</h4>
                            <p className="text-xs text-slate-400 font-medium">Os lances são instantâneos e descontados do saldo.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <QuickBidButton amount={5}   currentBid={liveData.current_bid} disabled={bidding || timeLeft <= 0} onClick={() => placeBid(5)} />
                        <QuickBidButton amount={10}  currentBid={liveData.current_bid} disabled={bidding || timeLeft <= 0} onClick={() => placeBid(10)} />
                        <QuickBidButton amount={50}  currentBid={liveData.current_bid} disabled={bidding || timeLeft <= 0} onClick={() => placeBid(50)} />
                        <QuickBidButton amount={100} currentBid={liveData.current_bid} disabled={bidding || timeLeft <= 0} onClick={() => placeBid(100)} />
                    </div>
                </div>
            </div>

            {/* 💬 Lado Direito: Social e Histórico (Sidebar) */}
            <div className="lg:w-[400px] flex flex-col bg-slate-950 h-full">
                {/* Chat Top */}
                <div className="flex-1 min-h-0 flex flex-col border-b border-white/5">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Comunidade Ao Vivo</h3>
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-black">
                            {Math.floor(Math.random() * 20) + 10} Online
                        </span>
                    </div>
                    <div className="flex-1 min-h-0">
                        <LiveChat liveId={liveId} currentUser={userId ? { id: userId, name: userName } : null} />
                    </div>
                </div>

                {/* History Bottom */}
                <div className="h-[300px] flex flex-col bg-slate-900/30">
                    <div className="p-4 border-b border-white/5 bg-black/20">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Últimos Arremates</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {winnerHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50 space-y-2">
                                <span className="text-3xl">🏜️</span>
                                <p className="text-[9px] font-black uppercase tracking-widest">Aguardando vencedores...</p>
                            </div>
                        ) : (
                            winnerHistory.map((item) => (
                                <div key={item.id} className="group bg-slate-900/80 border border-white/5 p-3 rounded-2xl flex items-center gap-3 hover:border-emerald-500/30 transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/5 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                        {item.item_image ? (
                                            <img src={item.item_image} alt="" className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-2xl">{item.item_type === 'Carta' ? '🎴' : '📦'}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-black text-white uppercase tracking-tighter truncate">{item.item_name}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] font-bold text-slate-500 truncate">{item.winner_name}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                            <span className="text-[10px] font-black text-emerald-400">R$ {Number(item.final_bid).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">👑</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Global Overlays */}
            <style jsx global>{`
                /* Hide global layout components for the immersive live experience */
                nav, footer, .bg-rose-600.px-6.py-2, .MobileNav_container__xxx { 
                    display: none !important; 
                }
                body { 
                    overflow: hidden !important; 
                    background: black !important;
                    padding-bottom: 0 !important;
                }
                main {
                    padding-top: 0 !important;
                    min-height: 100dvh !important;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
}

function QuickBidButton({ amount, currentBid, disabled, onClick }: { amount: number, currentBid: number, disabled: boolean, onClick: () => void }) {
    const total = (currentBid || 0) + amount;
    return (
        <button 
            disabled={disabled}
            onClick={onClick}
            className={`
                px-6 py-4 rounded-2xl border-b-4 font-black text-lg flex flex-col items-center justify-center transition-all duration-200 min-w-[120px]
                ${disabled 
                    ? 'bg-slate-800 border-slate-950 text-slate-500 cursor-not-allowed opacity-50' 
                    : 'bg-emerald-500 border-emerald-700 text-emerald-950 hover:bg-emerald-400 hover:translate-y-1 hover:border-b-0 active:bg-emerald-600 shadow-[0_10px_20px_rgba(16,185,129,0.2)]'
                }
            `}
        >
            <span className="text-[8px] uppercase tracking-widest opacity-80 mb-0.5 leading-none font-black text-emerald-950">Lance de_</span>
            <span>R$ {total}</span>
        </button>
    );
}
