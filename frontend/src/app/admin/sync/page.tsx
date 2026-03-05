"use client";

import React, { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';

interface TcgSet {
    id: string;
    name: string;
    logo?: string;
    cards?: number;
}

export default function SyncAdminPage() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [sets, setSets] = useState<TcgSet[]>([]);
    const [syncedSets, setSyncedSets] = useState<Set<string>>(new Set());
    const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
    const [cardCount, setCardCount] = useState<number>(0);
    const [syncProgress, setSyncProgress] = useState<{ current: string, total: number, done: number } | null>(null);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/sync-cards/stats');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.count !== undefined) setCardCount(data.count);
        } catch (err) {
            console.error("Erro ao buscar estatísticas:", err);
        }
    };

    useEffect(() => {
        const fetchSets = async () => {
            try {
                const res = await fetch('https://api.tcgdex.net/v2/pt/sets');
                const data = await res.json();
                setSets(data.reverse()); // Novas coleções primeiro
            } catch (_err) {
                setStatus("Erro ao carregar coleções da TCGdex.");
            }
        };
        const fetchSyncedSets = async () => {
            try {
                const res = await fetch('/api/admin/sync-cards/synced-sets');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setSyncedSets(new Set(data.synced_sets));
                    }
                }
            } catch (err) { }
        };

        fetchSets();
        fetchStats();
        fetchSyncedSets();
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ setId })
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
                // Sync selected or last 5
                const targetSets = selectedSets.size > 0
                    ? sets.filter(s => selectedSets.has(s.id))
                    : sets.slice(0, 5);

                setSyncProgress({ current: 'Iniciando...', total: targetSets.length, done: 0 });

                let totalCount = 0;
                for (let i = 0; i < targetSets.length; i++) {
                    const set = targetSets[i];
                    setSyncProgress({ current: `Sincronizando: ${set.name}`, total: targetSets.length, done: i });

                    const res = await fetch('/api/admin/sync-cards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ setId: set.id })
                    });

                    if (!res.ok) {
                        console.warn(`Set ${set.name} falhou. Pulando...`);
                        continue;
                    }

                    const data = await res.json();
                    if (data.success) {
                        totalCount += data.count;
                        setSyncedSets(prev => new Set(prev).add(set.id));
                    }
                }
                setStatus(`Concluído! Total de ${totalCount} cards sincronizados.`);
                await fetchStats();
                setSelectedSets(new Set()); // clear selection
            }
        } catch (err) {
            setStatus(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
            setSyncProgress(null);
        }
    };

    return (
        <AdminGuard>
            <div className="max-w-4xl mx-auto p-12 space-y-8 animate-fade-up">
                <div className="flex justify-between items-end border-b border-slate-100 pb-8">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">
                            Painel de <span className="text-rose-600">Sincronização</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-none">
                            Importação de Catálogo Mestre TCGdex (PT-BR)
                        </p>
                    </div>
                    <div className="bg-slate-900 px-6 py-4 rounded-2xl text-white flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-1">Catálogo Local</span>
                        <span className="text-2xl font-black tabular-nums">{cardCount.toLocaleString('pt-BR')} <span className="text-xs text-slate-500 uppercase">Cards</span></span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-xl shadow-slate-200/50 h-fit">
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter">Sincronização em Lote</h2>
                        <p className="text-slate-500 text-sm font-medium">Sincroniza as 5 coleções mais recentes lançadas.</p>

                        <button
                            onClick={() => handleSync()}
                            disabled={loading}
                            className="w-full h-14 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50"
                        >
                            {loading ? 'Processando...' : (selectedSets.size > 0 ? `Sincronizar Selecionadas (${selectedSets.size})` : 'Sincronizar Últimas 5')}
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

                    <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-xl shadow-slate-200/50 h-[500px] flex flex-col">
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter">Sincronizar por Coleção</h2>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                            {sets.length === 0 ? (
                                <div className="space-y-2">
                                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl" />)}
                                </div>
                            ) : (
                                sets.map(set => {
                                    const isSynced = syncedSets.has(set.id);
                                    const isSelected = selectedSets.has(set.id);

                                    return (
                                        <div
                                            key={set.id}
                                            onClick={() => toggleSetSelection(set.id)}
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer
                                                ${isSelected ? 'bg-rose-50 border-rose-300' :
                                                    (isSynced ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' : 'bg-slate-50 border-slate-100 hover:border-slate-300')}
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Checkbox */}
                                                <div className={`w-4 h-4 rounded ring-1 flex items-center justify-center transition-all ${isSelected ? 'bg-rose-600 ring-rose-600' : 'bg-white ring-slate-300'}`}>
                                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-white rounded-lg p-1 flex items-center justify-center border border-slate-100 shadow-sm">
                                                        <img src={`${set.logo}/logo.png`} alt={set.name} className="max-h-full w-auto grayscale opacity-80" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-[11px] font-bold leading-tight ${isSynced ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                            {set.name}
                                                        </span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isSynced ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {isSynced ? 'Sincronizado ✓' : `${set.cards} Cards`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSync(set.id);
                                                }}
                                                disabled={loading}
                                                className={`px-4 py-2 border text-[9px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50
                                                    ${isSynced ? 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white'}
                                                `}
                                            >
                                                {isSynced ? 'Re-Sync' : 'Sync'}
                                            </button>
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
