"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';

import { supabase } from '@/lib/supabase';

interface UserCollectionItem {
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
}

interface DeleteTargetItem {
    type: 'item';
    id: string;
    title: string;
    message: string;
}

interface DeleteTargetCollection {
    type: 'collection';
    setName: string;
    title: string;
    message: string;
}

type DeleteTarget = DeleteTargetItem | DeleteTargetCollection;

interface CollectionGroup {
    setName: string;
    totalItems: number;
    totalInvested: number;
    currentValue: number;
    sampleImage?: string;
    items: UserCollectionItem[];
}

export default function UserInventoryPage() {
    const router = useRouter();
    const [items, setItems] = useState<UserCollectionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [modalPage, setModalPage] = useState(1);
    const [editingPriceTarget, setEditingPriceTarget] = useState<string | null>(null);
    const [editingPriceValue, setEditingPriceValue] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const getAuthHeaders = async (headers: HeadersInit = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        return {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    const updateStats = (collection: UserCollectionItem[]) => {
        const totalInvested = collection.reduce(
            (sum, item) => sum + (item.purchase_price || 0) * item.quantity,
            0
        );
        const currentMarketValue = collection.reduce(
            (sum, item) => sum + (item.currentValue || 0) * item.quantity,
            0
        );

        return {
            totalInvested,
            currentMarketValue,
            itemsCount: collection.length,
        };
    };

    const fetchInventory = async (isInitial = false) => {
        if (isInitial) setLoading(true);

        try {
            const res = await fetch('/api/user/inventory', {
                headers: await getAuthHeaders(),
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.error || 'Falha ao carregar o inventario.');
            }

            setItems(data?.collection || []);

            if (isInitial) {
                void syncInventory();
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            setSyncError(error instanceof Error ? error.message : 'Falha ao carregar o inventario.');
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const syncInventory = async () => {
        if (syncing) return;

        setSyncing(true);
        setSyncError(null);
        try {
            const res = await fetch('/api/user/inventory/sync', {
                method: 'POST',
                headers: await getAuthHeaders(),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || 'Falha ao sincronizar os valores do inventario.');
            }

            await fetchInventory(false);
        } catch (error) {
            console.error('Error syncing inventory:', error);
            setSyncError(
                error instanceof Error ? error.message : 'Falha ao sincronizar os valores do inventario.'
            );
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        void fetchInventory(true);
    }, []);

    const groupedCollections = useMemo(() => {
        return items.reduce<Record<string, CollectionGroup>>((acc, item) => {
            if (!acc[item.set_name]) {
                acc[item.set_name] = {
                    setName: item.set_name,
                    totalItems: 0,
                    totalInvested: 0,
                    currentValue: 0,
                    sampleImage: item.image_url,
                    items: [],
                };
            }

            acc[item.set_name].totalItems += item.quantity;
            acc[item.set_name].totalInvested += (item.purchase_price || 0) * item.quantity;
            acc[item.set_name].currentValue += (item.currentValue || 0) * item.quantity;
            acc[item.set_name].items.push(item);
            return acc;
        }, {});
    }, [items]);

    const collectionList = useMemo(
        () => Object.values(groupedCollections).sort((a, b) => b.currentValue - a.currentValue),
        [groupedCollections]
    );

    const stats = useMemo(() => updateStats(items), [items]);
    const profitLoss = stats.currentMarketValue - stats.totalInvested;
    const profitPercentage = stats.totalInvested > 0
        ? (profitLoss / stats.totalInvested) * 100
        : 0;

    const selectedCollectionData = selectedCollection ? groupedCollections[selectedCollection] : null;
    const itemsPerPage = 10;
    const totalPages = selectedCollectionData
        ? Math.ceil(selectedCollectionData.items.length / itemsPerPage)
        : 0;
    const currentModalItems = selectedCollectionData
        ? selectedCollectionData.items.slice((modalPage - 1) * itemsPerPage, modalPage * itemsPerPage)
        : [];

    const openItemDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteTarget({
            type: 'item',
            id,
            title: 'Apagar carta',
            message: 'Tem certeza que deseja remover esta carta do inventario?',
        });
    };

    const openCollectionDelete = (e: React.MouseEvent, setName: string) => {
        e.stopPropagation();
        setDeleteTarget({
            type: 'collection',
            setName,
            title: 'Apagar colecao',
            message: `Tem certeza que deseja apagar toda a colecao "${setName}" do inventario?`,
        });
    };

    const confirmDelete = async () => {
        if (!deleteTarget || deleteLoading) return;

        setDeleteLoading(true);
        try {
            const isItemDelete = deleteTarget.type === 'item';
            const query = isItemDelete ? `?id=${encodeURIComponent(deleteTarget.id)}` : '';
            const body = isItemDelete
                ? { id: deleteTarget.id }
                : { set_name: deleteTarget.setName };

            const res = await fetch(`/api/user/inventory${query}`, {
                method: 'DELETE',
                headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(body),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || 'Erro ao remover item do inventario.');
            }

            await fetchInventory(false);

            if (deleteTarget.type === 'collection' && selectedCollection === deleteTarget.setName) {
                setSelectedCollection(null);
            }

            setDeleteTarget(null);
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            alert(error instanceof Error ? error.message : 'Erro ao remover item do inventario.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleUpdatePrice = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
        e.stopPropagation();

        try {
            let priceNum = parseFloat(editingPriceValue.replace(',', '.'));
            if (Number.isNaN(priceNum) || priceNum < 0) priceNum = 0;

            const res = await fetch('/api/user/inventory', {
                method: 'PATCH',
                headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ id, updates: { purchase_price: priceNum } }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Erro ao atualizar preco.');
            }

            await fetchInventory(false);
            setEditingPriceTarget(null);
        } catch (error) {
            console.error('Error updating price:', error);
            alert(error instanceof Error ? error.message : 'Erro ao atualizar preco.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 rounded-full border-2 border-rose-600 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-6 py-12 animate-fade-up">
            <div className="mb-16 flex flex-col items-end justify-between gap-8 border-b border-slate-200 pb-12 md:flex-row">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">
                                Controle de portfolio pessoal
                            </span>
                        </div>
                        {syncing && (
                            <div className="inline-flex animate-pulse items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1">
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500"></div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                                    Sincronizando valores...
                                </span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-slate-900">
                        Meu <span className="text-rose-600">Inventario.</span>
                    </h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Acompanhe a valorizacao da sua colecao
                    </p>
                    {syncError && (
                        <p className="max-w-xl rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                            {syncError}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={syncInventory}
                        disabled={syncing}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {syncing ? 'Sincronizando...' : 'Sincronizar valores'}
                    </button>
                    <NextLink
                        href="/minha-conta/inventario/novo"
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-rose-600"
                    >
                        Adicionar cartas
                    </NextLink>
                </div>
            </div>

            <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Investido</p>
                    <h2 className="mt-3 text-4xl font-black tracking-tighter text-slate-900">
                        R$ {stats.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h2>
                </div>
                <div className="rounded-[32px] border border-rose-100 bg-rose-50/60 p-8 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Valor atual</p>
                    <h2 className="mt-3 text-4xl font-black tracking-tighter text-slate-950">
                        R$ {stats.currentMarketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h2>
                </div>
                <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resultado</p>
                    <div className="mt-3 flex items-center gap-3">
                        <h2 className={`text-4xl font-black tracking-tighter ${profitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {profitLoss >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
                        </h2>
                        <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${profitLoss >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            R$ {Math.abs(profitLoss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className="mb-10 flex items-center gap-6">
                    <h2 className="whitespace-nowrap text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">
                        Cards na colecao ({stats.itemsCount})
                    </h2>
                    <div className="h-px flex-1 bg-slate-100"></div>
                </div>

                {collectionList.length === 0 ? (
                    <div className="space-y-6 rounded-[40px] border-2 border-dashed border-slate-200 bg-white p-20 text-center">
                        <div className="text-5xl">[]</div>
                        <h3 className="text-2xl font-black text-slate-900">Sua colecao esta vazia.</h3>
                        <p className="mx-auto max-w-sm font-medium text-slate-400">
                            Comece a adicionar suas cartas para acompanhar o valor de mercado.
                        </p>
                        <NextLink
                            href="/minha-conta/inventario/novo"
                            className="inline-flex h-12 items-center rounded-xl bg-slate-950 px-8 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-rose-600"
                        >
                            Comecar agora
                        </NextLink>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {collectionList.map((collection) => (
                            <div
                                key={collection.setName}
                                onClick={() => {
                                    setSelectedCollection(collection.setName);
                                    setModalPage(1);
                                }}
                                className="group relative flex cursor-pointer flex-col items-center gap-4 rounded-[30px] border border-slate-100 bg-white p-6 text-center shadow-sm transition-all hover:border-rose-100 hover:shadow-xl"
                            >
                                <button
                                    type="button"
                                    onClick={(e) => openCollectionDelete(e, collection.setName)}
                                    className="absolute right-4 top-4 z-20 rounded-full border border-rose-100 bg-white p-2 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                    title="Apagar colecao inteira"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                <div className="relative z-10 mb-2 h-32 w-24 flex-shrink-0 pointer-events-none">
                                    <img
                                        src={collection.sampleImage || 'https://images.pokemontcg.io/base1/4.png'}
                                        alt={collection.setName}
                                        className="h-full w-full rounded-lg object-contain shadow-lg transition-transform duration-500 group-hover:scale-110"
                                    />
                                </div>
                                <div className="z-10 space-y-1 pointer-events-none">
                                    <h3 className="text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-rose-600">
                                        {collection.setName}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {collection.totalItems} cartas na colecao
                                    </p>
                                </div>
                                <div className="z-10 mt-4 grid w-full grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-center pointer-events-none">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Investido</p>
                                        <p className="font-black text-slate-900">
                                            R$ {collection.totalInvested.toFixed(2).replace('.', ',')}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Valor atual</p>
                                        <p className="font-black text-slate-950">
                                            R$ {collection.currentValue.toFixed(2).replace('.', ',')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedCollectionData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setSelectedCollection(null)}
                    ></div>
                    <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl animate-fade-up">
                        <div className="flex items-center justify-between border-b border-slate-100 p-8">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                                    {selectedCollectionData.setName}
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {selectedCollectionData.totalItems} cartas | Valor total: R$ {selectedCollectionData.currentValue.toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={(e) => openCollectionDelete(e, selectedCollectionData.setName)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600 transition-colors hover:bg-rose-600 hover:text-white"
                                >
                                    Apagar colecao
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCollection(null)}
                                    className="rounded-full bg-slate-100 p-3 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto p-4 md:p-8">
                            {currentModalItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="group relative flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white p-4 md:flex-row md:items-center md:gap-6"
                                >
                                    <div className="flex w-full flex-1 items-center gap-4 md:w-auto">
                                        <div
                                            className="h-20 w-14 flex-shrink-0 cursor-pointer"
                                            onClick={() => router.push(`/minha-conta/inventario/${item.id}`)}
                                        >
                                            <img
                                                src={item.image_url || 'https://images.pokemontcg.io/base1/4.png'}
                                                alt={item.name}
                                                className="h-full w-full rounded-md object-contain shadow-sm transition-transform group-hover:scale-105"
                                            />
                                        </div>
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => router.push(`/minha-conta/inventario/${item.id}`)}
                                        >
                                            <h4 className="text-lg font-black leading-tight text-slate-900 transition-colors group-hover:text-rose-600">
                                                {item.name}
                                            </h4>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="rounded-sm border border-slate-100 bg-slate-50 px-2 py-1 text-[8px] font-black uppercase text-slate-500">
                                                    {item.condition}
                                                </span>
                                                <span className="rounded-sm border border-slate-100 bg-slate-50 px-2 py-1 text-[8px] font-black uppercase text-slate-500">
                                                    {item.finish}
                                                </span>
                                                <span className="rounded-sm border border-slate-100 bg-slate-50 px-2 py-1 text-[8px] font-black uppercase text-slate-500">
                                                    {item.language}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex w-full items-center justify-between gap-4 border-t border-slate-100 pt-4 md:w-auto md:justify-end md:gap-8 md:border-t-0 md:pt-0">
                                        <div className="w-16 text-center">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Qtd</p>
                                            <p className="font-black text-slate-900">{item.quantity}x</p>
                                        </div>
                                        <div className="relative w-24 text-center">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pago</p>
                                            {editingPriceTarget === item.id ? (
                                                <div className="absolute inset-x-0 z-20 mt-1 flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white p-1.5 shadow-xl md:top-6">
                                                    <span className="text-[10px] font-bold text-slate-400">R$</span>
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        className="w-14 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-sm font-black text-slate-900 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                                                        value={editingPriceValue}
                                                        onChange={(e) => setEditingPriceValue(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') void handleUpdatePrice(e, item.id);
                                                            if (e.key === 'Escape') setEditingPriceTarget(null);
                                                        }}
                                                    />
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => void handleUpdatePrice(e, item.id)}
                                                            className="rounded bg-emerald-100 p-0.5 leading-none text-emerald-600 hover:text-emerald-700"
                                                            title="Salvar"
                                                        >
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingPriceTarget(null);
                                                            }}
                                                            className="rounded bg-rose-100 p-0.5 leading-none text-rose-600 hover:text-rose-700"
                                                            title="Cancelar"
                                                        >
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="group/edit inline-flex cursor-pointer items-center gap-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingPriceTarget(item.id);
                                                        setEditingPriceValue((item.purchase_price || 0).toString().replace('.', ','));
                                                    }}
                                                    title="Clique para editar o valor pago"
                                                >
                                                    <p className="border-b border-dashed border-slate-300 font-black text-slate-900 transition-colors group-hover/edit:border-rose-400">
                                                        R$ {(item.purchase_price || 0).toFixed(2).replace('.', ',')}
                                                    </p>
                                                    <span className="opacity-0 transition-all group-hover/edit:text-rose-500 group-hover/edit:opacity-100 text-slate-300">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-24 text-center md:border-l md:border-slate-100 md:pl-4">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-rose-500">Atual</p>
                                            <p className="font-black text-slate-950">
                                                R$ {item.currentValue.toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => openItemDelete(e, item.id)}
                                            className="absolute right-4 top-4 rounded-full p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 md:relative md:right-auto md:top-auto"
                                            title="Remover do inventario"
                                        >
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-auto flex items-center justify-between border-t border-slate-200 bg-slate-50 p-6">
                                <button
                                    type="button"
                                    onClick={() => setModalPage((page) => Math.max(1, page - 1))}
                                    disabled={modalPage === 1}
                                    className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                                    Pagina <span className="text-slate-900">{modalPage}</span> de {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setModalPage((page) => Math.min(totalPages, page + 1))}
                                    disabled={modalPage === totalPages}
                                    className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Proxima
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                        onClick={() => {
                            if (!deleteLoading) setDeleteTarget(null);
                        }}
                    ></div>
                    <div className="relative w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600">
                                Confirmacao
                            </p>
                            <h3 className="text-3xl font-black tracking-tight text-slate-950">
                                {deleteTarget.title}
                            </h3>
                            <p className="text-sm font-medium leading-6 text-slate-500">
                                {deleteTarget.message}
                            </p>
                        </div>
                        <div className="mt-8 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleteLoading}
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmDelete()}
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
