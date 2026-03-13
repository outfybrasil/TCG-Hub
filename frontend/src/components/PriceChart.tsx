'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface PriceChartProps {
    cardId: string;
    historyCardId?: string | null;
    cardName: string;
    cardCode?: string;
    cardSet?: string;
    condition?: string;
    finish?: string;
    language?: string;
    currentPrice?: number;
    latestPrices?: Record<string, number>;
    storeLinks?: Record<string, string>;
}

type ChartPoint = Record<string, string | number | null>;
type StoreSummary = {
    key: 'TCG Hub' | 'Liga Pokemon' | 'MYP Cards';
    label: string;
    price: number | null;
    href?: string;
    tone: 'slate' | 'amber' | 'blue';
};

function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return 'Sem preco';
    }

    return `R$ ${value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function getStoreCardClass(tone: StoreSummary['tone']) {
    if (tone === 'amber') {
        return 'border-amber-500/20 bg-amber-500/10 text-amber-50';
    }

    if (tone === 'blue') {
        return 'border-sky-500/20 bg-sky-500/10 text-sky-50';
    }

    return 'border-white/10 bg-white/8 text-white';
}

export default function PriceChart({
    cardId,
    historyCardId,
    cardName,
    cardCode,
    cardSet,
    condition,
    finish,
    language,
    currentPrice,
    latestPrices,
    storeLinks,
}: PriceChartProps) {
    const [data, setData] = useState<ChartPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFetchingNew, setIsFetchingNew] = useState(false);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const historyTarget = historyCardId || cardId;
            const res = await fetch(`/api/prices/history?cardId=${historyTarget}`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (error) {
            console.error('Error fetching price history', error);
        } finally {
            setLoading(false);
        }
    }, [cardId, historyCardId]);

    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory]);

    const fetchCurrentPrice = async () => {
        setIsFetchingNew(true);
        try {
            const res = await fetch('/api/prices/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId,
                    historyCardId,
                    cardName,
                    cardCode,
                    cardSet,
                    condition,
                    finish,
                    language,
                }),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                alert(`Nao foi possivel buscar precos: ${json.error || 'Erro desconhecido'}`);
                return;
            }

            await fetchHistory();
        } catch (error) {
            console.error(error);
            alert('Erro na comunicacao com o servidor de precos.');
        } finally {
            setIsFetchingNew(false);
        }
    };

    const storeSummaries: StoreSummary[] = useMemo(() => ([
        {
            key: 'TCG Hub',
            label: 'TCG Hub',
            price: currentPrice ?? null,
            tone: 'slate',
        },
        {
            key: 'Liga Pokemon',
            label: 'Liga',
            price: latestPrices?.['Liga Pokemon'] ?? null,
            href: storeLinks?.['Liga Pokemon'],
            tone: 'amber',
        },
        {
            key: 'MYP Cards',
            label: 'MYP',
            price: latestPrices?.['MYP Cards'] ?? null,
            href: storeLinks?.['MYP Cards'],
            tone: 'blue',
        },
    ]), [currentPrice, latestPrices, storeLinks]);

    const chartData = useMemo(() => {
        const withHub = data.map((point) => ({
            ...point,
            'TCG Hub': currentPrice ?? null,
        }));

        if (withHub.length > 0) {
            return withHub;
        }

        const hasAnySnapshot = storeSummaries.some((store) => store.price !== null);
        if (!hasAnySnapshot) {
            return [];
        }

        return [{
            date: 'Hoje',
            'TCG Hub': currentPrice ?? null,
            'Liga Pokemon': latestPrices?.['Liga Pokemon'] ?? null,
            'MYP Cards': latestPrices?.['MYP Cards'] ?? null,
        }];
    }, [currentPrice, data, latestPrices, storeSummaries]);

    if (loading) {
        return (
            <div className="flex h-[420px] w-full items-center justify-center rounded-[36px] border border-slate-800 bg-slate-950">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                    Carregando historico...
                </span>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-[38px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(31,41,55,0.96),_rgba(15,23,42,1)_55%)] text-white shadow-[0_30px_100px_-50px_rgba(15,23,42,0.95)]">
            <div className="border-b border-white/10 px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                            Historico de preco
                        </p>
                        <h3 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                            Grafico comparativo das lojas
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-slate-400">
                            Leitura no estilo mercado: a linha da TCG Hub serve como referencia atual, enquanto Liga e MYP mostram a evolucao das ultimas coletas.
                        </p>
                    </div>

                    <button
                        onClick={() => void fetchCurrentPrice()}
                        disabled={isFetchingNew}
                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200 transition-all hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isFetchingNew ? 'Consultando...' : 'Atualizar leitura'}
                    </button>
                </div>

                <div className="mt-6 grid gap-3 lg:grid-cols-3">
                    {storeSummaries.map((store) => {
                        const content = (
                            <div className={`rounded-[24px] border px-4 py-4 transition-all ${getStoreCardClass(store.tone)} ${store.href ? 'hover:-translate-y-0.5 hover:border-white/20' : ''}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/55">
                                        {store.label}
                                    </span>
                                    {store.href && (
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/45">
                                            Abrir loja
                                        </span>
                                    )}
                                </div>
                                <div className="mt-3 text-3xl font-black tracking-[-0.05em]">
                                    {formatPrice(store.price)}
                                </div>
                            </div>
                        );

                        if (!store.href) {
                            return <div key={store.key}>{content}</div>;
                        }

                        return (
                            <a key={store.key} href={store.href} target="_blank" rel="noopener noreferrer" className="block">
                                {content}
                            </a>
                        );
                    })}
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="flex h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="text-sm font-black text-white">Nenhum historico salvo ainda.</span>
                    <p className="max-w-lg text-sm text-slate-400">
                        Use &quot;Atualizar leitura&quot; para registrar a primeira comparacao entre TCG Hub, Liga Pokemon e MYP Cards.
                    </p>
                </div>
            ) : (
                <div className="h-[420px] px-3 pb-4 pt-2 sm:px-6 sm:pb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 24, right: 16, left: -8, bottom: 12 }}>
                            <defs>
                                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.16} />
                                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.18)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `R$${value}`}
                                width={58}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 800, paddingTop: '18px', color: '#e2e8f0' }} />

                            <Line
                                type="monotone"
                                dataKey="TCG Hub"
                                name="TCG Hub"
                                stroke="#f8fafc"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 5, fill: '#f8fafc', strokeWidth: 0 }}
                                connectNulls
                            />
                            <Line
                                type="monotone"
                                dataKey="Liga Pokemon"
                                name="Liga"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }}
                                connectNulls
                            />
                            <Line
                                type="monotone"
                                dataKey="MYP Cards"
                                name="MYP"
                                stroke="#38bdf8"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 5, fill: '#38bdf8', strokeWidth: 0 }}
                                connectNulls
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number }>;
    label?: string;
}) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
            {payload.map((entry) => (
                <div key={`${entry.name}-${entry.value}`} className="mb-1 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm font-medium text-slate-300">{entry.name}:</span>
                    <span className="text-sm font-black text-white">
                        R$ {entry.value?.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                </div>
            ))}
        </div>
    );
}
