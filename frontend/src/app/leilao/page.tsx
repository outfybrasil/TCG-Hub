'use client';

import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionCard from '@/components/AuctionCard';

function AuctionSkeleton() {
    return (
        <div className="bg-white border border-slate-100 rounded-[30px] overflow-hidden animate-pulse">
            <div className="aspect-square bg-slate-100 rounded-t-[24px]" />
            <div className="p-6 space-y-4">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-10 bg-slate-50 rounded-xl" />
            </div>
        </div>
    );
}

export default function AuctionPage() {
    const { auctions, loading } = useAuctions();
    const [user, setUser] = React.useState<{ id: string; email?: string } | null>(null);

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
    }, []);

    const active = auctions.filter(a => a.status === 'active' && new Date(a.endsAt) > new Date());
    const ended = auctions.filter(a => a.status === 'ended' || new Date(a.endsAt) <= new Date());

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up border-t border-slate-50">

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 border-b border-slate-200 pb-12">
                <div className="space-y-6 flex-1">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Leilões ao Vivo via Secure Stream</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                            Pregão Exclusivo <span className="text-rose-600">Loja.</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest max-w-lg">
                            Oportunidades únicas de aquisição para membros da nossa comunidade.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {user?.email === 'admin@tcghub.com.br' && (
                            <Link href="/leilao/criar">
                                <button className="h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg hover:bg-rose-600 transition-all transform hover:-translate-y-1">
                                    Criar Pregão
                                </button>
                            </Link>
                        )}
                        <button className="h-12 px-8 bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-50 transition-all">
                            Regras Gerais
                        </button>
                    </div>
                </div>

                <div className="flex gap-12 pt-8 lg:pt-0">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Pregões Ativos_</span>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{loading ? '—' : active.length}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Volume Total_</span>
                        <p className="text-2xl font-black text-rose-600 tracking-tighter">
                            {loading ? '—' : `R$ ${(auctions.reduce((s, a) => s + a.currentBid, 0) / 1000).toFixed(1)}K`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Active Auctions */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[...Array(4)].map((_, i) => <AuctionSkeleton key={i} />)}
                </div>
            ) : active.length === 0 ? (
                <div className="text-center py-32 border border-dashed border-slate-200 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum pregão ativo no momento</p>
                    {user?.email === 'admin@tcghub.com.br' && (
                        <Link href="/leilao/criar">
                            <button className="mt-8 h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-600 transition-all">
                                Iniciar o Primeiro Pregão
                            </button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {active.map(a => <AuctionCard key={a.id} auction={a} />)}
                </div>
            )}

            {/* Ended Section */}
            {!loading && ended.length > 0 && (
                <div className="mt-24 space-y-8">
                    <div className="flex items-center gap-6">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap">Pregões Encerrados</h2>
                        <div className="h-[1px] flex-1 bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {ended.map(a => <AuctionCard key={a.id} auction={a} />)}
                    </div>
                </div>
            )}

            {/* CTA Banner */}
            <div className="mt-20 p-12 bg-slate-900 rounded-[50px] relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-rose-500/30" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Premium Auction Service</span>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Receba Alertas de Novos Pregões.</h2>
                    </div>
                    <button className="h-16 px-12 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/50 whitespace-nowrap">
                        Ativar Notificações
                    </button>
                </div>
            </div>

        </div>
    );
}
