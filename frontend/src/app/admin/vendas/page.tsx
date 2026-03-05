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
            setPurchases(data || []);
        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchases();
    }, []);

    const handleRefund = async (purchaseId: string, paymentId: string) => {
        if (!confirm('Tem certeza que deseja reembolsar esta venda? Esta ação não pode ser desfeita no Mercado Pago.')) return;

        setRefundingId(purchaseId);
        try {
            const response = await fetch('/api/pagamento/reembolso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchaseId, paymentId })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Reembolso concluído com sucesso!');
                fetchPurchases(); // Refresh list
            } else {
                alert(`Erro ao reembolsar: ${result.error || result.details || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro no refund:', error);
            alert('Erro de conexão ao tentar processar o reembolso.');
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

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'refunded': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'Aprovado';
            case 'refunded': return 'Reembolsado';
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
                                ) : purchases.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">Nenhuma venda encontrada.</td>
                                    </tr>
                                ) : (
                                    purchases.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6">
                                                <p className="text-xs font-black text-slate-900">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">#{p.id.split('-')[0]}</p>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-xs font-bold text-slate-600">
                                                    {p.items?.length || 0} item(ns)
                                                </p>
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
                                                        onClick={() => handleRefund(p.id, p.mp_payment_id)}
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
        </AdminGuard>
    );
}
