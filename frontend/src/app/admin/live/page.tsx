'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import LiveChat from '@/components/LiveChat';

export default function AdminLiveDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [liveData, setLiveData] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);
    const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
    const [form, setForm] = useState({
        title: 'Leilão Maluco TCG Hub!',
        video_url: 'https://twitch.tv/gaules', // Exemplo
    });
    const [itemForm, setItemForm] = useState({
        name: '',
        type: 'Carta',
        image: '',
        starting_bid: 10,
        timer_seconds: 60
    });
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!liveData?.ends_at) {
            setTimeLeft(0);
            return;
        }

        const timer = setInterval(() => {
            const ends = new Date(liveData.ends_at).getTime();
            const now = new Date().getTime();
            const diff = Math.max(0, Math.floor((ends - now) / 1000));
            setTimeLeft(diff);
        }, 1000);

        return () => clearInterval(timer);
    }, [liveData?.ends_at]);

    useEffect(() => {
        checkActiveLive();
        
        // Inscrever no websocket para acompanhar os lances
        const channel = supabase.channel('admin_bids')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_auctions' }, (payload) => {
                if (payload.new.status === 'ENDED') {
                    setLiveData(null); // Ignora a fila de websocket e fecha o painel
                } else {
                    setLiveData(payload.new);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const checkActiveLive = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/auth/login');

        // Busca live atual desse lojista
        const { data, error } = await supabase
            .from('live_auctions')
            .select('*')
            .eq('streamer_id', user.id)
            .in('status', ['SCHEDULED', 'LIVE'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (data) setLiveData(data);
    };

    const createLive = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase.from('live_auctions').insert({
            streamer_id: user?.id,
            title: form.title,
            video_url: form.video_url,
            status: 'LIVE',
            current_item_name: 'Aguardando Lote...',
            starting_bid: 1,
            current_bid: 1
        }).select().single();

        if (data) setLiveData(data);
        if (error) alert("Erro ao criar Live: " + error.message);
        setLoading(false);
    };

    const startAuctionItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsStartConfirmOpen(true);
    };

    // Helper: Finalizar arremate via API (cria pedido + debita créditos)
    const finalizarArremate = async (auctionLiveData: any) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                console.error('Sem token de autenticação para finalizar arremate');
                return;
            }

            const res = await fetch('/api/live/finalizar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    liveId: auctionLiveData.id,
                    winnerId: auctionLiveData.winning_user_id,
                    winnerName: auctionLiveData.winning_user_name,
                    amount: Number(auctionLiveData.current_bid),
                    itemName: auctionLiveData.current_item_name,
                    itemType: auctionLiveData.current_item_type,
                    itemImage: auctionLiveData.current_item_image
                })
            });

            const result = await res.json();
            if (!res.ok) {
                console.error('Erro ao finalizar arremate:', result.error);
                alert('Aviso: ' + (result.error || 'Erro ao processar arremate'));
            } else {
                console.log('✅ Arremate finalizado:', result);
            }
        } catch (err) {
            console.error('Erro inesperado ao finalizar arremate:', err);
        }
    };

    const confirmStartAuction = async () => {
        if (!liveData || isProcessing) return;
        setIsStartConfirmOpen(false);
        setIsProcessing(true);

        try {
            const endDate = new Date(Date.now() + (itemForm.timer_seconds * 1000)).toISOString();

            // SALVAR NO HISTÓRICO + FINALIZAR ARREMATE DO ITEM ANTERIOR
            if (liveData.current_item_name && liveData.current_item_name !== 'Aguardando Lote...' && liveData.winning_user_id) {
                await supabase.from('live_auction_history').insert({
                    live_id: liveData.id,
                    item_name: liveData.current_item_name,
                    item_type: liveData.current_item_type,
                    item_image: liveData.current_item_image,
                    winner_id: liveData.winning_user_id,
                    winner_name: liveData.winning_user_name,
                    final_bid: liveData.current_bid
                });

                // COBRAR + CRIAR PEDIDO via API
                await finalizarArremate(liveData);
            }

            const { error } = await supabase.from('live_auctions').update({
                current_item_name: itemForm.name,
                current_item_type: itemForm.type,
                current_item_image: itemForm.image,
                starting_bid: itemForm.starting_bid,
                current_bid: itemForm.starting_bid,
                winning_user_id: null,
                winning_user_name: null,
                ends_at: endDate,
                status: 'LIVE'
            }).eq('id', liveData.id);

            if (error) alert("Erro ao colocar item na mesa: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const endLive = async () => {
        if (!liveData) return;
        setIsEndConfirmOpen(true);
    };

    const confirmEndLive = async () => {
        if (!liveData || isProcessing) return;
        setIsEndConfirmOpen(false);
        setIsProcessing(true);

        try {
            console.log("Tentando encerrar live ID:", liveData.id);

            // SALVAR NO HISTÓRICO + FINALIZAR ARREMATE DO ITEM ATUAL
            if (liveData.current_item_name && liveData.current_item_name !== 'Aguardando Lote...' && liveData.winning_user_id) {
                await supabase.from('live_auction_history').insert({
                    live_id: liveData.id,
                    item_name: liveData.current_item_name,
                    item_type: liveData.current_item_type,
                    item_image: liveData.current_item_image,
                    winner_id: liveData.winning_user_id,
                    winner_name: liveData.winning_user_name,
                    final_bid: liveData.current_bid
                });

                // COBRAR + CRIAR PEDIDO via API
                await finalizarArremate(liveData);
            }

            const { error, data } = await supabase.from('live_auctions').update({ status: 'ENDED' }).eq('id', liveData.id).select();
            
            if (error) {
                console.error("Erro Supabase ao encerrar:", error);
                alert('Erro ao tentar encerrar a live no banco: ' + error.message);
            } else {
                console.log("Live encerrada com sucesso no banco:", data);
                setLiveData(null);
                window.location.reload(); 
            }
        } finally {
            setIsProcessing(false);
        }
    };
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans selection:bg-rose-500/30">
            <div className="max-w-7xl mx-auto space-y-8">
                
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            {liveData?.status === 'LIVE' && <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>}
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">📡 Cabine de Comando</h1>
                        </div>
                        <p className="text-slate-500 uppercase tracking-widest text-[9px] font-bold tracking-[0.2em]">
                            {liveData ? `Sessão: ${liveData.title}` : 'Gerenciador de Leilões Ao Vivo TCG Hub'}
                        </p>
                    </div>
                    
                    {liveData && liveData.status !== 'ENDED' && (
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => window.open(`/live/${liveData.id}`, '_blank')} 
                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-white flex items-center gap-2"
                            >
                                👁️ Ver Arena Pública
                            </button>
                            <button 
                                onClick={endLive} 
                                className="px-5 py-2.5 bg-rose-600/10 text-rose-500 border border-rose-600/20 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                            >
                                🛑 Encerrar Transmissão
                            </button>
                        </div>
                    )}
                </header>

                {!liveData || liveData.status === 'ENDED' ? (
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[40px] p-12 max-w-xl mx-auto mt-20 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-black text-white uppercase mb-8 text-center tracking-tighter">Iniciar Nova Sessão</h2>
                            <form onSubmit={createLive} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Título da Live</label>
                                    <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all" placeholder="Ex: Noite dos Brutos #01" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Link da Transmissão (Twitch/YouTube)</label>
                                    <input required type="text" value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all" placeholder="https://twitch.tv/seu-canal" />
                                </div>
                                <button disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black uppercase tracking-widest py-5 rounded-2xl mt-4 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] active:scale-95">
                                    {loading ? 'Preparando Servidor...' : 'Entrar Ao Vivo Agora'}
                                </button>
                            </form>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* 1. Painel de Controle Lateral */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-xl">
                                <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-8 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Painel de Lotes
                                </h3>

                                <form onSubmit={startAuctionItem} className="space-y-5">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Identificação do Item</label>
                                        <input required type="text" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 focus:outline-none transition-all" placeholder="Nome da carta ou lote" />
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest">URL da Imagem</label>
                                        <input type="text" value={itemForm.image} onChange={e => setItemForm({...itemForm, image: e.target.value})} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 focus:outline-none transition-all" placeholder="Opcional" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Tipo</label>
                                            <select value={itemForm.type} onChange={e => setItemForm({...itemForm, type: e.target.value})} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:border-rose-500 focus:outline-none transition-all appearance-none cursor-pointer">
                                                <option value="Carta">Carta</option>
                                                <option value="Booster">Booster</option>
                                                <option value="Triple Pack">Triple Pack</option>
                                                <option value="Quadpack">Quadpack</option>
                                                <option value="Booster Box">Box</option>
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Lance (R$)</label>
                                            <input required type="number" min="1" step="0.5" value={itemForm.starting_bid} onChange={e => setItemForm({...itemForm, starting_bid: Number(e.target.value)})} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-rose-500 focus:border-rose-500 focus:outline-none transition-all" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Cronômetro</label>
                                            <select value={itemForm.timer_seconds} onChange={e => setItemForm({...itemForm, timer_seconds: Number(e.target.value)})} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-rose-500 focus:outline-none transition-all appearance-none cursor-pointer">
                                                <option value="30">30 Segundos</option>
                                                <option value="60">1 Minuto</option>
                                                <option value="120">2 Minutos</option>
                                                <option value="300">5 Minutos</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl shadow-[0_10px_30px_rgba(225,29,72,0.2)] transition-all mt-4 hover:scale-[1.02] active:scale-95">
                                        🚀 DISPARAR LOTE AGORA
                                    </button>
                                </form>
                            </div>

                            <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 h-[400px]">
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Chat Operacional</h4>
                                <LiveChat liveId={liveData.id} currentUser={{ id: 'admin', name: '🎙️ Admin' }} />
                            </div>
                        </div>

                        {/* 2. Monitor Central (Dashboard de Comando) */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-slate-900 border border-white/10 rounded-[48px] p-12 relative overflow-hidden shadow-2xl min-h-[460px] flex flex-col justify-center">
                                <div className="relative z-10 w-full">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                                        <div className="flex-1">
                                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-rose-500 mb-3 block">Lote em Negociação</span>
                                            <h1 className="text-5xl md:text-6xl font-black text-rose-500 leading-none uppercase tracking-tighter break-words">
                                                {liveData.current_item_name || 'Aguardando Lote...'}
                                            </h1>
                                            <div className="mt-4 inline-block px-4 py-1.5 bg-rose-600/10 border border-rose-600/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-rose-400">
                                                {liveData.current_item_type || 'Geral'}
                                            </div>
                                        </div>
                                        
                                        <div className="text-left md:text-right min-w-[200px]">
                                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3 block">Tempo Restante</span>
                                            <div className={`text-6xl font-black font-mono tabular-nums leading-none tracking-tighter ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] group">
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-3 block">Maior Lance_</span>
                                            <div className="flex items-baseline gap-3">
                                                <span className="text-5xl font-black text-white tracking-tighter">R$ {liveData.current_bid?.toFixed(2).replace('.', ',')}</span>
                                                {liveData.starting_bid !== liveData.current_bid && (
                                                    <span className="text-sm font-bold text-slate-600 line-through">R$ {liveData.starting_bid?.toFixed(2)}</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 p-8 rounded-[32px]">
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-3 block">Vencedor Atual_</span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-xl">
                                                    {liveData.winning_user_id ? '👑' : '⏳'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-2xl font-black text-white truncate leading-none">
                                                        {liveData.winning_user_name || 'Aguardando Lance'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">
                                                        {liveData.winning_user_id ? 'Lote quase batido!' : 'Ninguém deu lance ainda'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Background Decoration */}
                                <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/5 rounded-full blur-[100px] pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none"></div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* MODAIS (Mantidos funcionais, porém com estilo atualizado) */}
            {isStartConfirmOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-emerald-500/30 p-10 rounded-[48px] max-w-md w-full text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
                        <div className="text-5xl mb-6 scale-125">🔨</div>
                        <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter">Bater o Martelo?</h3>
                        <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">
                            Deseja iniciar o leilão de <span className="text-white font-bold">"{itemForm.name}"</span>? 
                            Isto encerrará o lote anterior e iniciará o cronômetro para todos.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmStartAuction} className="w-full bg-emerald-500 hover:bg-emerald-400 py-5 rounded-2xl font-black text-emerald-950 uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-xl">
                                SIM, DISPARAR AGORA
                            </button>
                            <button onClick={() => setIsStartConfirmOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700 py-5 rounded-2xl font-black text-slate-300 uppercase tracking-widest text-[11px] transition-all">
                                AINDA NÃO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEndConfirmOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-rose-500/30 p-10 rounded-[48px] max-w-md w-full text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
                        <div className="text-5xl mb-6">🛑</div>
                        <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter text-rose-500">Encerrar Live?</h3>
                        <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">
                            Isto desativará a transmissão para todos os usuários e finalizará os lotes abertos. 
                            Tem certeza que deseja sair do ar?
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmEndLive} className="w-full bg-rose-600 hover:bg-rose-700 py-5 rounded-2xl font-black text-white uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-xl">
                                SIM, ENCERRAR AGORA
                            </button>
                            <button onClick={() => setIsEndConfirmOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700 py-5 rounded-2xl font-black text-slate-300 uppercase tracking-widest text-[11px] transition-all">
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Global Overlays & Layout Reset */}
            <style jsx global>{`
                /* Hide global layout components for the immersive live experience */
                nav, footer, .bg-rose-600.px-6.py-2 { 
                    display: none !important; 
                }
                body { 
                    overflow: hidden !important; 
                    background: #020617 !important; /* slate-950 */
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
