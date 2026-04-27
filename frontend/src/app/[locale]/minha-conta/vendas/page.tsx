'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Purchase {
    id: string;
    created_at: string;
    user_id: string;
    total_amount: number;
    discount_amount: number;
    my_total_amount: number;
    status: string;
    payment_method: string;
    tracking_code?: string;
    carrier?: string;
    buyer_name: string;
    items: any[];
}

export default function VendasPage() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ativas' | 'historico'>('ativas');
    
    const [editingTracking, setEditingTracking] = useState<string | null>(null);
    const [trackCode, setTrackCode] = useState('');
    const [trackStatus, setTrackStatus] = useState('');
    const [updatingTrack, setUpdatingTrack] = useState(false);
    const router = useRouter();

    const fetchPurchases = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/auth/login');
                return;
            }

            const res = await fetch('/api/user/vendas', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            
            if (res.ok) {
                const data = await res.json();
                setPurchases(data.purchases || []);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchases();
    }, []);

    const handleUpdateTracking = async (id: string) => {
        setUpdatingTrack(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/user/vendas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    purchaseId: id,
                    trackingCode: trackCode,
                    status: trackStatus
                })
            });

            if (!res.ok) throw new Error('Erro ao atualizar rastreio');
            
            setEditingTracking(null);
            fetchPurchases();
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar rastreio.');
        } finally {
            setUpdatingTrack(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'shipped': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'delivered': return 'bg-white/10 text-slate-400 border-white/20';
            case 'refunded': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'canceled': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'rejected': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-white/5 text-slate-400 border-white/10';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'Aprovado (Preparar)';
            case 'shipped': return 'Enviado';
            case 'delivered': return 'Entregue';
            case 'refunded': return 'Reembolsado';
            case 'canceled': return 'Cancelado';
            case 'rejected': return 'Recusado';
            case 'pending': return 'Pendente';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const filteredPurchases = purchases.filter(p => 
        activeTab === 'ativas' 
            ? !['canceled', 'refunded', 'rejected', 'delivered'].includes(p.status) 
            : ['canceled', 'refunded', 'rejected', 'delivered'].includes(p.status)
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white selection:bg-rose-500/30">
            <div className="max-w-7xl mx-auto px-6 py-16 animate-fade-up">
                <div className="mb-12 space-y-3">
                    <Link href="/minha-conta" className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors">
                        ← Minha Conta
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">🤝</span>
                        <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">
                            Minhas <span className="text-rose-600">Vendas.</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">
                        Gerencie os itens que você vendeu (Leilões / Marketplace)
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 mb-10 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('ativas')}
                        className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'ativas' ? 'border-rose-600 text-rose-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        Pedidos Ativos
                    </button>
                    <button
                        onClick={() => setActiveTab('historico')}
                        className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'historico' ? 'border-amber-600 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        Histórico / Finalizados
                    </button>
                </div>

                {purchases.length === 0 ? (
                    <div className="text-center py-24 border border-dashed border-white/10 rounded-[40px] bg-white/5">
                        <div className="text-4xl mb-4 opacity-50 grayscale">🤝</div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Nenhuma venda realizada ainda.</p>
                        <Link href="/admin/live">
                            <button className="h-12 px-8 bg-rose-600 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/20">
                                Iniciar Live de Leilão
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {filteredPurchases.length === 0 && (
                            <div className="text-center py-16">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nenhuma venda nesta categoria.</p>
                            </div>
                        )}
                        {filteredPurchases.map((p) => (
                            <div key={p.id} className="bg-slate-900 border border-white/5 p-6 rounded-[32px] shadow-sm hover:border-white/10 transition-all">
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Itens */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Comprador</p>
                                                <p className="text-lg font-black text-white">{p.buyer_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pedido</p>
                                                <p className="text-xs font-black text-white uppercase">#{p.id.split('-')[0]}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {p.items?.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-4">
                                                    <div className="h-16 w-12 bg-black/50 rounded-lg overflow-hidden border border-white/5 shrink-0">
                                                        {item.imageUrl || item.image_url ? (
                                                            <img src={item.imageUrl || item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-[8px] text-slate-500 uppercase font-black text-center p-1">S/Img</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white">{item.name || item.title || 'Item'}</p>
                                                        <p className="text-xs text-slate-500 font-bold">R$ {Number(item.price).toFixed(2).replace('.', ',')} x {item.quantity || 1}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Detalhes e Ações */}
                                    <div className="lg:w-80 shrink-0 flex flex-col justify-between bg-white/5 rounded-2xl p-6 border border-white/5">
                                        <div>
                                            <div className="flex justify-between items-center mb-6">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total da sua Venda</p>
                                                <p className="text-xl font-black text-emerald-500 tabular-nums">R$ {p.my_total_amount.toFixed(2).replace('.', ',')}</p>
                                            </div>
                                            
                                            <div className="mb-4">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Status</p>
                                                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${getStatusStyle(p.status)}`}>
                                                    {getStatusLabel(p.status)}
                                                </span>
                                            </div>
                                            
                                            {/* Endereço de entrega */}
                                            {p.shipping_address ? (
                                                <div className="mb-4 p-3 bg-black/30 rounded-xl border border-white/5">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">📦 Endereço de Entrega</p>
                                                    <p className="text-xs font-bold text-white">{p.shipping_address.nome || p.buyer_name}</p>
                                                    <p className="text-xs text-slate-400">{p.shipping_address.rua}, {p.shipping_address.numero}</p>
                                                    {p.shipping_address.complemento && <p className="text-xs text-slate-400">{p.shipping_address.complemento}</p>}
                                                    <p className="text-xs text-slate-400">{p.shipping_address.bairro} — {p.shipping_address.cidade}/{p.shipping_address.estado}</p>
                                                    <p className="text-xs text-slate-400">CEP: {p.shipping_address.cep}</p>
                                                </div>
                                            ) : (
                                                <div className="mb-4 p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">⚠️ Endereço não informado</p>
                                                    <p className="text-[8px] text-slate-500 mt-1">O comprador ainda não cadastrou endereço</p>
                                                </div>
                                            )}

                                            <div className="mb-4">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Rastreio</p>
                                                <p className="text-sm font-bold text-white tracking-widest">
                                                    {p.tracking_code || <span className="text-slate-600 font-medium">Não informado</span>}
                                                </p>
                                            </div>
                                            
                                            <p className="text-[9px] text-slate-600 font-bold">
                                                Vendido em {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>

                                        {editingTracking === p.id ? (
                                            <div className="flex flex-col gap-2 mt-4">
                                                <input
                                                    type="text"
                                                    value={trackCode}
                                                    onChange={e => setTrackCode(e.target.value)}
                                                    placeholder="Código Correios..."
                                                    className="h-10 px-3 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-white focus:border-rose-600 outline-none"
                                                />
                                                <select
                                                    value={trackStatus}
                                                    onChange={e => setTrackStatus(e.target.value)}
                                                    className="h-10 px-3 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
                                                >
                                                    <option value="approved">Preparando</option>
                                                    <option value="shipped">Enviado</option>
                                                    <option value="delivered">Entregue</option>
                                                </select>
                                                <div className="flex gap-2 justify-end mt-2">
                                                    <button onClick={() => setEditingTracking(null)} className="h-8 px-4 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancelar</button>
                                                    <button onClick={() => handleUpdateTracking(p.id)} disabled={updatingTrack} className="h-8 px-4 bg-rose-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-rose-700 transition-all disabled:opacity-50">Salvar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setEditingTracking(p.id);
                                                    setTrackCode(p.tracking_code || '');
                                                    setTrackStatus(p.status);
                                                }}
                                                className="w-full h-10 bg-white/5 border border-white/10 text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all mt-4"
                                            >
                                                Atualizar Status / Rastreio
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
