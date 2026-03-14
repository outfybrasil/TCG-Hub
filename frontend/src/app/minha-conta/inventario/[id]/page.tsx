"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface CardDetail {
    id: string;
    name: string;
    set_name: string;
    number?: string;
    image_url?: string;
    language: string;
    condition: string;
    finish: string;
    quantity: number;
    purchase_price?: number;
    currentValue: number;
    lastSync?: string;
    marketSite?: string;
    created_at: string;
}

export default function CardProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [card, setCard] = useState<CardDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCard = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`/api/user/inventory?id=${id}`, {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`
                    }
                });
                const data = await res.json();
                if (data.card) {
                    setCard(data.card);
                } else {
                    router.push('/minha-conta/inventario');
                }
            } catch (error) {
                console.error('Error fetching card:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchCard();
    }, [id]);

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja remover esta carta do inventário?')) return;
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/user/inventory?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            
            if (res.ok) {
                router.push('/minha-conta/inventario');
            } else {
                alert('Erro ao remover carta.');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Erro ao remover item.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!card) return null;

    const totalInvested = (card.purchase_price || 0) * card.quantity;
    const totalCurrentValue = card.currentValue * card.quantity;
    const profitLoss = totalCurrentValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-up">
            {/* Navigation Header */}
            <div className="mb-12">
                <div className="flex justify-between items-center mb-8">
                    <Link href="/minha-conta/inventario" className="inline-flex items-center gap-2 text-slate-400 hover:text-rose-600 font-bold text-[10px] uppercase tracking-widest transition-colors group">
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar para Inventário
                    </Link>
                    
                    <button
                        onClick={handleDelete}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remover do Inventário
                    </button>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 mb-4">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                            <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Perfil do Item</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
                            {card.name}
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">{card.set_name} • #{card.number}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cotação Liga Pokémon_</p>
                      <span className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest ${profitLoss >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                          {card.currentValue > 0 ? `R$ ${card.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / UN` : 'Sem cotação'}
                      </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Card Visual */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-950 p-8 rounded-[40px] shadow-2xl relative group overflow-hidden">
                        <img 
                            src={card.image_url || 'https://images.pokemontcg.io/base1/4.png'} 
                            alt={card.name}
                            className="w-full h-auto object-contain rounded-2xl shadow-2xl group-hover:scale-105 transition-transform duration-700 relative z-10"
                        />
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -bottom-10 -right-10 text-9xl font-black text-white/5 uppercase select-none tracking-tighter">TCG</div>
                    </div>
                    
                    <div className="bg-white border border-slate-100 p-6 rounded-[30px] shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg">📦</div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Quantidade_</p>
                                <p className="font-black text-slate-900 uppercase text-xs">{card.quantity} Unidades</p>
                            </div>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-100"></div>
                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ID no Sistema_</p>
                            <p className="font-mono text-[9px] text-slate-400 uppercase">{card.id.split('-')[0]}...</p>
                        </div>
                    </div>
                </div>

                {/* Right: Details & Performance */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Performance Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Seu Investimento_</p>
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black tracking-tighter text-slate-900">
                                    R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Preço médio pago: R$ {card.purchase_price?.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm border-l-4 border-l-rose-600">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Valor Liga Pokémon_</p>
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black tracking-tighter text-slate-900">
                                    R$ {totalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h2>
                                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tighter">Última cotação registrada no sistema</p>
                            </div>
                        </div>
                    </div>

                    {/* ROI Section */}
                    <div className={`p-8 rounded-[40px] border flex flex-col md:flex-row items-center justify-between gap-6 ${profitLoss >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                        <div className="space-y-1 text-center md:text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Retorno sobre Investimento (ROI)_</p>
                            <h3 className={`text-5xl font-black tracking-tighter ${profitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {profitLoss >= 0 ? '+' : ''} R$ {Math.abs(profitLoss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="flex flex-col items-center md:items-end">
                            <div className={`text-3xl font-black tracking-tighter px-6 py-2 rounded-2xl ${profitLoss >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {profitLoss >= 0 ? '▲' : '▼'} {profitPercentage.toFixed(1)}%
                            </div>
                            <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest">Variação acumulada desde a compra</p>
                        </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm space-y-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 whitespace-nowrap">Especificações do Card_</h2>
                            <div className="h-[1px] flex-1 bg-slate-50"></div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Idioma_</p>
                                <p className="font-black text-slate-900 uppercase">{card.language}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado_</p>
                                <p className="font-black text-slate-900 uppercase">{card.condition}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acabamento_</p>
                                <p className="font-black text-slate-900 uppercase">{card.finish}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Coleção_</p>
                                <p className="font-black text-slate-900 uppercase">{card.set_name}</p>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-sm">📅</div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Adicionado em_</p>
                                    <p className="font-black text-slate-900 uppercase text-[10px]">{new Date(card.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="text-center md:text-right">
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Última Atualização de Mercado_</p>
                                <p className="text-[9px] font-bold text-slate-400">{card.lastSync ? new Date(card.lastSync).toLocaleString('pt-BR') : 'Aguardando sincronização...'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
