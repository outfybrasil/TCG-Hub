"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

interface CardDetail {
    id: string;
    name: string;
    set_name: string;
    number?: string;
    image_url?: string;
    language: string;
    condition: string;
    finish: string;
    quantity: number;
    purchase_price?: number;
    currentValue: number;
    lastSync?: string;
    marketSite?: string;
    created_at: string;
}

export default function CardProfilePage() {
    const params = useParams();
    const router = useRouter();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const [card, setCard] = useState<CardDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const getAuthHeaders = async (headers: HeadersInit = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        return {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    useEffect(() => {
        const fetchCard = async () => {
            if (!id) {
                router.push('/minha-conta/inventario');
                return;
            }

            try {
                const res = await fetch(`/api/user/inventory?id=${encodeURIComponent(id)}`, {
                    headers: await getAuthHeaders(),
                });
                const data = await res.json().catch(() => null);

                if (!res.ok || !data?.card) {
                    router.push('/minha-conta/inventario');
                    return;
                }

                setCard(data.card);
            } catch (error) {
                console.error('Error fetching card:', error);
                router.push('/minha-conta/inventario');
            } finally {
                setLoading(false);
            }
        };

        void fetchCard();
    }, [id, router]);

    const handleDelete = async () => {
        if (!id || deleteLoading) return;

        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/user/inventory?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ id }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || 'Erro ao remover carta.');
            }

            router.push('/minha-conta/inventario');
        } catch (error) {
            console.error('Error deleting item:', error);
            alert(error instanceof Error ? error.message : 'Erro ao remover item.');
        } finally {
            setDeleteLoading(false);
            setDeleteOpen(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 rounded-full border-2 border-rose-600 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (!card) return null;

    const totalInvested = (card.purchase_price || 0) * card.quantity;
    const totalCurrentValue = card.currentValue * card.quantity;
    const profitLoss = totalCurrentValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return (
        <div className="mx-auto max-w-6xl px-6 py-12 animate-fade-up">
            <div className="mb-12">
                <div className="mb-8 flex items-center justify-between">
                    <Link
                        href="/minha-conta/inventario"
                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-rose-600"
                    >
                        Voltar para inventario
                    </Link>

                    <button
                        type="button"
                        onClick={() => setDeleteOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-rose-600 transition-colors hover:bg-rose-600 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remover do inventario
                    </button>
                </div>

                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-rose-600">
                                Perfil do item
                            </span>
                        </div>
                        <h1 className="text-5xl font-black uppercase leading-none tracking-tighter text-slate-900">
                            {card.name}
                        </h1>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            {card.set_name} | #{card.number}
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Cotacao atual
                        </p>
                        <span className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest ${profitLoss >= 0 ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-rose-100 bg-rose-50 text-rose-600'}`}>
                            {card.currentValue > 0
                                ? `R$ ${card.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / un`
                                : 'Sem cotacao'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-4">
                    <div className="group relative overflow-hidden rounded-[40px] bg-slate-950 p-8 shadow-2xl">
                        <img
                            src={card.image_url || 'https://images.pokemontcg.io/base1/4.png'}
                            alt={card.name}
                            className="relative z-10 h-auto w-full rounded-2xl object-contain shadow-2xl transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-rose-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
                    </div>

                    <div className="flex items-center justify-between rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Quantidade</p>
                            <p className="text-xs font-black uppercase text-slate-900">{card.quantity} unidades</p>
                        </div>
                        <div className="h-8 w-px bg-slate-100"></div>
                        <div className="text-right">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">ID</p>
                            <p className="font-mono text-[9px] uppercase text-slate-400">{card.id.split('-')[0]}...</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 lg:col-span-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
                            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Seu investimento</p>
                            <h2 className="text-4xl font-black tracking-tighter text-slate-900">
                                R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h2>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                                Preco medio pago: R$ {(card.purchase_price || 0).toFixed(2)}
                            </p>
                        </div>

                        <div className="rounded-[40px] border border-rose-100 border-l-4 border-l-rose-600 bg-white p-8 shadow-sm">
                            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Valor atual</p>
                            <h2 className="text-4xl font-black tracking-tighter text-slate-900">
                                R$ {totalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h2>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-rose-600">
                                Ultima cotacao registrada
                            </p>
                        </div>
                    </div>

                    <div className={`flex flex-col items-center justify-between gap-6 rounded-[40px] border p-8 md:flex-row ${profitLoss >= 0 ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'}`}>
                        <div className="space-y-1 text-center md:text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Retorno sobre investimento
                            </p>
                            <h3 className={`text-5xl font-black tracking-tighter ${profitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {profitLoss >= 0 ? '+' : ''}R$ {Math.abs(profitLoss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="flex flex-col items-center md:items-end">
                            <div className={`rounded-2xl px-6 py-2 text-3xl font-black tracking-tighter ${profitLoss >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {profitPercentage.toFixed(1)}%
                            </div>
                            <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                Variacao acumulada
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8 rounded-[40px] border border-slate-100 bg-white p-8 shadow-sm">
                        <div className="flex items-center gap-4">
                            <h2 className="whitespace-nowrap text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">
                                Dados do card
                            </h2>
                            <div className="h-px flex-1 bg-slate-50"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Idioma</p>
                                <p className="font-black uppercase text-slate-900">{card.language}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Condicao</p>
                                <p className="font-black uppercase text-slate-900">{card.condition}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Acabamento</p>
                                <p className="font-black uppercase text-slate-900">{card.finish}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Adicionado em</p>
                                <p className="font-black uppercase text-slate-900">
                                    {new Date(card.created_at).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {deleteOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                        onClick={() => {
                            if (!deleteLoading) setDeleteOpen(false);
                        }}
                    ></div>
                    <div className="relative w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600">
                                Confirmacao
                            </p>
                            <h3 className="text-3xl font-black tracking-tight text-slate-950">
                                Apagar carta
                            </h3>
                            <p className="text-sm font-medium leading-6 text-slate-500">
                                Tem certeza que deseja remover esta carta do inventario?
                            </p>
                        </div>
                        <div className="mt-8 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteOpen(false)}
                                disabled={deleteLoading}
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDelete()}
                                disabled={deleteLoading}
                                className="rounded-2xl bg-rose-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {deleteLoading ? 'Apagando...' : 'Confirmar exclusao'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
