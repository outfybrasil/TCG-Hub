"use client";

import React, { useState, useEffect } from 'react';
import { account } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';

export default function MemberAreaPage() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        account.get().then(setUser).catch(() => router.push('/auth/login'));
    }, [router]);

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto px-6 py-16 animate-fade-up">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16 border-b border-slate-200 pb-12">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Área do Cliente</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900">
                        Meus <span className="text-rose-600 capitalize">Pedidos</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Bem-vindo de volta, <span className="text-slate-900">{user.name.split(' ')[0]}</span></p>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => account.deleteSession('current').then(() => router.push('/'))} className="h-11 px-6 bg-white border border-slate-200 text-slate-400 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all">Sair</button>
                    <button className="h-11 px-6 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg hover:bg-rose-600 transition-all">Meu Perfil</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {/* Stats de Compra */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 font-black">Total Investido</span>
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-4xl font-black tracking-tighter text-slate-900 group-hover:text-rose-600 transition-colors">R$ 12.850</h2>
                                <span className="text-[9px] text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded-md">8 Itens</span>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 font-black">Em Trânsito</span>
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-4xl font-black tracking-tighter text-slate-900">02</h2>
                                <span className="text-[9px] text-yellow-600 font-black bg-yellow-50 px-2 py-0.5 rounded-md">Transportadora</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Pedidos */}
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Histórico de Compras</h3>
                            <button className="text-[9px] font-black text-rose-600 uppercase tracking-widest hover:underline">Ver Todos</button>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {[
                                { order: "#9821", item: "Charizard Base Set", date: "28 Fev, 2024", status: "EM TRANSITO", type: "active" },
                                { order: "#9755", item: "Pikachu Illustrator (Proxy)", date: "15 Jan, 2024", status: "ENTREGUE", type: "done" },
                                { order: "#9612", item: "Mewtwo Shadowless", date: "10 Dez, 2023", status: "ENTREGUE", type: "done" },
                            ].map((act, i) => (
                                <div key={i} className="flex justify-between items-center p-6 hover:bg-slate-50/30 transition-colors">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">PEDIDO {act.order}</span>
                                        <p className="font-black text-sm text-slate-900 tracking-tight">{act.item}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{act.date}</p>
                                        <span className={`text-[8px] font-black px-2 py-1 rounded-md ${act.type === 'active' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-slate-100 text-slate-500'}`}>{act.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-rose-600 p-10 rounded-3xl shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-16 -mt-16 group-hover:bg-white/20 transition-all" />
                        <div className="space-y-8 relative z-10">
                            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">📦</div>
                            <div className="space-y-2">
                                <h3 className="text-white text-2xl font-black tracking-tighter leading-none">Rastreio em Tempo Real.</h3>
                                <p className="text-rose-100 text-[10px] font-medium leading-relaxed uppercase tracking-wider">Acompanhe cada etapa do seu novo ativo até sua casa.</p>
                            </div>
                            <button className="w-full h-12 bg-white text-rose-600 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-400 hover:text-slate-900 transition-all shadow-lg">Abrir Rastreamento</button>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Ajuda & Suporte</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <a href="/suporte" className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-rose-500/50 hover:bg-white transition-all group">
                                <span className="text-xl group-hover:scale-110 transition-transform">💬</span>
                                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Falar com Especialista</span>
                            </a>
                            <a href="/marketplace" className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-rose-500/50 hover:bg-white transition-all group">
                                <span className="text-xl group-hover:scale-110 transition-transform">🛒</span>
                                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Voltar para a Loja</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
