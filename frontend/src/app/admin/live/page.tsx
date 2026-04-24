"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import LiveChat from '@/components/LiveChat';
import AdminGuard from '@/components/AdminGuard';

export default function AdminLiveDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [liveData, setLiveData] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);
    const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
    const [form, setForm] = useState({ title: 'Leilão TCG MEGASTORE!', video_url: '' });
    const [itemForm, setItemForm] = useState({ name: '', type: 'Carta', image: '', starting_bid: 10, timer_seconds: 60 });
    const [timeLeft, setTimeLeft] = useState(0);

    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err) {
            console.error("Erro ao acessar câmera", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
            setShowCamera(false);
        }
    };

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                setItemForm({ ...itemForm, image: dataUrl });
                stopCamera();
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
    };

    useEffect(() => {
        if (!liveData?.ends_at) { setTimeLeft(0); return; }
        const timer = setInterval(() => {
            const diff = Math.max(0, Math.floor((new Date(liveData.ends_at).getTime() - Date.now()) / 1000));
            setTimeLeft(diff);
        }, 1000);
        return () => clearInterval(timer);
    }, [liveData?.ends_at]);

    useEffect(() => {
        checkActiveLive();
        const channel = supabase.channel('admin_bids')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_auctions' }, (payload) => {
                if (payload.new.status === 'ENDED') setLiveData(null);
                else setLiveData(payload.new);
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const checkActiveLive = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/auth/login');
        const { data } = await supabase.from('live_auctions').select('*').eq('streamer_id', user.id).in('status', ['SCHEDULED', 'LIVE']).order('created_at', { ascending: false }).limit(1).single();
        if (data) setLiveData(data);
    };

    const createLive = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.from('live_auctions').insert({ streamer_id: user?.id, title: form.title, video_url: form.video_url, status: 'LIVE', current_item_name: 'Aguardando Lote...', starting_bid: 1, current_bid: 1 }).select().single();
        if (data) setLiveData(data);
        if (error) alert('Erro: ' + error.message);
        setLoading(false);
    };

    const finalizarArremate = async (d: any) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            const res = await fetch('/api/live/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ liveId: d.id, winnerId: d.winning_user_id, winnerName: d.winning_user_name, amount: Number(d.current_bid), itemName: d.current_item_name, itemType: d.current_item_type, itemImage: d.current_item_image })
            });
            const result = await res.json();
            if (!res.ok) alert('Aviso: ' + (result.error || 'Erro ao processar'));
        } catch (err) { console.error(err); }
    };

    const confirmStartAuction = async () => {
        if (!liveData || isProcessing) return;
        setIsStartConfirmOpen(false);
        setIsProcessing(true);
        try {
            if (liveData.current_item_name && liveData.current_item_name !== 'Aguardando Lote...' && liveData.winning_user_id) {
                await supabase.from('live_auction_history').insert({ live_id: liveData.id, item_name: liveData.current_item_name, item_type: liveData.current_item_type, item_image: liveData.current_item_image, winner_id: liveData.winning_user_id, winner_name: liveData.winning_user_name, final_bid: liveData.current_bid });
                await finalizarArremate(liveData);
            }
            const endDate = new Date(Date.now() + (itemForm.timer_seconds * 1000)).toISOString();
            const { error } = await supabase.from('live_auctions').update({ current_item_name: itemForm.name, current_item_type: itemForm.type, current_item_image: itemForm.image, starting_bid: itemForm.starting_bid, current_bid: itemForm.starting_bid, winning_user_id: null, winning_user_name: null, ends_at: endDate, status: 'LIVE' }).eq('id', liveData.id);
            if (error) alert('Erro: ' + error.message);
        } finally { setIsProcessing(false); }
    };

    const clearCurrentItem = async () => {
        if (!liveData || isProcessing) return;
        setIsProcessing(true);
        try {
            if (liveData.current_item_name && liveData.current_item_name !== 'Aguardando Lote...' && liveData.winning_user_id) {
                await supabase.from('live_auction_history').insert({ live_id: liveData.id, item_name: liveData.current_item_name, item_type: liveData.current_item_type, item_image: liveData.current_item_image, winner_id: liveData.winning_user_id, winner_name: liveData.winning_user_name, final_bid: liveData.current_bid });
                await finalizarArremate(liveData);
            }
            const { error } = await supabase.from('live_auctions').update({ current_item_name: 'Aguardando Lote...', current_item_type: 'Carta', current_item_image: null, starting_bid: 0, current_bid: 0, winning_user_id: null, winning_user_name: null, ends_at: null }).eq('id', liveData.id);
            if (error) alert('Erro ao limpar: ' + error.message);
        } finally { setIsProcessing(false); }
    };

    const confirmEndLive = async () => {
        if (!liveData || isProcessing) return;
        setIsEndConfirmOpen(false);
        setIsProcessing(true);
        try {
            if (liveData.current_item_name && liveData.current_item_name !== 'Aguardando Lote...' && liveData.winning_user_id) {
                await supabase.from('live_auction_history').insert({ live_id: liveData.id, item_name: liveData.current_item_name, item_type: liveData.current_item_type, item_image: liveData.current_item_image, winner_id: liveData.winning_user_id, winner_name: liveData.winning_user_name, final_bid: liveData.current_bid });
                await finalizarArremate(liveData);
            }
            const { error } = await supabase.from('live_auctions').update({ status: 'ENDED' }).eq('id', liveData.id);
            if (error) alert('Erro ao encerrar: ' + error.message);
            else { setLiveData(null); window.location.reload(); }
        } finally { setIsProcessing(false); }
    };

    const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-none transition-all placeholder:text-slate-600";
    const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";

    return (
        <AdminGuard>
            <div className="min-h-screen bg-slate-900 text-white selection:bg-rose-500/30">
                {/* HEADER */}
                <div className="px-8 py-5 flex items-center justify-between sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center gap-3">
                        {liveData?.status === 'LIVE' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>}
                        <h1 className="font-black uppercase tracking-tighter text-lg text-white">📡 Cabine de Comando</h1>
                        {liveData && <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">{liveData.title}</span>}
                    </div>
                    {liveData && liveData.status !== 'ENDED' && (
                        <div className="flex items-center gap-3">
                            <button onClick={() => window.open(`/live/${liveData.id}`, '_blank')} className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all">
                                👁️ Ver Arena
                            </button>
                            <button onClick={() => setIsEndConfirmOpen(true)} className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">
                                🛑 Encerrar
                            </button>
                        </div>
                    )}
                </div>

                <div className="max-w-7xl mx-auto p-8 animate-fade-up">
                    {!liveData || liveData.status === 'ENDED' ? (
                        <div className="max-w-md mx-auto mt-20">
                            <div className="bg-white/5 border border-white/10 rounded-[40px] p-12 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 blur-[60px] -z-10"></div>
                                <div className="text-center mb-10">
                                    <div className="text-4xl mb-4">📡</div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Iniciar Nova Sessão</h2>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Configuração de Transmissão</p>
                                </div>
                                <form onSubmit={createLive} className="space-y-6">
                                    <div>
                                        <label className={labelClass}>Título da Live</label>
                                        <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="Ex: Noite dos Brutos #01" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Link da Transmissão</label>
                                        <input required type="text" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} className={inputClass} placeholder="https://twitch.tv/seu-canal" />
                                    </div>
                                    <button disabled={loading} className="w-full h-16 bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:scale-95 disabled:opacity-50 mt-4">
                                        {loading ? 'PREPARANDO...' : '🔴 ENTRAR AO VIVO AGORA'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-12 gap-8">
                            {/* LEFT PANEL */}
                            <div className="col-span-4 space-y-8">
                                <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 blur-[60px] -z-10"></div>
                                    <div className="flex items-center gap-2 mb-8">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.6)]"></div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Painel de Lotes</h3>
                                    </div>
                                    <form onSubmit={(e) => { e.preventDefault(); setIsStartConfirmOpen(true); }} className="space-y-5">
                                        <div>
                                            <label className={labelClass}>Nome do Item</label>
                                            <input required type="text" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className={inputClass} placeholder="Nome da carta ou lote" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Imagem (URL ou Câmera)</label>
                                            <div className="flex gap-2">
                                                <input type="text" value={itemForm.image} onChange={e => setItemForm({ ...itemForm, image: e.target.value })} className={inputClass} placeholder="Cole a URL ou tire foto" />
                                                <button type="button" onClick={startCamera} className="shrink-0 h-11 w-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-90">
                                                    📷
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>Tipo</label>
                                                <select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value })} className={inputClass}>
                                                    {['Carta', 'Carta Graduada', 'Booster', 'Triple Pack', 'Quadpack', 'Booster Box', 'Outros'].map(t => (
                                                        <option key={t} value={t} className="bg-slate-900 text-white">
                                                            {t}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Lance (R$)</label>
                                                <input required type="number" min="1" step="0.5" value={itemForm.starting_bid} onChange={e => setItemForm({ ...itemForm, starting_bid: Number(e.target.value) })} className={`${inputClass} text-amber-500 font-black`} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Cronômetro</label>
                                            <select value={itemForm.timer_seconds} onChange={e => setItemForm({ ...itemForm, timer_seconds: Number(e.target.value) })} className={inputClass}>
                                                <option value={30} className="bg-slate-900 text-white">30 Segundos</option>
                                                <option value={60} className="bg-slate-900 text-white">1 Minuto</option>
                                                <option value={120} className="bg-slate-900 text-white">2 Minutos</option>
                                                <option value={300} className="bg-slate-900 text-white">5 Minutos</option>
                                            </select>
                                        </div>
                                        <button type="submit" disabled={isProcessing} className="w-full h-14 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:scale-95 disabled:opacity-50">
                                            🚀 DISPARAR LOTE AGORA
                                        </button>
                                        <button type="button" onClick={clearCurrentItem} disabled={isProcessing} className="w-full h-12 bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white/10 hover:text-white transition-all">
                                            🧹 LIMPAR MESA
                                        </button>
                                    </form>
                                </div>

                                {/* Camera Modal */}
                                {showCamera && (
                                    <div className="fixed inset-0 z-[100] bg-slate-950/90 flex flex-col items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
                                        <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
                                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                                <h3 className="font-black text-white text-[10px] uppercase tracking-widest">Câmera em Tempo Real</h3>
                                                <button onClick={stopCamera} className="text-slate-400 hover:text-white transition-colors">✕</button>
                                            </div>
                                            <div className="relative bg-black aspect-[3/4]">
                                                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                                                <canvas ref={canvasRef} className="hidden" />
                                            </div>
                                            <div className="p-8 flex justify-center">
                                                <button onClick={takePhoto} className="h-20 w-20 rounded-full bg-rose-600 border-4 border-slate-900 shadow-[0_0_0_4px_#e11d48] flex items-center justify-center text-white text-3xl hover:scale-105 active:scale-95 transition-all">
                                                    📸
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 h-[400px] flex flex-col shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[60px] -z-10"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">💬 Chat Operacional</p>
                                    <div className="flex-1 min-h-0 bg-slate-950/30 rounded-2xl border border-white/5">
                                        <LiveChat liveId={liveData.id} currentUser={{ id: 'admin', name: '🎙️ Admin' }} />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT PANEL */}
                            <div className="col-span-8 space-y-8">
                                <div className="bg-white/5 border border-white/10 rounded-[48px] p-12 relative overflow-hidden shadow-2xl min-h-[400px]">
                                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_80%_20%,rgba(225,29,72,0.1),transparent_60%)]"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-12">
                                            <div className="flex-1">
                                                <div className="inline-flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 mb-4">
                                                    <span className="h-1 w-1 rounded-full bg-rose-600"></span>
                                                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Lote em Negociação</span>
                                                </div>
                                                <h2 className="text-6xl font-black uppercase tracking-tighter text-white leading-tight">
                                                    {liveData.current_item_name || 'Aguardando Lote...'}
                                                </h2>
                                                {liveData.current_item_type && (
                                                    <span className="inline-block mt-4 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400">
                                                        {liveData.current_item_type}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tempo Restante</p>
                                                <div className={`text-7xl font-black font-mono tabular-nums tracking-tighter ${timeLeft < 10 ? 'text-rose-600 drop-shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse' : 'text-white'}`}>
                                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 mt-auto">
                                            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Maior Lance</p>
                                                <p className="text-5xl font-black tabular-nums text-amber-500 tracking-tighter">
                                                    R$ {Number(liveData.current_bid || 0).toFixed(2).replace('.', ',')}
                                                </p>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Vencedor Atual</p>
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl ${liveData.winning_user_id ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-white/5 text-slate-600'}`}>
                                                        {liveData.winning_user_id ? '👑' : '⏳'}
                                                    </div>
                                                    <p className={`text-3xl font-black uppercase tracking-tighter truncate ${liveData.winning_user_id ? 'text-emerald-500' : 'text-slate-600'}`}>
                                                        {liveData.winning_user_name || 'Aguardando...'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* MODAL: Disparar */}
                {isStartConfirmOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                        <div className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-sm w-full shadow-2xl text-center">
                            <div className="text-5xl mb-6">🔨</div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Bater o Martelo?</h3>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-tight leading-relaxed mb-10">
                                Isto encerrará o lote anterior e iniciará <strong className="text-white">"{itemForm.name}"</strong> para todos.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button onClick={confirmStartAuction} className="h-14 w-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20">SIM, DISPARAR AGORA</button>
                                <button onClick={() => setIsStartConfirmOpen(false)} className="h-14 w-full bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 hover:text-white transition-all">AINDA NÃO</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: Encerrar */}
                {isEndConfirmOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                        <div className="bg-slate-900 border border-rose-500/20 rounded-[40px] p-12 max-w-sm w-full shadow-2xl text-center">
                            <div className="text-5xl mb-6">🛑</div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-rose-500 mb-2">Encerrar Live?</h3>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-tight leading-relaxed mb-10">
                                Isto desativará a transmissão para todos os usuários imediatamente.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button onClick={confirmEndLive} className="h-14 w-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20">SIM, ENCERRAR AGORA</button>
                                <button onClick={() => setIsEndConfirmOpen(false)} className="h-14 w-full bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 hover:text-white transition-all">CANCELAR</button>
                            </div>
                        </div>
                    </div>
                )}

                <style jsx global>{`
                    nav, footer { display: none !important; }
                    body { background: #0f172a !important; }
                    main { padding-top: 0 !important; }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                `}</style>
            </div>
        </AdminGuard>
    );
}
