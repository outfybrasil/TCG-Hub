"use client";

import React, { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { supabase } from '@/lib/supabase';

interface TcgSet {
    id: string;
    name: string;
    logo?: string | null;
    cards?: number;
}

interface MarketSyncStats {
    activeInventory: number;
    cachedItems: number;
    uncachedItems: number;
    cachedKeys: number;
    refreshed24h: number;
    historySnapshots: number;
    lastFetchedAt: string | null;
}

interface MarketSyncResponse {
    processed: number;
    synced: number;
    failed: number;
    errors?: string[];
}

function normalizeSetName(set: Pick<TcgSet, 'id' | 'name'>) {
    if (set.id === 'me01') {
        return 'Megaevolucao - Equilibrio Perfeito';
    }

    return set.name;
}

function getSetImageSrc(asset?: string | null) {
    if (!asset) {
        return null;
    }

    if (asset.endsWith('/logo')) {
        return `${asset}/logo.png`;
    }

    if (asset.endsWith('/symbol')) {
        return `${asset}/symbol.png`;
    }

    return asset;
}

async function getAuthHeaders(headers: HeadersInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    return {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export default function SyncAdminPage() {
    const [loading, setLoading] = useState(false);
    const [marketSyncing, setMarketSyncing] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [marketStatus, setMarketStatus] = useState<string | null>(null);
    const [marketErrors, setMarketErrors] = useState<string[]>([]);
    const [marketStats, setMarketStats] = useState<MarketSyncStats | null>(null);
    const [sets, setSets] = useState<TcgSet[]>([]);
    const [syncedSets, setSyncedSets] = useState<Set<string>>(new Set());
    const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
    const [cardCount, setCardCount] = useState<number>(0);
    const [syncProgress, setSyncProgress] = useState<{ current: string; total: number; done: number } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/sync-cards/stats', {
                headers: await getAuthHeaders(),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.count !== undefined) setCardCount(data.count);
        } catch (err) {
            console.error('Erro ao buscar estatisticas:', err);
        }
    };

    const fetchMarketStats = async () => {
        try {
            const res = await fetch('/api/admin/sync-market-prices/stats', {
                headers: await getAuthHeaders(),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setMarketStats(data);
        } catch (err) {
            console.error('Erro ao buscar estatisticas do mercado:', err);
        }
    };

    useEffect(() => {
        const fetchSets = async () => {
            try {
                const allRes = await fetch('https://api.tcgdex.net/v2/pt/sets');
                const allData = await allRes.json();

                if (!allRes.ok) {
                    throw new Error('Falha ao carregar TCGdex.');
                }

                if (Array.isArray(allData)) {
                    const normalizedAllSets = [...allData]
                        .reverse()
                        .map((set: { id: string; name: string; logo?: string | null; symbol?: string | null; cardCount?: { official?: number; total?: number } }) => ({
                            id: set.id,
                            name: normalizeSetName({ id: set.id, name: set.name }),
                            logo: set.logo || set.symbol || null,
                            cards: set.cardCount?.official || set.cardCount?.total || 0,
                        }));
                    setSets(normalizedAllSets);
                }
            } catch {
                setStatus('Erro ao carregar colecoes da TCGdex.');
            }
        };

        const fetchSyncedSets = async () => {
            try {
                const res = await fetch('/api/admin/sync-cards/synced-sets', {
                    headers: await getAuthHeaders(),
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data.success) {
                    setSyncedSets(new Set(data.synced_sets));
                }
            } catch {
                // noop
            }
        };

        void fetchSets();
        void fetchStats();
        void fetchMarketStats();
        void fetchSyncedSets();
    }, []);

    const toggleSetSelection = (setId: string) => {
        const newSelection = new Set(selectedSets);
        if (newSelection.has(setId)) {
            newSelection.delete(setId);
        } else {
            newSelection.add(setId);
        }
        setSelectedSets(newSelection);
    };

    const handleSync = async (setId?: string) => {
        setLoading(true);
        setStatus(null);

        try {
            if (setId) {
                setSyncProgress({ current: 'Buscando dados...', total: 1, done: 0 });
                const res = await fetch('/api/admin/sync-cards', {
                    method: 'POST',
                    headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ setId }),
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Erro no servidor (${res.status}): ${errorText.substring(0, 100)}`);
                }

                const data = await res.json();
                if (data.success) {
                    setStatus(`Sucesso! ${data.count} cards sincronizados.`);
                    await fetchStats();
                } else {
                    throw new Error(data.error);
                }
            } else {
                const targetSets = selectedSets.size > 0
                    ? sets.filter((set) => selectedSets.has(set.id))
                    : sets.slice(0, 5);

                setSyncProgress({ current: 'Iniciando...', total: targetSets.length, done: 0 });

                let totalCount = 0;
                for (let i = 0; i < targetSets.length; i += 1) {
                    const set = targetSets[i];
                    setSyncProgress({ current: `Sincronizando: ${set.name}`, total: targetSets.length, done: i });

                    const res = await fetch('/api/admin/sync-cards', {
                        method: 'POST',
                        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({ setId: set.id }),
                    });

                    if (!res.ok) {
                        console.warn(`Set ${set.name} falhou. Pulando...`);
                        continue;
                    }

                    const data = await res.json();
                    if (data.success) {
                        totalCount += data.count;
                        setSyncedSets((prev) => new Set(prev).add(set.id));
                    }
                }

                setStatus(`Concluido! Total de ${totalCount} cards sincronizados.`);
                await fetchStats();
                setSelectedSets(new Set());
            }
        } catch (err) {
            setStatus(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
            setSyncProgress(null);
        }
    };

    const handleMarketSync = async () => {
        setMarketSyncing(true);
        setMarketStatus(null);
        setMarketErrors([]);
        try {
            const res = await fetch('/api/admin/sync-market-prices', {
                method: 'POST',
                headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ limit: 24 }),
            });

            const data = await res.json() as MarketSyncResponse & { error?: string };
            if (!res.ok) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }

            setMarketStatus(
                `Mercado atualizado: ${data.synced}/${data.processed} itens processados.` +
                (data.failed > 0 ? ` ${data.failed} falharam.` : '')
            );
            setMarketErrors(data.errors || []);
            await fetchMarketStats();
        } catch (err) {
            setMarketStatus(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        } finally {
            setMarketSyncing(false);
        }
    };

    const [confirmingSetId, setConfirmingSetId] = useState<string | null>(null);

    const handleDeleteSet = async (setId: string, setName: string) => {
        console.log('handleDeleteSet: Início', { setId, setName });
        
        if (confirmingSetId !== setId) {
            setConfirmingSetId(setId);
            console.log('handleDeleteSet: Aguardando confirmação inline');
            return;
        }

        setLoading(true);
        setStatus(null);
        setConfirmingSetId(null);
        console.log('handleDeleteSet: Enviando requisição para API');
        try {
            const res = await fetch('/api/admin/sync-cards/delete', {
                method: 'POST',
                headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ setId }),
            });

            const data = await res.json();
            if (data.success) {
                setStatus(`Sucesso! Cards da coleção ${setName} foram removidos.`);
                setSyncedSets((prev) => {
                    const next = new Set(prev);
                    next.delete(setId);
                    return next;
                });
                await fetchStats();
            } else {
                throw new Error(data.error || 'Falha na API');
            }
        } catch (err) {
            console.error('handleDeleteSet Error:', err);
            setStatus(`Erro ao deletar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredSets = sets.filter(set => 
        set.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        set.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminGuard>
            <div className="max-w-4xl mx-auto p-12 space-y-8 animate-fade-up">
                <div className="flex justify-between items-end border-b border-slate-100 pb-8">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">
                            Painel de <span className="text-rose-600">Sincronizacao</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-none">
                            Importacao de catalogo mestre TCGdex (PT-BR)
                        </p>
                    </div>
                    <div className="bg-slate-900 px-6 py-4 rounded-2xl text-white flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-1">Catalogo local</span>
                        <span className="text-2xl font-black tabular-nums">{cardCount.toLocaleString('pt-BR')} <span className="text-xs text-slate-500 uppercase">Cards</span></span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-xl shadow-slate-200/50 h-fit">
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter">Sincronizacao em lote</h2>
                        <p className="text-slate-500 text-sm font-medium">Sincroniza as 5 colecoes mais recentes da lista exibida abaixo.</p>

                        <button
                            onClick={() => void handleSync()}
                            disabled={loading}
                            className="w-full h-14 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50"
                        >
                            {loading ? 'Processando...' : (selectedSets.size > 0 ? `Sincronizar selecionadas (${selectedSets.size})` : 'Sincronizar ultimas 5')}
                        </button>

                        {syncProgress && (
                            <div className="space-y-2 animate-fade-in">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>{syncProgress.current}</span>
                                    <span>{syncProgress.done}/{syncProgress.total}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-rose-600 transition-all duration-500"
                                        style={{ width: `${(syncProgress.done / syncProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {status && (
                            <div className={`p-4 rounded-xl text-[11px] font-bold animate-fade-in ${status.startsWith('Erro') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                {status}
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-xl shadow-slate-200/50 h-fit">
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter">Mercado em background</h2>
                        <p className="text-slate-500 text-sm font-medium">
                            Atualiza o cache de precos do marketplace para o cliente ja ver o comparativo ao abrir a vitrine.
                        </p>

                        {marketStats && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Com cache</p>
                                    <p className="text-2xl font-black tracking-tighter text-slate-900">{marketStats.cachedItems}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                        de {marketStats.activeInventory} ativos
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sem cache</p>
                                    <p className="text-2xl font-black tracking-tighter text-rose-600">{marketStats.uncachedItems}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                        precisam sincronizar
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Atualizadas 24h</p>
                                    <p className="text-2xl font-black tracking-tighter text-emerald-600">{marketStats.refreshed24h}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                        snapshot recente
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Historico</p>
                                    <p className="text-2xl font-black tracking-tighter text-slate-900">{marketStats.historySnapshots}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                        registros salvos
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => void handleMarketSync()}
                            disabled={marketSyncing}
                            className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
                        >
                            {marketSyncing ? 'Atualizando...' : 'Sincronizar precos do mercado'}
                        </button>

                        {marketStatus && (
                            <div className={`p-4 rounded-xl text-[11px] font-bold animate-fade-in ${marketStatus.startsWith('Erro') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                {marketStatus}
                            </div>
                        )}

                        {marketErrors.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                                    Primeiros erros da sincronizacao
                                </p>
                                <div className="space-y-1">
                                    {marketErrors.map((error) => (
                                        <p key={error} className="text-[11px] font-medium text-amber-900 break-words">
                                            {error}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {marketStats?.lastFetchedAt && (
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                Ultima atualizacao: {new Date(marketStats.lastFetchedAt).toLocaleString('pt-BR')}
                            </p>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-xl shadow-slate-200/50 h-[600px] flex flex-col md:col-span-2">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h2 className="text-xl font-black text-slate-900 tracking-tighter">Sincronizar por colecao</h2>
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Buscar coleção..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                                />
                                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                            {filteredSets.length === 0 ? (
                                <div className="py-12 text-center space-y-3">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                        <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma coleção encontrada</p>
                                </div>
                            ) : (
                                filteredSets.map((set) => {
                                    const isSynced = syncedSets.has(set.id);
                                    const isSelected = selectedSets.has(set.id);
                                    const imageSrc = getSetImageSrc(set.logo);

                                    return (
                                        <div
                                            key={set.id}
                                            onClick={() => toggleSetSelection(set.id)}
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${isSelected
                                                ? 'bg-rose-50 border-rose-300'
                                                : (isSynced ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' : 'bg-slate-50 border-slate-100 hover:border-slate-300')
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-4 h-4 rounded ring-1 flex items-center justify-center transition-all ${isSelected ? 'bg-rose-600 ring-rose-600' : 'bg-white ring-slate-300'}`}>
                                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-white rounded-lg p-1 flex items-center justify-center border border-slate-100 shadow-sm">
                                                        {imageSrc ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={imageSrc} alt={set.name} className="max-h-full w-auto grayscale opacity-80" />
                                                        ) : (
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Set</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-[11px] font-bold leading-tight ${isSynced ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                            {set.name}
                                                        </span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isSynced ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {isSynced ? 'Sincronizado' : `${set.cards} cards`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isSynced && (
                                                    <div className="flex items-center gap-1">
                                                        {confirmingSetId === set.id ? (
                                                            <div className="flex items-center gap-1 animate-fade-in">
                                                                <button
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        void handleDeleteSet(set.id, set.name);
                                                                    }}
                                                                    disabled={loading}
                                                                    className="px-2 py-1.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-700 shadow-lg shadow-rose-600/20"
                                                                >
                                                                    Deletar?
                                                                </button>
                                                                <button
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        setConfirmingSetId(null);
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-slate-600"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    void handleDeleteSet(set.id, set.name);
                                                                }}
                                                                disabled={loading}
                                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                                title="Deletar cards desta coleção"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void handleSync(set.id);
                                                    }}
                                                    disabled={loading}
                                                    className={`px-4 py-2 border text-[9px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 ${isSynced
                                                        ? 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white'
                                                        }`}
                                                >
                                                    {isSynced ? 'Re-sync' : 'Sync'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminGuard>
    );
}
