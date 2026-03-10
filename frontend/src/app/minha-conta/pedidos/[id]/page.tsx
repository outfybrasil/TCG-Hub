'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface OrderDetail {
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
    shipping_address: any;
}

const statusLabels: Record<string, string> = {
    pending: 'Aguardando Pagamento',
    approved: 'Pagamento Confirmado',
    shipped: 'Enviado',
    delivered: 'Entregue',
    refunded: 'Reembolsado',
    canceled: 'Cancelado',
    rejected: 'Recusado'
};

const statusSteps = ['pending', 'approved', 'shipped', 'delivered'];

function OrderStatusBar({ status }: { status: string }) {
    const currentStep = statusSteps.indexOf(status);
    const isRefunded = status === 'refunded' || status === 'rejected' || status === 'canceled';

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
                        <div key={step} className="flex flex-col items-center gap-2 z-10 w-24">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-rose-600 border-rose-600' : 'bg-white border-slate-200'
                                }`}>
                                {done ? (
                                    <span className="text-white text-[10px] font-black">✓</span>
                                ) : (
                                    <span className="text-slate-300 text-[10px] font-black">{i + 1}</span>
                                )}
                            </div>
                            <span className={`text-[8.5px] font-black uppercase tracking-wider text-center leading-tight ${done ? 'text-rose-600' : 'text-slate-300'}`}>
                                {statusLabels[step]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const methodLabels: Record<string, string> = {
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    cashback: 'Saldo de Cashback',
    mercadopago_checkout: 'Mercado Pago'
};

export default function OrderDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace('/auth/login'); return; }

            const { data } = await supabase
                .from('purchases')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (!data) {
                router.replace('/minha-conta/pedidos');
                return;
            }

            setOrder(data);
            setLoading(false);
        };
        init();
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center py-44">
            <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!order) return null;

    const subtotal = order.total_amount || 0;
    const discount = order.discount_amount || 0;
    const finalAmount = subtotal - discount;

    return (
        <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-up">
            <div className="mb-12 space-y-3">
                <Link href="/minha-conta/pedidos" className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
                    ← Meus Pedidos
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-none">
                            Pedido #{order.order_number || order.id.split('-')[0].toUpperCase()}
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                            Realizado em {new Date(order.created_at).toLocaleString('pt-BR')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-12 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <OrderStatusBar status={order.status} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Itens do Pedido */}
                    <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50">
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Itens Comprados</h2>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {order.items?.map((item: any) => (
                                <div key={item.id} className="p-8 flex items-center gap-6">
                                    <div className="h-20 w-16 shrink-0 bg-slate-100 rounded-lg overflow-hidden relative">
                                        <img src={item.imageUrl || item.image_url || 'https://placehold.co/400x600/eeeeee/999999?text=Sem+Foto'} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.set}</p>
                                        <p className="font-black text-slate-900 truncate">{item.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">Qtd: {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900">R$ {((item.price || item.unit_price || 0) * (item.quantity || 1)).toFixed(2).replace('.', ',')}</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-1">R$ {(item.price || item.unit_price || 0).toFixed(2).replace('.', ',')} un</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-4">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                            <span>Subtotal</span>
                            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between items-center text-sm font-bold text-rose-500">
                                <span>Desconto (Cashback)</span>
                                <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
                            </div>
                        )}
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Total Pago</span>
                            <span className="text-2xl font-black text-slate-900 tracking-tighter">R$ {finalAmount.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Logística */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Entrega & Rastreio</h2>

                        {order.tracking_code ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center justify-center text-center">
                                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Código de Rastreio</p>
                                    <p className="font-black text-slate-900 tracking-widest text-lg">{order.tracking_code}</p>
                                    {order.carrier && <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">{order.carrier}</p>}
                                </div>
                                <a
                                    href={`https://www.linkcorreios.com.br/${order.tracking_code}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex w-full items-center justify-center h-12 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                >
                                    Rastrear Encomenda
                                </a>
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                                <span className="text-2xl">📦</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-[200px]">
                                    O código de rastreio será disponibilizado assim que o pedido for despachado.
                                </p>
                            </div>
                        )}

                        {order.shipping_address && (
                            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <span>📍</span> Endereço de Entrega
                                </p>
                                <div className="bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-600 space-y-1">
                                    <p className="text-slate-900">{order.shipping_address.street}, {order.shipping_address.number}</p>
                                    {order.shipping_address.complement && <p>{order.shipping_address.complement}</p>}
                                    <p>{order.shipping_address.neighborhood}</p>
                                    <p>{order.shipping_address.city} - {order.shipping_address.state}</p>
                                    <p className="text-[10px] uppercase tracking-widest mt-2">CEP: {order.shipping_address.zip_code}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pagamento */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Pagamento</h2>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método</p>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-widest sm:text-right break-all">
                                    {methodLabels[order.payment_method] || order.payment_method}
                                </p>
                            </div>
                            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl border ${order.status === 'approved' ? 'bg-emerald-50 border-emerald-100' :
                                    (order.status === 'refunded' || order.status === 'canceled' || order.status === 'rejected') ? 'bg-rose-50 border-rose-100' :
                                        'bg-blue-50 border-blue-100'
                                }`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${order.status === 'approved' ? 'text-emerald-600' :
                                        (order.status === 'refunded' || order.status === 'canceled' || order.status === 'rejected') ? 'text-rose-600' :
                                            'text-blue-600'
                                    }`}>Situação</p>
                                <p className={`text-sm font-black uppercase tracking-widest sm:text-right ${order.status === 'approved' ? 'text-emerald-900' :
                                        (order.status === 'refunded' || order.status === 'canceled' || order.status === 'rejected') ? 'text-rose-900' :
                                            'text-blue-900'
                                    }`}>
                                    {statusLabels[order.status] || order.status}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
