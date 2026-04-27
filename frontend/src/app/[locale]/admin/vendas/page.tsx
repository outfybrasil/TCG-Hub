"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminGuard from '@/components/AdminGuard';
import Link from 'next/link';

interface Purchase {
    id: string;
    created_at: string;
    user_id: string;
    total_amount: number;
    discount_amount: number;
    status: string;
    payment_method: string;
    mp_payment_id: string;
    tracking_code?: string;
    carrier?: string;
    items: any[];
}

export default function AdminSalesPage() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [refundingId, setRefundingId] = useState<string | null>(null);
    const [refundModal, setRefundModal] = useState<{ isOpen: boolean; purchaseId: string | null; paymentId: string | null }>({ isOpen: false, purchaseId: null, paymentId: null });
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; purchaseId: string | null }>({ isOpen: false, purchaseId: null });
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'success' });
    const [activeTab, setActiveTab] = useState<'ativas' | 'canceladas'>('ativas');

    const [editingTracking, setEditingTracking] = useState<string | null>(null);
    const [trackCode, setTrackCode] = useState('');
    const [trackStatus, setTrackStatus] = useState('');
    const [updatingTrack, setUpdatingTrack] = useState(false);

    const fetchPurchases = async () => {
        try {
            const { data, error } = await supabase
                .from('purchases')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const purchasesData = data || [];
            const missingImageIds = new Set<string>();
            purchasesData.forEach(p => {
                p.items?.forEach((item: any) => {
                    if (!item.imageUrl && !item.image_url && item.id) {
                        missingImageIds.add(item.id);
                    }
                });
            });

            if (missingImageIds.size > 0) {
                const { data: invData } = await supabase
                    .from('inventory')
                    .select('id, cards(image_url)')
                    .in('id', Array.from(missingImageIds));

                if (invData) {
                    const imageMap: Record<string, string> = {};
                    invData.forEach(inv => {
                        if (inv.cards && (inv.cards as any).image_url) {
                            imageMap[inv.id] = (inv.cards as any).image_url;
                        }
                    });

                    // Secondary fallback: search by name for those still missing
                    const missingNames = new Set<string>();
                    purchasesData.forEach(p => {
                        p.items?.forEach((item: any) => {
                            if (!item.imageUrl && !item.image_url && item.id) {
                                if (imageMap[item.id]) {
                                    item.imageUrl = imageMap[item.id];
                                } else if (item.name || item.title || item.card_name) {
                                    missingNames.add(item.name || item.title || item.card_name);
                                }
                            }
                        });
                    });

                    if (missingNames.size > 0) {
                        const { data: cardsData } = await supabase
                            .from('cards')
                            .select('name, image_url')
                            .in('name', Array.from(missingNames));

                        if (cardsData) {
                            const nameMap: Record<string, string> = {};
                            cardsData.forEach(card => {
                                if (card.image_url) nameMap[card.name] = card.image_url;
                            });

                            purchasesData.forEach(p => {
                                p.items?.forEach((item: any) => {
                                    if (!item.imageUrl && !item.image_url) {
                                        const itemName = item.name || item.title || item.card_name;
                                        if (itemName && nameMap[itemName]) {
                                            item.imageUrl = nameMap[itemName];
                                        }
                                    }
                                });
                            });
                        }
                    }
                }
            }

            setPurchases(purchasesData);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchases();
    }, []);

    const confirmRefund = (purchaseId: string, paymentId: string) => {
        setRefundModal({ isOpen: true, purchaseId, paymentId });
    };

    const handleRefund = async () => {
        if (!refundModal.purchaseId || !refundModal.paymentId) return;

        const { purchaseId, paymentId } = refundModal;
        setRefundingId(purchaseId);
        setRefundModal({ isOpen: false, purchaseId: null, paymentId: null });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch('/api/pagamento/reembolso', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ purchaseId, paymentId })
            });

            const result = await response.json();

            if (response.ok) {
                setAlertModal({ isOpen: true, title: 'Sucesso!', message: 'Reembolso e Cancelamento concluídos.', type: 'success' });
                fetchPurchases(); // Refresh list
            } else {
                setAlertModal({ isOpen: true, title: 'Erro', message: `Erro ao reembolsar: ${result.error || result.details || 'Erro desconhecido'}`, type: 'error' });
            }
        } catch (error) {
            console.error('Erro no refund:', error);
            setAlertModal({ isOpen: true, title: 'Erro', message: 'Erro de conexão ao tentar processar o reembolso.', type: 'error' });
        } finally {
            setRefundingId(null);
        }
    };

    const handleUpdateTracking = async (id: string) => {
        setUpdatingTrack(true);
        try {
            const { error } = await supabase.from('purchases').update({
                tracking_code: trackCode || null,
                status: trackStatus,
                carrier: trackCode ? 'Correios' : null,
                updated_at: new Date().toISOString()
            }).eq('id', id);

            if (error) throw error;
            setEditingTracking(null);
            fetchPurchases();
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar rastreio.');
        } finally {
            setUpdatingTrack(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.purchaseId) return;

        const purchaseId = deleteModal.purchaseId;
        setDeleteModal({ isOpen: false, purchaseId: null });

        try {
            const { error } = await supabase
                .from('purchases')
                .delete()
                .eq('id', purchaseId);

            if (error) throw error;

            setAlertModal({ isOpen: true, title: 'Sucesso!', message: 'Registro de venda removido permanentemente.', type: 'success' });
            fetchPurchases();
        } catch (error) {
            console.error('Erro ao deletar venda:', error);
            setAlertModal({ isOpen: true, title: 'Erro', message: 'Erro ao tentar deletar o registro no banco de dados.', type: 'error' });
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'refunded': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'canceled': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'rejected': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-white/5 text-slate-400 border-white/10';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'Aprovado';
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

    return (
        <AdminGuard>
            <div className="min-h-screen bg-slate-900 text-white selection:bg-rose-500/30">
                <div className="max-w-7xl mx-auto px-6 py-20 animate-fade-up">
                    <div className="mb-16 space-y-6">
                        <div className="inline-flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.6)]"></span>
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Controle Financeiro</span>
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter text-white uppercase leading-none">
                            Gestão de <span className="text-rose-600">Vendas.</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Painel Administrativo Hub</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 mb-12 border-b border-white/10">
                        <button
                            onClick={() => setActiveTab('ativas')}
                            className={`pb-6 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'ativas' ? 'border-rose-600 text-rose-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            Vendas Ativas
                        </button>
                        <button
                            onClick={() => setActiveTab('canceladas')}
                            className={`pb-6 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'canceladas' ? 'border-amber-600 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            Canceladas / Reembolsadas
                        </button>
                    </div>

                    {/* Summary Metrics */}
                    {activeTab === 'ativas' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                            <div className="bg-white/5 p-8 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[60px] -z-10"></div>
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Total de Vendas (Ativas)</h3>
                                <p className="text-4xl font-black text-white tracking-tighter tabular-nums">
                                    {purchases.filter(p => !['canceled', 'refunded', 'rejected'].includes(p.status)).length}
                                </p>
                            </div>
                            <div className="bg-white/5 p-8 rounded-[32px] border border-emerald-500/10 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-[60px] -z-10"></div>
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 mb-3">Receita Bruta (Ativas)</h3>
                                <p className="text-4xl font-black text-emerald-500 tracking-tighter tabular-nums">
                                    R$ {purchases.filter(p => !['canceled', 'refunded', 'rejected'].includes(p.status)).reduce((acc, p) => acc + (p.total_amount - p.discount_amount), 0).toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white/5 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Data</th>
                                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Itens</th>
                                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Valor</th>
                                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {purchases.filter(p => activeTab === 'ativas' ? !['canceled', 'refunded', 'rejected'].includes(p.status) : ['canceled', 'refunded', 'rejected'].includes(p.status)).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">Nenhuma venda encontrada_</td>
                                        </tr>
                                    ) : (
                                        purchases.filter(p => activeTab === 'ativas' ? !['canceled', 'refunded', 'rejected'].includes(p.status) : ['canceled', 'refunded', 'rejected'].includes(p.status)).map((p) => (
                                            <tr key={p.id} className="group hover:bg-white/5 transition-all">
                                                <td className="p-8">
                                                    <p className="text-sm font-black text-white tabular-nums">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">#{p.id.split('-')[0]}</p>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex flex-col gap-4">
                                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                                            {p.items?.length || 0} Ativos_
                                                        </p>
                                                        <div className="flex flex-wrap gap-3">
                                                            {p.items?.map((item: any, idx: number) => (
                                                                <div key={item.id || idx} className="group/card relative h-16 w-12 flex-shrink-0 bg-slate-800 rounded-lg overflow-hidden border border-white/5 shadow-2xl transition-transform hover:scale-110 hover:z-10">
                                                                    <img src={item.imageUrl || item.image_url || 'https://placehold.co/400x600/eeeeee/999999?text=Sem+Foto'} alt={item.name || item.title} className="absolute inset-0 w-full h-full object-cover" title={item.name || item.title || item.card_name} />
                                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-0.5 text-[8px] font-black text-white text-center">x{item.quantity}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <p className="text-lg font-black text-white tabular-nums">
                                                        R$ {(p.total_amount - p.discount_amount).toFixed(2).replace('.', ',')}
                                                    </p>
                                                </td>
                                                <td className="p-8">
                                                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${getStatusStyle(p.status)}`}>
                                                        {getStatusLabel(p.status)}
                                                    </span>
                                                </td>
                                                <td className="p-8 text-right">
                                                    <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                        {p.status === 'approved' && p.mp_payment_id && (
                                                            <button
                                                                onClick={() => confirmRefund(p.id, p.mp_payment_id)}
                                                                disabled={refundingId === p.id}
                                                                className="h-10 px-4 bg-white/5 border border-white/10 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                                                            >
                                                                {refundingId === p.id ? 'Processando...' : 'Reembolsar'}
                                                            </button>
                                                        )}

                                                        {editingTracking === p.id ? (
                                                            <div className="flex flex-col gap-2 min-w-[200px] bg-slate-950 p-4 rounded-2xl border border-white/10 shadow-2xl animate-fade-in text-left">
                                                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Código de Rastreio</label>
                                                                <input
                                                                    type="text"
                                                                    value={trackCode}
                                                                    onChange={e => setTrackCode(e.target.value)}
                                                                    className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white focus:border-rose-600 outline-none transition-all"
                                                                />
                                                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">Status do Pedido</label>
                                                                <select
                                                                    value={trackStatus}
                                                                    onChange={e => setTrackStatus(e.target.value)}
                                                                    className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none cursor-pointer appearance-none"
                                                                >
                                                                    <option value="approved" className="bg-slate-900">Aprovado (Preparando)</option>
                                                                    <option value="shipped" className="bg-slate-900">Enviado</option>
                                                                    <option value="delivered" className="bg-slate-900">Entregue</option>
                                                                    <option value="refunded" className="bg-slate-900">Reembolsado (Histórico)</option>
                                                                    <option value="canceled" className="bg-slate-900">Cancelado</option>
                                                                </select>
                                                                <div className="flex gap-2 justify-end mt-4">
                                                                    <button onClick={() => setEditingTracking(null)} className="h-8 px-4 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancelar</button>
                                                                    <button onClick={() => handleUpdateTracking(p.id)} disabled={updatingTrack} className="h-8 px-4 bg-rose-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-rose-700 transition-all disabled:opacity-50">Salvar Alterações</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingTracking(p.id);
                                                                    setTrackCode(p.tracking_code || '');
                                                                    setTrackStatus(p.status);
                                                                }}
                                                                className="h-10 px-4 bg-white/5 border border-white/10 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all"
                                                            >
                                                                Status / Rastreio
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => setDeleteModal({ isOpen: true, purchaseId: p.id })}
                                                            className="h-10 w-10 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl flex items-center justify-center transition-all hover:bg-rose-600 hover:text-white"
                                                            title="Excluir Registro"
                                                        >
                                                            <span className="text-lg">🗑️</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {refundModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl px-4 animate-fade-in">
                        <div className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-sm w-full shadow-2xl">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-2xl border border-amber-500/20">⚠️</div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Reembolsar Venda</h3>
                                    <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Ação Necessária</p>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-slate-400 mb-10 leading-relaxed uppercase tracking-tight">
                                Confirmar estorno no Mercado Pago? O pedido será <strong className="text-white">cancelado</strong> e os ativos retornarão ao estoque.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleRefund}
                                    className="h-14 w-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20"
                                >
                                    Confirmar Reembolso
                                </button>
                                <button
                                    onClick={() => setRefundModal({ isOpen: false, purchaseId: null, paymentId: null })}
                                    className="h-14 w-full bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Voltar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {alertModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl px-4 animate-fade-in">
                        <div className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-sm w-full shadow-2xl text-center">
                            <div className={`h-20 w-20 rounded-full mx-auto flex items-center justify-center text-4xl mb-6 ${alertModal.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                {alertModal.type === 'success' ? '✓' : '✕'}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">{alertModal.title}</h3>
                            <p className="text-sm font-bold text-slate-400 mb-10 uppercase tracking-tight leading-relaxed">
                                {alertModal.message}
                            </p>
                            <button
                                onClick={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'success' })}
                                className="h-14 w-full bg-white text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                )}

                {deleteModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl px-4 animate-fade-in">
                        <div className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-sm w-full shadow-2xl">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-2xl border border-rose-500/20">🗑️</div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Remover Registro</h3>
                                    <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest">Irreversível</p>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-slate-400 mb-10 leading-relaxed uppercase tracking-tight">
                                Tem certeza que deseja <strong className="text-white">excluir permanentemente</strong> este registro de venda?
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleDelete}
                                    className="h-14 w-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20"
                                >
                                    Excluir Agora
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ isOpen: false, purchaseId: null })}
                                    className="h-14 w-full bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminGuard>
    );
}
