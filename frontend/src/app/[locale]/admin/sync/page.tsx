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

function normalizeSetName(set: Pick<TcgSet, 'id' | 'name'>) {
    if (set.id === 'me01') {
        return 'Megaevolucao - Equilibrio Perfeito'; // legacy
    }
    if (set.id === 'me03') {
        return 'Equilíbrio Perfeito';
    }
    if (set.id === 'sv09') {
        return 'Parceiros Iniciais';
    }

    return set.name;
}

function getSetImageSrc(asset?: string | null) {
    if (!asset) {
        return null;
    }

    // TCGdex assets often come as base URLs (e.g., .../logo)
    // Adding .png directly is the standard way to get the image.
    if (!asset.match(/\.(png|jpg|jpeg|webp|svg)$/)) {
        return `${asset}.png`;
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
    const [status, setStatus] = useState<string | null>(null);
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

    useEffect(() => {
        const fetchSets = async () => {
            try {
                // Busca de PT e EN para garantir que temos logos (EN costuma ser mais completo)
                const [resPt, resEn] = await Promise.all([
                    fetch('https://api.tcgdex.net/v2/pt/sets'),
                    fetch('https://api.tcgdex.net/v2/en/sets')
                ]);
                
                const dataPt = await resPt.json();
                const dataEn = resEn.ok ? await resEn.json() : [];

                if (!resPt.ok) {
                    throw new Error('Falha ao carregar TCGdex.');
                }

                // Mapa de EN para fallback de imagens
                const enMap = new Map();
                if (Array.isArray(dataEn)) {
                    dataEn.forEach(s => enMap.set(s.id, s));
                }

                if (Array.isArray(dataPt)) {
                    const normalizedAllSets = [...dataPt]
                        .reverse()
                        .map((set: any) => {
                            const enSet = enMap.get(set.id);
                            return {
                                id: set.id,
                                name: normalizeSetName({ id: set.id, name: set.name }),
                                logo: set.logo || enSet?.logo || set.symbol || enSet?.symbol || null,
                                cards: set.cardCount?.official || set.cardCount?.total || 0,
                            };
                        });
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
                    const rarityInfo = data.withRarity !== undefined 
                        ? ` (${data.withRarity} com raridade, ${data.withoutRarity} sem)`
                        : '';
                    setStatus(`Sucesso! ${data.count} cards sincronizados.${rarityInfo}`);
                    if (data.sampleFailures?.length > 0) {
                        console.warn('[sync] Primeiros cards sem raridade:', data.sampleFailures);
                    }
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

    const handleSyncAll = async () => {
        setLoading(true);
        setStatus(null);

        try {
            const targetSets = sets; // Sync everything
            setSyncProgress({ current: 'Iniciando sincronização total...', total: targetSets.length, done: 0 });

            let totalCount = 0;
            for (let i = 0; i < targetSets.length; i += 1) {
                const set = targetSets[i];
                setSyncProgress({ current: `[${i + 1}/${targetSets.length}] ${set.name}`, total: targetSets.length, done: i });

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

            setStatus(`Sincronização Total Concluída! ${totalCount} cards atualizados.`);
            await fetchStats();
        } catch (err) {
            setStatus(`Erro crítico: ${err instanceof Error ? err.message : 'Erro'}`);
        } finally {
            setLoading(false);
            setSyncProgress(null);
        }
    };


    const [manualId, setManualId] = useState('');
    const [manualSyncing, setManualSyncing] = useState(false);
    const [manualStatus, setManualStatus] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleManualSync = async () => {
        const ids = manualId.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
        if (ids.length === 0) return;

        setManualSyncing(true);
        setManualStatus(null);
        let successCount = 0;
        let totalCards = 0;
        let errors: string[] = [];

        for (const id of ids) {
            try {
                setManualStatus({ ok: true, msg: `Sincronizando ${id}...` });
                const res = await fetch('/api/admin/sync-cards', {
                    method: 'POST',
                    headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ setId: id }),
                });
                const data = await res.json();
                if (data.success) {
                    successCount++;
                    totalCards += data.count;
                    setSyncedSets(prev => new Set(prev).add(id));
                } else {
                    errors.push(`${id}: ${data.error}`);
                }
            } catch (err) {
                errors.push(`${id}: ${err instanceof Error ? err.message : 'Erro'}`);
            }
        }

        await fetchStats();

        if (errors.length === 0) {
            setManualStatus({ ok: true, msg: `✓ ${successCount} set(s) (${totalCards} cards) sincronizados!` });
            setManualId(''); // Limpa o campo após sucesso total
        } else {
            setManualStatus({ ok: false, msg: `Concluído com erros: ${errors.join(' | ')}` });
        }
        setManualSyncing(false);
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

    if (loading && !syncProgress) {
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
                    {/* Header */}
                    <div className="mb-16 space-y-6">
                        <div className="inline-flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.6)]"></span>
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Motor de Sincronização</span>
                        </div>
                        <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                            <div className="space-y-2">
                                <h1 className="text-6xl font-black tracking-tighter text-white uppercase leading-none">
                                    TCGdex <span className="text-rose-600">Sync.</span>
                                </h1>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-none">
                                    Importação de catálogo mestre TCGdex (PT-BR)
                                </p>
                            </div>
                            <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/10 flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Catálogo Local</span>
                                <span className="text-2xl font-black tabular-nums text-white">
                                    {cardCount.toLocaleString('pt-BR')} <span className="text-xs text-slate-500 uppercase">Cards</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-8 lg:col-span-1">
                            {/* Batch Sync Card */}
                            <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 blur-[60px] -z-10"></div>
                                <h2 className="text-xl font-black text-white tracking-tighter uppercase">Sincronização em Lote</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-tight leading-relaxed">
                                    Sincroniza as 5 coleções mais recentes ou a seleção personalizada abaixo.
                                </p>

                                <button
                                    onClick={() => void handleSync()}
                                    disabled={loading}
                                    className="w-full h-14 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 disabled:opacity-50"
                                >
                                    {loading ? 'Processando...' : (selectedSets.size > 0 ? `Sincronizar Selecionadas (${selectedSets.size})` : 'Sincronizar Últimas 5')}
                                </button>

                                <div className="pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => {
                                            if (confirm('Atenção: Sincronizar todo o catálogo pode levar vários minutos. Deseja continuar?')) {
                                                void handleSyncAll();
                                            }
                                        }}
                                        disabled={loading}
                                        className="w-full h-12 bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Sincronizando...' : 'Sincronizar Todo o Catálogo'}
                                    </button>
                                </div>

                                {syncProgress && (
                                    <div className="space-y-3 animate-fade-in bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            <span className="truncate max-w-[150px]">{syncProgress.current}</span>
                                            <span className="text-rose-500 tabular-nums">{syncProgress.done}/{syncProgress.total}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)] transition-all duration-500"
                                                style={{ width: `${(syncProgress.done / syncProgress.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {status && (
                                    <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-fade-in border ${status.startsWith('Erro') ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                                        {status}
                                    </div>
                                )}
                            </div>

                            {/* Manual Sync Panel */}
                            <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-5 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-600/5 blur-[60px] -z-10" />
                                <h2 className="text-xl font-black text-white tracking-tighter uppercase">Sync por ID TCGdex</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-tight leading-relaxed">
                                    Insira o ID interno da TCGdex para sincronizar qualquer set, incluindo japoneses e 2025/2026.
                                </p>

                                {/* Suggested IDs */}
                                <div className="space-y-2">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Sugestões 2025/2026</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['me01','me02','me03','sv09','sv10'].map(id => {
                                            const isSelected = manualId.toLowerCase().includes(id);
                                            return (
                                                <button key={id} onClick={() => {
                                                    const currentIds = manualId.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
                                                    if (currentIds.includes(id)) {
                                                        setManualId(currentIds.filter(i => i !== id).join(', '));
                                                    } else {
                                                        setManualId([...currentIds, id].join(', '));
                                                    }
                                                }}
                                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                        syncedSets.has(id)
                                                            ? (isSelected ? 'bg-emerald-500/30 border-emerald-500 text-white' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500')
                                                            : (isSelected ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/30')
                                                    }`}>
                                                    {id} {syncedSets.has(id) ? '✓' : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Input */}
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Ex: me01, sv10, sv11..."
                                        value={manualId}
                                        onChange={e => setManualId(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && void handleManualSync()}
                                        className="flex-1 h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 placeholder:normal-case placeholder:tracking-normal"
                                    />
                                    <button
                                        onClick={() => void handleManualSync()}
                                        disabled={manualSyncing || !manualId.trim()}
                                        className="h-12 px-6 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {manualSyncing ? '...' : 'SYNC'}
                                    </button>
                                </div>

                                {manualStatus && (
                                    <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                                        manualStatus.ok
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                        {manualStatus.msg}
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className="lg:col-span-2 bg-white/5 border border-white/10 p-10 rounded-[48px] shadow-2xl flex flex-col h-[750px]">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Coleções TCGdex</h2>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Selecione para sincronização individual ou em lote</p>
                                </div>
                                <div className="relative w-full md:w-80">
                                    <input
                                        type="text"
                                        placeholder="FILTRAR COLEÇÃO..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-12 pl-12 pr-6 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest focus:outline-none focus:border-rose-600 transition-all placeholder:text-slate-600"
                                    />
                                    <svg className="w-4 h-4 text-slate-500 absolute left-4 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-4 space-y-3 custom-scrollbar">
                                {filteredSets.length === 0 ? (
                                    <div className="py-24 text-center space-y-4">
                                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10">
                                            <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nenhuma coleção encontrada_</p>
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
                                                className={`flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer group ${isSelected
                                                    ? 'bg-rose-600/10 border-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.1)]'
                                                    : (isSynced ? 'bg-emerald-500/5 border-white/5 hover:border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-white/20')
                                                    }`}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-rose-600 border-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.4)]' : 'bg-transparent border-white/20 group-hover:border-white/40'}`}>
                                                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 bg-white/10 rounded-2xl p-2 flex items-center justify-center border border-white/5 group-hover:bg-white/20 transition-all">
                                                            {imageSrc ? (
                                                                <img src={imageSrc} alt={set.name} className="max-h-full w-auto brightness-110" />
                                                            ) : (
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">SET</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-black tracking-tight leading-tight uppercase ${isSynced ? 'text-emerald-400' : 'text-white'}`}>
                                                                {set.name}
                                                            </span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${isSynced ? 'text-emerald-500/60' : 'text-slate-500'}`}>
                                                                {isSynced ? 'Sincronizado' : `${set.cards} cards`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {isSynced && (
                                                        <div className="flex items-center gap-2">
                                                            {confirmingSetId === set.id ? (
                                                                <div className="flex items-center gap-2 animate-fade-in">
                                                                    <button
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            void handleDeleteSet(set.id, set.name);
                                                                        }}
                                                                        className="px-3 py-1.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 shadow-xl shadow-rose-600/20"
                                                                    >
                                                                        DELETAR?
                                                                    </button>
                                                                    <button
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            setConfirmingSetId(null);
                                                                        }}
                                                                        className="p-2 text-slate-500 hover:text-white transition-colors"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        setConfirmingSetId(set.id);
                                                                    }}
                                                                    className="h-10 w-10 bg-white/5 text-slate-500 hover:bg-rose-600/10 hover:text-rose-500 border border-white/5 rounded-xl flex items-center justify-center transition-all"
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
                                                        className={`h-10 px-5 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${isSynced
                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                                                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                                            }`}
                                                    >
                                                        {isSynced ? 'RE-SYNC' : 'SYNC'}
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
            </div>
        </AdminGuard>
    );
}
