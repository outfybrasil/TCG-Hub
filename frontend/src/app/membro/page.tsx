"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Purchase {
    id: string;
    created_at: string;
    items: { id: string; name: string; price: number; quantity: number }[];
    total_amount: number;
    discount_amount: number;
    status: string;
    payment_method: string;
    mp_payment_id: string;
}

const STATUS_LABEL: Record<string, { label: string; style: string }> = {
    approved: { label: 'Aprovado', style: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    pending: { label: 'Pendente', style: 'bg-yellow-50 text-yellow-700 border border-yellow-100' },
    rejected: { label: 'Recusado', style: 'bg-red-50 text-red-600 border border-red-100' },
};

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

export default function MemberAreaPage() {
    const [user, setUser] = useState<{ id: string; name: string } | null>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.push('/auth/login'); return; }

            setUser({ id: user.id, name: user.user_metadata?.name || user.email });

            const [walletRes, purchasesRes] = await Promise.all([
                supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
                supabase.from('purchases').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
            ]);

            if (walletRes.data) setWalletBalance(walletRes.data.balance);
            if (purchasesRes.data) setPurchases(purchasesRes.data);
            setLoading(false);
        });
    }, [router]);

    if (!user) return null;

    // Computed stats from real data
    const totalInvested = purchases.reduce((acc, p) => acc + (p.total_amount - p.discount_amount), 0);
    const totalItems = purchases.reduce((acc, p) => acc + (p.items || []).reduce((a, i) => a + i.quantity, 0), 0);

    return (
        <div className="max-w-7xl mx-auto px-6 py-16 animate-fade-up">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16 border-b border-slate-200 pb-12">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Área do Cliente</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900">
                        Minha <span className="text-rose-600">Conta</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                        Bem-vindo de volta, <span className="text-slate-900">{user.name.split(' ')[0]}</span>
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                        className="h-11 px-6 bg-white border border-slate-200 text-slate-400 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all"
                    >
                        Sair
                    </button>
                    <Link href="/minha-conta/pedidos" className="h-11 px-6 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg hover:bg-rose-600 transition-all flex items-center">
                        Ver Pedidos
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Cashback */}
                        <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-8 -mt-8 group-hover:bg-white/20 transition-all" />
                            <span className="text-[10px] font-black text-rose-100 uppercase tracking-widest block mb-4">Carteira Cashback</span>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-2xl font-black text-white">R$</span>
                                <h2 className="text-4xl font-black tracking-tighter text-white">
                                    {walletBalance.toFixed(2).replace('.', ',')}
                                </h2>
                            </div>
                        </div>

                        {/* Total Invested - real data */}
                        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Total Investido</span>
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-4xl font-black tracking-tighter text-slate-900 group-hover:text-rose-600 transition-colors">
                                    {loading ? '...' : formatCurrency(totalInvested)}
                                </h2>
                                {!loading && totalItems > 0 && (
                                    <span className="text-[9px] text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded-md">
                                        {totalItems} iten{totalItems !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Purchase count */}
                        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Pedidos</span>
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-4xl font-black tracking-tighter text-slate-900">
                                    {loading ? '...' : String(purchases.length).padStart(2, '0')}
                                </h2>
                                <span className="text-[9px] text-slate-500 font-black bg-slate-50 px-2 py-0.5 rounded-md">Total</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Orders - real data */}
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Últimas Compras</h3>
                            <Link href="/minha-conta/pedidos" className="text-[9px] font-black text-rose-600 uppercase tracking-widest hover:underline">
                                Ver Todos
                            </Link>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {loading ? (
                                <div className="p-8 text-center text-slate-400 text-sm animate-pulse">Carregando...</div>
                            ) : purchases.length === 0 ? (
                                <div className="p-12 text-center space-y-2">
                                    <div className="text-4xl">🛍️</div>
                                    <p className="text-slate-400 font-bold text-sm">Ainda não há pedidos.</p>
                                    <Link href="/marketplace" className="text-rose-600 font-black text-xs uppercase tracking-widest hover:underline">
                                        Ir para a Loja →
                                    </Link>
                                </div>
                            ) : (
                                purchases.map((p) => {
                                    const firstItem = p.items?.[0];
                                    const itemCount = (p.items || []).reduce((a, i) => a + i.quantity, 0);
                                    const statusInfo = STATUS_LABEL[p.status] || STATUS_LABEL.pending;
                                    return (
                                        <div key={p.id} className="flex justify-between items-center p-6 hover:bg-slate-50/30 transition-colors">
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">
                                                    {formatDate(p.created_at)}
                                                </span>
                                                <p className="font-black text-sm text-slate-900 tracking-tight">
                                                    {firstItem?.name || 'Pedido'}
                                                    {itemCount > 1 ? ` +${itemCount - 1} iten${itemCount - 1 !== 1 ? 's' : ''}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="text-[11px] font-black text-slate-900">{formatCurrency(p.total_amount - p.discount_amount)}</p>
                                                <span className={`text-[8px] font-black px-2 py-1 rounded-md ${statusInfo.style}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
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
                            <a href="/minha-conta/pedidos" className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-rose-500/50 hover:bg-white transition-all group">
                                <span className="text-xl group-hover:scale-110 transition-transform">📦</span>
                                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Histórico de Pedidos</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
