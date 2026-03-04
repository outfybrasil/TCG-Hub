'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PurchaseItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

interface Purchase {
    id: string;
    created_at: string;
    items: PurchaseItem[];
    total_amount: number;
    discount_amount: number;
    cashback_earned: number;
    payment_method: string;
    mp_payment_id: string;
    status: string;
}

const METHOD_LABELS: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix: 'Pix',
    bank_transfer: 'Transferência',
    cashback: 'Cashback',
};

const STATUS_STYLE: Record<string, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    rejected: 'bg-red-50 text-red-700 border-red-100',
};

export default function PedidosPage() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPurchases() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data, error } = await supabase
                .from('purchases')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error) setPurchases(data || []);
            setLoading(false);
        }
        fetchPurchases();
    }, []);

    const formatDate = (iso: string) =>
        new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
        <div className="max-w-4xl mx-auto px-6 py-16 min-h-screen">
            <div className="mb-12 space-y-3">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest border border-slate-200">
                    Minha Conta
                </span>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900">
                    Histórico de <span className="text-rose-600">Pedidos.</span>
                </h1>
                <p className="text-slate-400 text-sm">Todas as suas compras em um só lugar.</p>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400 animate-pulse font-bold text-sm">Carregando...</div>
            ) : purchases.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                    <div className="text-5xl">🛍️</div>
                    <p className="text-slate-400 font-bold text-sm">Nenhuma compra realizada ainda.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {purchases.map((p) => (
                        <div key={p.id} className="border border-slate-100 rounded-3xl p-6 bg-white shadow-sm space-y-4 hover:shadow-md transition-shadow">
                            {/* Header */}
                            <div className="flex flex-wrap justify-between items-start gap-3">
                                <div className="space-y-1">
                                    <p className="font-black text-slate-900 text-sm">{formatDate(p.created_at)}</p>
                                    <p className="text-slate-400 font-mono text-[11px]">ID: {p.mp_payment_id}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${STATUS_STYLE[p.status] || STATUS_STYLE.pending}`}>
                                        {p.status === 'approved' ? '✓ Aprovado' : p.status}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">
                                        {METHOD_LABELS[p.payment_method] || p.payment_method}
                                    </span>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="divide-y divide-slate-50">
                                {(p.items || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-3 text-sm">
                                        <div className="flex items-center gap-3">
                                            {item.imageUrl && (
                                                <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-contain rounded-lg border border-slate-100" />
                                            )}
                                            <div>
                                                <p className="font-bold text-slate-800">{item.name}</p>
                                                <p className="text-slate-400 text-xs">Qtd: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <span className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="pt-3 border-t border-slate-50 space-y-1">
                                {p.discount_amount > 0 && (
                                    <div className="flex justify-between text-xs text-emerald-600 font-bold">
                                        <span>Cashback utilizado</span>
                                        <span>- {formatCurrency(p.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-black text-slate-900 text-base">
                                    <span>Total pago</span>
                                    <span>{formatCurrency(p.total_amount - p.discount_amount)}</span>
                                </div>
                                {p.cashback_earned > 0 && (
                                    <div className="flex justify-between text-xs text-blue-600 font-bold">
                                        <span>Cashback ganho nesta compra</span>
                                        <span>+ {formatCurrency(p.cashback_earned)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
