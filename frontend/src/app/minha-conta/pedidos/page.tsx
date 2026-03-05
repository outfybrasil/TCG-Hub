'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Purchase {
    id: string;
    order_number: string;
    created_at: string;
    total_amount: number;
    discount_amount: number;
    status: string;
    payment_method: string;
    tracking_code: string | null;
    carrier: string | null;
    items: any[];
}

const statusSteps = ['pending', 'approved', 'shipped', 'delivered'];
const statusLabels: Record<string, string> = {
    pending: 'Aguardando Pagamento',
    approved: 'Pagamento Confirmado',
    shipped: 'Enviado',
    delivered: 'Entregue',
    refunded: 'Reembolsado',
    rejected: 'Recusado'
};

function OrderStatusBar({ status }: { status: string }) {
    const currentStep = statusSteps.indexOf(status);
    const isRefunded = status === 'refunded' || status === 'rejected';

    if (isRefunded) {
        return (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">{statusLabels[status]}</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="flex items-center justify-between relative">
                {/* Progress line */}
                <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-100 -z-0" />
                <div
                    className="absolute left-0 top-4 h-0.5 bg-rose-600 transition-all duration-500 -z-0"
                    style={{ width: currentStep < 0 ? '0%' : `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
                />

                {statusSteps.map((step, i) => {
                    const done = i <= currentStep;
                    return (
                        <div key={step} className="flex flex-col items-center gap-2 z-10">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-rose-600 border-rose-600' : 'bg-white border-slate-200'
                                }`}>
                                {done ? (
                                    <span className="text-white text-[10px] font-black">✓</span>
                                ) : (
                                    <span className="text-slate-300 text-[10px] font-black">{i + 1}</span>
                                )}
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider text-center max-w-[64px] leading-tight ${done ? 'text-rose-600' : 'text-slate-300'}`}>
                                {statusLabels[step]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function MeusPedidosPage() {
    const router = useRouter();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace('/auth/login'); return; }

            const { data } = await supabase
                .from('purchases')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            setPurchases(data || []);
            setLoading(false);
        };
        init();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center py-44">
            <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-up">
            <div className="mb-12 space-y-3">
                <Link href="/minha-conta" className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
                    ← Minha Conta
                </Link>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
                    Meus <span className="text-rose-600">Pedidos.</span>
                </h1>
            </div>

            {purchases.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-slate-200 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Nenhum pedido realizado ainda.</p>
                    <Link href="/marketplace">
                        <button className="h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-600 transition-all">
                            Explorar Loja
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {purchases.map(p => {
                        const finalAmount = (p.total_amount || 0) - (p.discount_amount || 0);
                        return (
                            <Link key={p.id} href={`/minha-conta/pedidos/${p.id}`} className="block group">
                                <div className="bg-white border border-slate-100 p-8 rounded-[32px] shadow-sm group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-300">
                                    {/* Order Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pedido</p>
                                            <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                                #{p.order_number || p.id.split('-')[0].toUpperCase()}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-bold mt-1">
                                                {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pago</p>
                                            <p className="text-2xl font-black text-slate-900">
                                                R$ {finalAmount.toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Status Bar */}
                                    <OrderStatusBar status={p.status} />

                                    {/* Tracking code if shipped */}
                                    {p.tracking_code && (
                                        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Código de Rastreio</p>
                                                <p className="font-black text-slate-900 text-sm tracking-wider mt-0.5">{p.tracking_code}</p>
                                                {p.carrier && <p className="text-[9px] text-slate-400 font-bold">{p.carrier}</p>}
                                            </div>
                                            <a
                                                href={`https://www.linkcorreios.com.br/${p.tracking_code}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="h-9 px-4 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all flex items-center"
                                            >
                                                Rastrear
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
