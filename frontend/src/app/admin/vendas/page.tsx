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
        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
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
            case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'refunded': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'canceled': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
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

    return (
        <AdminGuard>
            <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up">
                <div className="mb-12 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Controle Financeiro</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">
                        Gestão de <span className="text-rose-600">Vendas.</span>
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-4 mb-8 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('ativas')}
                        className={`pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'ativas' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Vendas Ativas
                    </button>
                    <button
                        onClick={() => setActiveTab('canceladas')}
                        className={`pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'canceladas' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Canceladas / Reembolsadas
                    </button>
                </div>

                {/* Summary Metrics */}
                {activeTab === 'ativas' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total de Vendas (Ativas)</h3>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">
                                {purchases.filter(p => !['canceled', 'refunded', 'rejected'].includes(p.status)).length}
                            </p>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Receita Bruta (Ativas)</h3>
                            <p className="text-3xl font-black text-emerald-900 tracking-tighter">
                                R$ {purchases.filter(p => !['canceled', 'refunded', 'rejected'].includes(p.status)).reduce((acc, p) => acc + (p.total_amount - p.discount_amount), 0).toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                    </div>
                )}

                <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Itens</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Valor</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold animate-pulse">Carregando transações...</td>
                                    </tr>
                                ) : purchases.filter(p => activeTab === 'ativas' ? !['canceled', 'refunded', 'rejected'].includes(p.status) : ['canceled', 'refunded', 'rejected'].includes(p.status)).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">Nenhuma venda encontrada.</td>
                                    </tr>
                                ) : (
                                    purchases.filter(p => activeTab === 'ativas' ? !['canceled', 'refunded', 'rejected'].includes(p.status) : ['canceled', 'refunded', 'rejected'].includes(p.status)).map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6">
                                                <p className="text-xs font-black text-slate-900">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">#{p.id.split('-')[0]}</p>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-xs font-bold text-slate-600 mb-1">
                                                        {p.items?.length || 0} item(ns)
                                                    </p>
                                                    {p.items?.map((item: any, idx: number) => (
                                                        <div key={item.id || idx} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                            <div className="h-12 w-9 shrink-0 bg-white rounded overflow-hidden relative border border-slate-200 shadow-sm">
                                                                <img src={item.imageUrl || item.image_url || 'https://placehold.co/400x600/eeeeee/999999?text=Sem+Foto'} alt={item.name || item.title} className="absolute inset-0 w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-black text-slate-800 truncate leading-tight">{item.name || item.title || item.card_name}</p>
                                                                <p className="text-[9px] text-slate-500 font-bold mt-0.5">Qtd: {item.quantity}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-sm font-black text-slate-900">
                                                    R$ {(p.total_amount - p.discount_amount).toFixed(2).replace('.', ',')}
                                                </p>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${getStatusStyle(p.status)}`}>
                                                    {getStatusLabel(p.status)}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                {p.status === 'approved' && p.mp_payment_id && (
                                                    <button
                                                        onClick={() => confirmRefund(p.id, p.mp_payment_id)}
                                                        disabled={refundingId === p.id}
                                                        className="h-9 px-4 bg-slate-100 text-slate-900 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 inline-block mr-2 mb-2"
                                                    >
                                                        {refundingId === p.id ? 'Processando...' : 'Reembolsar'}
                                                    </button>
                                                )}

                                                {editingTracking === p.id ? (
                                                    <div className="flex flex-col gap-2 min-w-[200px] mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                        <input
                                                            type="text"
                                                            value={trackCode}
                                                            onChange={e => setTrackCode(e.target.value)}
                                                            placeholder="Código de Rastreio"
                                                            className="h-8 px-2 text-xs rounded border border-slate-200"
                                                        />
                                                        <select
                                                            value={trackStatus}
                                                            onChange={e => setTrackStatus(e.target.value)}
                                                            className="h-8 px-2 text-xs rounded border border-slate-200 bg-white"
                                                        >
                                                            <option value="approved">Aprovado (Preparando)</option>
                                                            <option value="shipped">Enviado</option>
                                                            <option value="delivered">Entregue</option>
                                                            <option value="refunded">Reembolsado (Histórico)</option>
                                                            <option value="canceled">Cancelado</option>
                                                        </select>
                                                        <div className="flex gap-2 justify-end mt-1">
                                                            <button onClick={() => setEditingTracking(null)} className="h-7 px-3 bg-white text-slate-500 text-[9px] font-black uppercase tracking-widest rounded shadow-sm border border-slate-200 hover:bg-slate-50">Cancelar</button>
                                                            <button onClick={() => handleUpdateTracking(p.id)} disabled={updatingTrack} className="h-7 px-3 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded shadow-sm hover:bg-rose-600 disabled:opacity-50">Salvar</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingTracking(p.id);
                                                            setTrackCode(p.tracking_code || '');
                                                            setTrackStatus(p.status);
                                                        }}
                                                        className="h-9 px-4 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all inline-block"
                                                    >
                                                        Alterar Rastreio / Status
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setDeleteModal({ isOpen: true, purchaseId: p.id })}
                                                    className="h-9 w-9 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg flex items-center justify-center transition-all border border-transparent hover:border-rose-100 shadow-sm ml-2 inline-block align-middle"
                                                    title="Excluir Registro"
                                                >
                                                    <span className="text-xs">✕</span>
                                                </button>

                                                {p.status === 'refunded' && (
                                                    <span className="text-[9px] font-black text-slate-300 uppercase italic block mt-2">Operação Finalizada</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Refund Confirmation Modal */}
            {refundModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-fade-up">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-3xl">⚠️</span>
                            <div>
                                <h3 className="text-xl font-black tracking-tighter text-slate-900">Confirmar Reembolso</h3>
                                <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest">Atenção</p>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-8 leading-relaxed">
                            Tem certeza que deseja reembolsar esta venda? O valor será estornado no Mercado Pago, o pedido será <strong className="text-rose-600">cancelado</strong> e as cartas retornarão ao estoque. Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRefundModal({ isOpen: false, purchaseId: null, paymentId: null })}
                                className="h-10 px-6 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleRefund}
                                className="h-10 px-6 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                            >
                                Confirmar Reembolso
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal (Success/Error) */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-fade-up text-center">
                        <div className="text-5xl mb-4">
                            {alertModal.type === 'success' ? '✅' : '❌'}
                        </div>
                        <h3 className="text-2xl font-black tracking-tighter text-slate-900 mb-2">{alertModal.title}</h3>
                        <p className="text-sm font-medium text-slate-600 mb-8 max-w-[260px] mx-auto leading-relaxed">
                            {alertModal.message}
                        </p>
                        <button
                            onClick={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'success' })}
                            className="h-12 w-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-fade-up">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-3xl">🗑️</span>
                            <div>
                                <h3 className="text-xl font-black tracking-tighter text-slate-900">Excluir Registro</h3>
                                <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest">Ação Irreversível</p>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-8 leading-relaxed">
                            Tem certeza que deseja <strong className="text-rose-600">excluir permanentemente</strong> este registro de venda? Esta ação não pode ser desfeita e removerá os dados do histórico.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, purchaseId: null })}
                                className="h-10 px-6 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="h-10 px-6 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                            >
                                Confirmar Exclusão
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminGuard>
    );
}
