'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

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
    items: Array<Record<string, unknown>>;
}

const statusSteps = ['pending', 'approved', 'shipped', 'delivered'];
const statusLabels: Record<string, string> = {
    pending: 'Aguardando Pagamento',
    approved: 'Pagamento Confirmado',
    shipped: 'Enviado',
    delivered: 'Entregue',
    refunded: 'Reembolsado',
    canceled: 'Cancelado',
    rejected: 'Recusado'
};

async function getAuthHeaders(headers: HeadersInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    return {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function OrderStatusBar({ status }: { status: string }) {
    const currentStep = statusSteps.indexOf(status);
    const isRefunded = status === 'refunded' || status === 'rejected' || status === 'canceled';

    if (isRefunded) {
        return (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{statusLabels[status]}</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="flex items-center justify-between relative">
                {/* Progress line */}
                <div className="absolute left-0 right-0 top-4 h-0.5 bg-white/5 -z-0" />
                <div
                    className="absolute left-0 top-4 h-0.5 bg-rose-600 transition-all duration-500 -z-0"
                    style={{ width: currentStep < 0 ? '0%' : `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
                />

                {statusSteps.map((step, i) => {
                    const done = i <= currentStep;
                    return (
                        <div key={step} className="flex flex-col items-center gap-2 z-10">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-rose-600 border-rose-600' : 'bg-slate-900 border-white/10'
                                }`}>
                                {done ? (
                                    <span className="text-white text-[10px] font-black">✓</span>
                                ) : (
                                    <span className="text-slate-600 text-[10px] font-black">{i + 1}</span>
                                )}
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider text-center max-w-[64px] leading-tight ${done ? 'text-rose-500' : 'text-slate-500'}`}>
                                {statusLabels[step]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MeusPedidosContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const { clearCart, items } = useCart();
    const purchaseId = searchParams.get('purchaseId');
    const checkoutStatus = searchParams.get('status');
    const [resolvedCheckoutStatus, setResolvedCheckoutStatus] = useState(checkoutStatus);

    useEffect(() => {
        const loadPurchases = async () => {
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
        void loadPurchases();
    }, [router]);

    useEffect(() => {
        setResolvedCheckoutStatus(checkoutStatus);
    }, [checkoutStatus]);

    useEffect(() => {
        if ((checkoutStatus === 'success' || checkoutStatus === 'pending') && items.length > 0) {
            clearCart();
        }
    }, [checkoutStatus, clearCart, items.length]);

    useEffect(() => {
        if (!purchaseId || (checkoutStatus !== 'pending' && checkoutStatus !== 'success')) {
            return;
        }

        let cancelled = false;
        let attempts = 0;

        const interval = setInterval(async () => {
            attempts += 1;

            try {
                const res = await fetch(`/api/pagamento/status?id=${purchaseId}`, {
                    method: 'POST',
                    headers: await getAuthHeaders(),
                });
                const json = await res.json();

                if (cancelled) {
                    return;
                }

                if (json.status === 'approved') {
                    setResolvedCheckoutStatus('success');

                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        clearInterval(interval);
                        return;
                    }

                    const { data } = await supabase
                        .from('purchases')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false });

                    if (!cancelled) {
                        setPurchases(data || []);
                    }

                    clearInterval(interval);
                    return;
                }

                if (attempts >= 20) {
                    clearInterval(interval);
                }
            } catch (error) {
                console.error('Erro ao revalidar pedido apos checkout:', error);
                clearInterval(interval);
            }
        }, 3000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [checkoutStatus, purchaseId]);

    if (loading) return (
        <div className="flex items-center justify-center py-44">
            <div className="h-10 w-10 border-2 border-white/10 border-t-rose-600 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-up">
            <div className="mb-12 space-y-3">
                <Link href="/minha-conta" className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors">
                    ← Minha Conta
                </Link>
                <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">
                    Meus <span className="text-rose-600">Pedidos.</span>
                </h1>
            </div>

            {resolvedCheckoutStatus === 'success' && (
                <div className="mb-8 rounded-[32px] border border-emerald-500/20 bg-emerald-500/5 px-6 py-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Pagamento confirmado</p>
                    <p className="mt-2 text-sm font-medium text-emerald-200/60">Sua compra foi aprovada e ja aparece no seu historico.</p>
                </div>
            )}

            {resolvedCheckoutStatus === 'pending' && (
                <div className="mb-8 rounded-[32px] border border-amber-500/20 bg-amber-500/5 px-6 py-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pagamento em analise</p>
                    <p className="mt-2 text-sm font-medium text-amber-200/60">Recebemos o pedido e estamos aguardando a confirmacao do Mercado Pago.</p>
                </div>
            )}

            {purchases.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-white/10 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Nenhum pedido realizado ainda.</p>
                    <Link href="/marketplace">
                        <button className="h-12 px-8 bg-rose-600 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/20">
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
                                <div className="bg-slate-900 border border-white/5 p-8 rounded-[32px] shadow-sm group-hover:shadow-rose-900/10 group-hover:-translate-y-1 group-hover:border-white/10 transition-all duration-300">
                                    {/* Order Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pedido</p>
                                            <p className="text-2xl font-black text-white tracking-tighter">
                                                #{p.order_number || p.id.split('-')[0].toUpperCase()}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-bold mt-1">
                                                {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Pago</p>
                                            <p className="text-2xl font-black text-white">
                                                R$ {finalAmount.toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Status Bar */}
                                    <OrderStatusBar status={p.status} />

                                    {/* Tracking code if shipped */}
                                    {p.tracking_code && (
                                        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Código de Rastreio</p>
                                                <p className="font-black text-white text-sm tracking-wider mt-0.5">{p.tracking_code}</p>
                                                {p.carrier && <p className="text-[9px] text-slate-400 font-bold">{p.carrier}</p>}
                                            </div>
                                            <a
                                                href={`https://www.linkcorreios.com.br/${p.tracking_code}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="h-9 px-4 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all flex items-center shadow-lg shadow-blue-900/20"
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

export default function MeusPedidosPage() {
    return (
        <React.Suspense fallback={
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-white/10 border-t-rose-600 rounded-full animate-spin" />
            </div>
        }>
            <MeusPedidosContent />
        </React.Suspense>
    );
}
