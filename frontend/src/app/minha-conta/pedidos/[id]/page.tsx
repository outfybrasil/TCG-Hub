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
    rejected: 'Recusado'
};

const methodLabels: Record<string, string> = {
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    cashback: 'Saldo de Cashback'
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
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className={`h-2 w-2 rounded-full ${order.status === 'approved' || order.status === 'delivered' ? 'bg-emerald-500' :
                            order.status === 'pending' ? 'bg-amber-500' :
                                order.status === 'shipped' ? 'bg-blue-500' : 'bg-rose-500'
                            }`} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                            {statusLabels[order.status] || order.status}
                        </span>
                    </div>
                </div>
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
                                        <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.set}</p>
                                        <p className="font-black text-slate-900 truncate">{item.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">Qtd: {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-1">R$ {item.price.toFixed(2).replace('.', ',')} un</p>
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
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1">Código de Rastreio</p>
                                    <p className="font-black text-slate-900 tracking-widest">{order.tracking_code}</p>
                                    {order.carrier && <p className="text-[10px] text-slate-500 font-bold mt-1">{order.carrier}</p>}
                                </div>
                                <a
                                    href={`https://www.linkcorreios.com.br/${order.tracking_code}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center h-12 leading-[48px] bg-blue-600 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-blue-700 transition-all"
                                >
                                    Rastrear Encomenda
                                </a>
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                    O código de rastreio será disponibilizado assim que o pedido for despachado.
                                </p>
                            </div>
                        )}

                        {order.shipping_address && (
                            <div className="pt-6 border-t border-slate-100 space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Endereço de Entrega</p>
                                <p className="text-sm font-bold text-slate-900">{order.shipping_address.street}, {order.shipping_address.number}</p>
                                {order.shipping_address.complement && <p className="text-xs text-slate-500">{order.shipping_address.complement}</p>}
                                <p className="text-xs text-slate-500">{order.shipping_address.neighborhood}</p>
                                <p className="text-xs text-slate-500">{order.shipping_address.city} - {order.shipping_address.state}</p>
                                <p className="text-xs text-slate-500">CEP: {order.shipping_address.zip_code}</p>
                            </div>
                        )}
                    </div>

                    {/* Pagamento */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Pagamento</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Método</p>
                                <p className="text-sm font-bold text-slate-900">{methodLabels[order.payment_method] || order.payment_method}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
