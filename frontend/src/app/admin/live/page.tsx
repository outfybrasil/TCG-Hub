'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import LiveChat from '@/components/LiveChat';

const ELYSIUM = {
    bg: '#0c1324',
    surface: '#191f31',
    surfaceHigh: '#23293c',
    rose: '#e11d48',
    amber: '#f59e0b',
    green: '#6ee591',
    text: '#dce1fb',
    muted: 'rgba(220,225,251,0.5)',
    faint: 'rgba(220,225,251,0.15)',
};

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

    const inputCls = "w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all";
    const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: ELYSIUM.text };
    const labelStyle = { color: ELYSIUM.muted, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.15em' };

    return (
        <div className="min-h-screen" style={{ background: ELYSIUM.bg, color: ELYSIUM.text, fontFamily: 'Inter, sans-serif' }}>
            {/* HEADER */}
            <div className="px-8 py-5 flex items-center justify-between sticky top-0 z-40" style={{ background: 'rgba(12,19,36,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                    {liveData?.status === 'LIVE' && <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: ELYSIUM.green, boxShadow: `0 0 12px ${ELYSIUM.green}` }}></div>}
                    <h1 className="font-black uppercase tracking-tighter text-xl" style={{ color: ELYSIUM.text }}>📡 Cabine de Comando</h1>
                    {liveData && <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(225,29,72,0.1)', color: ELYSIUM.rose, border: `1px solid rgba(225,29,72,0.2)` }}>{liveData.title}</span>}
                </div>
                {liveData && liveData.status !== 'ENDED' && (
                    <div className="flex items-center gap-3">
                        <button onClick={() => window.open(`/live/${liveData.id}`, '_blank')} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.06)', color: ELYSIUM.muted, border: '1px solid rgba(255,255,255,0.1)' }}>
                            👁️ Ver Arena
                        </button>
                        <button onClick={() => setIsEndConfirmOpen(true)} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all" style={{ background: 'rgba(225,29,72,0.1)', color: ELYSIUM.rose, border: `1px solid rgba(225,29,72,0.2)` }}>
                            🛑 Encerrar
                        </button>
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto p-8">
                {!liveData || liveData.status === 'ENDED' ? (
                    /* NEW SESSION FORM */
                    <div className="max-w-lg mx-auto mt-16">
                        <div className="rounded-[32px] p-10" style={{ background: ELYSIUM.surface, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="text-center mb-8">
                                <div className="text-5xl mb-4">📡</div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: ELYSIUM.text }}>Iniciar Nova Sessão</h2>
                                <p className="text-sm mt-2" style={{ color: ELYSIUM.muted }}>Configure sua transmissão ao vivo</p>
                            </div>
                            <form onSubmit={createLive} className="space-y-5">
                                <div>
                                    <label className="block mb-2" style={labelStyle}>Título da Live</label>
                                    <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} style={inputStyle} placeholder="Ex: Noite dos Brutos #01" />
                                </div>
                                <div>
                                    <label className="block mb-2" style={labelStyle}>Link da Transmissão</label>
                                    <input required type="text" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} className={inputCls} style={inputStyle} placeholder="https://twitch.tv/seu-canal" />
                                </div>
                                <button disabled={loading} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-95 mt-4" style={{ background: `linear-gradient(135deg, ${ELYSIUM.rose}, #9f1239)`, color: 'white', boxShadow: `0 10px 30px rgba(225,29,72,0.3)` }}>
                                    {loading ? 'Preparando...' : '🔴 Entrar Ao Vivo Agora'}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* DASHBOARD */
                    <div className="grid grid-cols-12 gap-6">
                        {/* LEFT PANEL */}
                        <div className="col-span-4 space-y-5">
                            {/* Painel de Lotes */}
                            <div className="rounded-[24px] p-6" style={{ background: ELYSIUM.surface, border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: ELYSIUM.rose }}></div>
                                    <h3 className="font-black uppercase tracking-widest text-xs" style={{ color: ELYSIUM.rose }}>Painel de Lotes</h3>
                                </div>
                                <form onSubmit={(e) => { e.preventDefault(); setIsStartConfirmOpen(true); }} className="space-y-4">
                                    <div>
                                        <label className="block mb-1.5" style={labelStyle}>Nome do Item</label>
                                        <input required type="text" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className={inputCls} style={inputStyle} placeholder="Nome da carta ou lote" />
                                    </div>
                                    <div>
                                        <label className="block mb-1.5" style={labelStyle}>URL da Imagem</label>
                                        <input type="text" value={itemForm.image} onChange={e => setItemForm({ ...itemForm, image: e.target.value })} className={inputCls} style={inputStyle} placeholder="Opcional" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1.5" style={labelStyle}>Tipo</label>
                                            <select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value })} className={inputCls} style={{ ...inputStyle, appearance: 'none' as const }}>
                                                {['Carta','Booster','Triple Pack','Quadpack','Booster Box','Outros'].map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-1.5" style={labelStyle}>Lance (R$)</label>
                                            <input required type="number" min="1" step="0.5" value={itemForm.starting_bid} onChange={e => setItemForm({ ...itemForm, starting_bid: Number(e.target.value) })} className={inputCls} style={{ ...inputStyle, color: ELYSIUM.amber, fontWeight: 900 }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mb-1.5" style={labelStyle}>Cronômetro</label>
                                        <select value={itemForm.timer_seconds} onChange={e => setItemForm({ ...itemForm, timer_seconds: Number(e.target.value) })} className={inputCls} style={{ ...inputStyle, appearance: 'none' as const }}>
                                            <option value={30}>30 Segundos</option>
                                            <option value={60}>1 Minuto</option>
                                            <option value={120}>2 Minutos</option>
                                            <option value={300}>5 Minutos</option>
                                        </select>
                                    </div>
                                    <button type="submit" disabled={isProcessing} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-95" style={{ background: `linear-gradient(135deg, ${ELYSIUM.rose}, #9f1239)`, color: 'white', boxShadow: `0 8px 20px rgba(225,29,72,0.25)` }}>
                                        🚀 DISPARAR LOTE AGORA
                                    </button>
                                    <button type="button" onClick={clearCurrentItem} disabled={isProcessing} className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: ELYSIUM.muted, border: '1px solid rgba(255,255,255,0.08)' }}>
                                        🧹 LIMPAR MESA
                                    </button>
                                </form>
                            </div>

                            {/* Chat */}
                            <div className="rounded-[24px] p-4" style={{ background: ELYSIUM.surface, border: '1px solid rgba(255,255,255,0.08)', height: '360px', display: 'flex', flexDirection: 'column' }}>
                                <p className="font-black uppercase tracking-widest text-xs mb-3" style={{ color: ELYSIUM.muted }}>💬 Chat Operacional</p>
                                <div className="flex-1 min-h-0">
                                    <LiveChat liveId={liveData.id} currentUser={{ id: 'admin', name: '🎙️ Admin' }} />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANEL */}
                        <div className="col-span-8 space-y-5">
                            {/* Status card */}
                            <div className="rounded-[32px] p-10 relative overflow-hidden" style={{ background: ELYSIUM.surface, border: '1px solid rgba(255,255,255,0.08)', minHeight: '320px' }}>
                                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(225,29,72,0.08) 0%, transparent 60%)' }}></div>
                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="flex-1">
                                            <span className="text-xs font-black uppercase tracking-widest block mb-2" style={{ color: ELYSIUM.rose }}>Lote em Negociação</span>
                                            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none" style={{ color: ELYSIUM.text }}>
                                                {liveData.current_item_name || 'Aguardando Lote...'}
                                            </h2>
                                            {liveData.current_item_type && (
                                                <span className="inline-block mt-3 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest" style={{ background: 'rgba(225,29,72,0.1)', color: ELYSIUM.rose }}>
                                                    {liveData.current_item_type}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black uppercase tracking-widest block mb-2" style={{ color: ELYSIUM.muted }}>Tempo Restante</span>
                                            <div className="text-5xl font-black font-mono tabular-nums" style={{ color: timeLeft < 10 ? ELYSIUM.rose : ELYSIUM.text, textShadow: timeLeft < 10 ? `0 0 20px ${ELYSIUM.rose}` : 'none' }}>
                                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: ELYSIUM.muted }}>Maior Lance</p>
                                            <p className="text-4xl font-black tabular-nums" style={{ color: ELYSIUM.amber }}>
                                                R$ {Number(liveData.current_bid || 0).toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: ELYSIUM.muted }}>Vencedor Atual</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{liveData.winning_user_id ? '👑' : '⏳'}</span>
                                                <p className="text-2xl font-black truncate" style={{ color: liveData.winning_user_id ? ELYSIUM.green : ELYSIUM.muted }}>
                                                    {liveData.winning_user_name || 'Aguardando Lance'}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,13,31,0.9)', backdropFilter: 'blur(12px)' }}>
                    <div className="rounded-[32px] p-10 max-w-md w-full text-center" style={{ background: ELYSIUM.surface, border: `1px solid rgba(225,29,72,0.3)`, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
                        <div className="text-5xl mb-4">🔨</div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-2" style={{ color: ELYSIUM.text }}>Bater o Martelo?</h3>
                        <p className="text-sm mb-8" style={{ color: ELYSIUM.muted }}>Isto encerrará o lote anterior e iniciará <strong style={{ color: ELYSIUM.text }}>"{itemForm.name}"</strong> para todos.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmStartAuction} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm" style={{ background: `linear-gradient(135deg, ${ELYSIUM.rose}, #9f1239)`, color: 'white' }}>SIM, DISPARAR AGORA</button>
                            <button onClick={() => setIsStartConfirmOpen(false)} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: ELYSIUM.muted }}>AINDA NÃO</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Encerrar */}
            {isEndConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,13,31,0.9)', backdropFilter: 'blur(12px)' }}>
                    <div className="rounded-[32px] p-10 max-w-md w-full text-center" style={{ background: ELYSIUM.surface, border: `1px solid rgba(225,29,72,0.3)` }}>
                        <div className="text-5xl mb-4">🛑</div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-2" style={{ color: ELYSIUM.rose }}>Encerrar Live?</h3>
                        <p className="text-sm mb-8" style={{ color: ELYSIUM.muted }}>Isto desativará a transmissão para todos os usuários.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmEndLive} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm" style={{ background: ELYSIUM.rose, color: 'white' }}>SIM, ENCERRAR AGORA</button>
                            <button onClick={() => setIsEndConfirmOpen(false)} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: ELYSIUM.muted }}>CANCELAR</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                nav, footer { display: none !important; }
                body { background: #0c1324 !important; }
                main { padding-top: 0 !important; }
            `}</style>
        </div>
    );
}
