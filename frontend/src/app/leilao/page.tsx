"use client";

import React from 'react';

export default function AuctionPage() {
    const activeAuctions = [
        { id: '1', name: 'Charizard Shadowless', price: 'R$ 42.500', bids: 24, time: '02h 14m', img: 'https://images.pokemontcg.io/base1/4.png' },
        { id: '2', name: 'Mewtwo 1st Edition', price: 'R$ 15.800', bids: 18, time: '45m 12s', img: 'https://images.pokemontcg.io/base1/10.png' },
        { id: '3', name: 'Blastoise Holo Rare', price: 'R$ 8.900', bids: 12, time: '05h 30m', img: 'https://images.pokemontcg.io/base1/2.png' },
        { id: '4', name: 'Venusaur Base Set', price: 'R$ 6.200', bids: 8, time: '01d 04h', img: 'https://images.pokemontcg.io/base1/15.png' },
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up border-t border-slate-50">
            {/* Auction Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 border-b border-slate-200 pb-12">
                <div className="space-y-6 flex-1">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Leilões ao Vivo via Secure Stream</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                            Pregão Exclusivo <span className="text-rose-600">Loja.</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest max-w-lg">Oportunidades únicas de aquisição para membros da nossa comunidade.</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <button className="h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg hover:bg-rose-600 transition-all transform hover:-translate-y-1">Dar um Lance</button>
                        <button className="h-12 px-8 bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-50 transition-all">Regras Gerais</button>
                    </div>
                </div>

                <div className="flex gap-12 pt-8 lg:pt-0">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Pregões Ativos_</span>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">14</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Volume Total_</span>
                        <p className="text-2xl font-black text-rose-600 tracking-tighter">R$ 1.8M</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {activeAuctions.map((auc) => (
                    <div key={auc.id} className="group bg-white border border-slate-200 p-6 rounded-[30px] shadow-sm hover:shadow-2xl hover:border-rose-500/50 transition-all transform hover:-translate-y-2 overflow-hidden">
                        <div className="relative aspect-square overflow-hidden bg-slate-50 rounded-[24px] mb-6">
                            <img src={auc.img} alt={auc.name} className="h-full w-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">{auc.time}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 px-1">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Set_</p>
                                <h3 className="text-lg font-black tracking-tighter text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors uppercase leading-none">{auc.name}</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-y border-slate-50 py-4">
                                <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Lance Atual_</span>
                                    <p className="text-base font-black text-slate-900 tracking-tighter leading-none">{auc.price}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest leading-none">Bids_</span>
                                    <p className="text-base font-black text-slate-900 tracking-tighter leading-none">{auc.bids}</p>
                                </div>
                            </div>

                            <button className="w-full h-12 bg-slate-50 border border-transparent text-slate-900 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-400 transition-all group-hover:shadow-lg">Participar</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-20 p-12 bg-slate-900 rounded-[50px] relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-rose-500/30" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Premium Auction Service</span>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Receba Alertas de Novos Pregões.</h2>
                    </div>
                    <button className="h-16 px-12 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/50 whitespace-nowrap">Ativar Notificações</button>
                </div>
            </div>
        </div>
    );
}
