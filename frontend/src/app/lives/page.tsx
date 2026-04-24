'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function LiveViewerCount({ liveId }: { liveId: string }) {
    const [count, setCount] = useState(1);

    useEffect(() => {
        const presenceChannel = supabase.channel(`live_presence_${liveId}`, {
            config: { presence: { key: Math.random().toString() } }
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                setCount(Math.max(1, Object.keys(state).length));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, [liveId]);

    return (
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/20">
            <span className="text-[10px] opacity-90 font-medium">👁</span>
            <span>{count}</span>
        </div>
    );
}

export default function LivesDirectoryPage() {
    const router = useRouter();
    const [lives, setLives] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLives();

        const channel = supabase.channel('public_lives')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_auctions' }, () => {
                fetchLives();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchLives = async () => {
        setLoading(true);
        // Trazendo as lives junto com as informações do Lojista
        const { data } = await supabase
            .from('live_auctions')
            .select('*')
            .eq('status', 'LIVE')
            .order('created_at', { ascending: false });

        if (data) setLives(data);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 px-6 py-12 md:py-20 font-sans">
            <div className="max-w-7xl mx-auto space-y-12">
                
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest mb-6 transition-colors group"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar
                        </button>
                        <div className="inline-flex items-center gap-2 bg-rose-600/10 border border-rose-600/30 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-4">
                            Ao Vivo Agora
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">
                            Acompanhe os <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-500">Leilões</span>
                        </h1>
                        <p className="text-slate-400 mt-4 max-w-xl">
                            Descubra cartas raras sendo vendidas em tempo real. Dê lances rápidos e não perca tempo na guerra contra a comunidade.
                        </p>
                    </div>
                </header>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="bg-slate-900 border border-slate-800 rounded-3xl h-[320px]"></div>
                        ))}
                    </div>
                ) : lives.length === 0 ? (
                    <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[40px] p-20 text-center flex flex-col items-center justify-center">
                        <span className="text-6xl mb-6 grayscale opacity-30">💤</span>
                        <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest mb-2">Nenhum leilão ativo</h3>
                        <p className="text-slate-500 max-w-sm">Os lojistas do TCG MEGASTORE estão descansando agora. Volte mais tarde para participar da Bidding War.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {lives.map((live) => (
                            <Link key={live.id} href={`/live/${live.id}`} className="group block relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-500/10 cursor-pointer">
                                {/* Thumbnail Genérica (Mock de Stream) */}
                                <div className="aspect-video bg-black relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                    <img src="https://images.unsplash.com/photo-1610484826967-09c5720778c7?q=80&w=600&auto=format&fit=crop" alt="Cenário de Cartas" className="w-full h-full object-cover opacity-60" />
                                    
                                    {/* LIVE Badge */}
                                    <div className="absolute top-4 left-4 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping shrink-0"></span>
                                            <span>AO VIVO</span>
                                        </div>
                                        <LiveViewerCount liveId={live.id} />
                                    </div>
                                    
                                    {/* Info no Thumbnail */}
                                    {live.current_item_name && live.current_item_name !== 'Aguardando Lote...' && (
                                        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-emerald-500/30">
                                            Maior Lance: R$ {live.current_bid}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Base details */}
                                <div className="p-5 flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 shrink-0 overflow-hidden flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                        L
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-sm font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                                            {live.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 truncate mt-1">
                                            Lojista TCG
                                        </p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-3 truncate font-bold">
                                            Atrativo: {live.current_item_name || 'Abrindo caixas...'}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
