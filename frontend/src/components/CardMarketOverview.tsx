'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BadgeCheck, BarChart3, BookOpen, ShieldCheck, TrendingUp } from 'lucide-react';
import PriceAlertButton from '@/components/PriceAlertButton';

type IndexValue = {
    price: number | null;
    fairLow: number | null;
    fairHigh: number | null;
    confidence: 'insufficient' | 'low' | 'medium' | 'high';
    sampleSize: number;
    verifiedSales: number;
    excludedOutliers: number;
};

type OverviewData = {
    filters: { condition: string | null; finish: string | null; language: string | null };
    current: IndexValue;
    periods: { days7: IndexValue; days30: IndexValue; days90: IndexValue };
    recentSales: Array<{
        price: number;
        soldAt: string;
        condition: string | null;
        finish: string | null;
        language: string | null;
        verification: string;
    }>;
    history: Array<{
        price: number | null;
        fairLow: number | null;
        fairHigh: number | null;
        calculatedAt: string;
    }>;
    methodology: { version: string; summary: string; rules: string[] };
    generatedAt: string;
};

export default function CardMarketOverview({ cardId }: { cardId: string }) {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ condition: '', finish: '', language: '' });

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ cardId });
        if (filters.condition) params.set('condition', filters.condition);
        if (filters.finish) params.set('finish', filters.finish);
        if (filters.language) params.set('language', filters.language);
        fetch(`/api/prices/index?${params.toString()}`, { signal: controller.signal })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Não foi possível carregar o índice.');
                setData(result);
            })
            .catch((reason) => {
                if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message);
            })
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, [cardId, filters.condition, filters.finish, filters.language]);

    const chartData = useMemo(() => (data?.history || []).map((point) => ({
        ...point,
        date: new Date(point.calculatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    })), [data]);

    if (loading) {
        return <div className="surface-card rounded-3xl p-8 text-sm font-bold text-brand-muted">Calculando mercado da carta...</div>;
    }
    if (error || !data) {
        return <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-300">{error || 'Índice indisponível.'}</div>;
    }

    return (
        <section className="space-y-6" aria-labelledby="market-title">
            <div className="surface-card rounded-3xl p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-muted">Variação analisada</p>
                        <p className="mt-1 text-sm text-brand-text">Separe condição, acabamento e idioma para comparar a mesma carta.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <MarketSelect label="Condição" value={filters.condition} options={['M', 'NM', 'LP', 'MP', 'HP', 'Dmg']} onChange={(condition) => setFilters((old) => ({ ...old, condition }))} />
                        <MarketSelect label="Acabamento" value={filters.finish} options={['Normal', 'Foil', 'Reverse Foil']} onChange={(finish) => setFilters((old) => ({ ...old, finish }))} />
                        <MarketSelect label="Idioma" value={filters.language} options={['Português', 'Inglês', 'Japonês', 'Espanhol']} onChange={(language) => setFilters((old) => ({ ...old, language }))} />
                    </div>
                </div>
            </div>
            <div className="surface-card overflow-hidden rounded-3xl">
                <div className="border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-transparent p-7 sm:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-emerald-400">
                                <ShieldCheck className="h-5 w-5" />
                                <p className="text-[10px] font-black uppercase tracking-[0.25em]">Referência independente</p>
                            </div>
                            <h2 id="market-title" className="mt-3 text-3xl font-black tracking-tight text-brand-text sm:text-4xl">Índice TCG Hub</h2>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
                                Baseado em vendas confirmadas e referências de mercado. O menor anúncio isolado não define este preço.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-5 lg:text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Preço TCG Hub</p>
                            <p className="mt-2 text-4xl font-black text-white">{money(data.current.price)}</p>
                            <p className="mt-2 text-[10px] font-bold text-emerald-100/70">
                                Faixa justa {money(data.current.fairLow)} — {money(data.current.fairHigh)}
                            </p>
                            <PriceAlertButton cardId={cardId} currentPrice={data.current.price} condition={filters.condition} finish={filters.finish} language={filters.language} />
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric label="Confiança" value={confidence(data.current.confidence)} helper={`${data.current.sampleSize} referências`} />
                    <Metric label="Vendas verificadas" value={String(data.current.verifiedSales)} helper="pagamentos confirmados" />
                    <Metric label="Valores descartados" value={String(data.current.excludedOutliers)} helper="fora do padrão" />
                    <Metric label="Metodologia" value="Mediana" helper="ponderada e auditável" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <PeriodCard label="Últimos 7 dias" value={data.periods.days7} />
                <PeriodCard label="Últimos 30 dias" value={data.periods.days30} />
                <PeriodCard label="Últimos 90 dias" value={data.periods.days90} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
                <div className="surface-card rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-brand-rose" />
                        <div>
                            <h3 className="font-black text-brand-text">Histórico do índice</h3>
                            <p className="text-xs text-brand-muted">Evolução dos snapshots auditáveis</p>
                        </div>
                    </div>
                    {chartData.length > 1 ? (
                        <div className="mt-6 h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="hubIndexFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                                    <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ background: '#191f31', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14 }} />
                                    <Area type="monotone" dataKey="price" name="Índice TCG Hub" stroke="#10b981" strokeWidth={3} fill="url(#hubIndexFill)" connectNulls />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyData text="O gráfico aparecerá depois de pelo menos duas leituras do índice." />
                    )}
                </div>

                <div className="surface-card rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                        <BadgeCheck className="h-5 w-5 text-emerald-400" />
                        <div>
                            <h3 className="font-black text-brand-text">Últimas vendas verificadas</h3>
                            <p className="text-xs text-brand-muted">Dados pessoais não são exibidos</p>
                        </div>
                    </div>
                    {data.recentSales.length > 0 ? (
                        <div className="mt-5 divide-y divide-white/5">
                            {data.recentSales.slice(0, 6).map((sale, index) => (
                                <div key={`${sale.soldAt}-${index}`} className="flex items-center justify-between gap-4 py-3">
                                    <div>
                                        <p className="text-sm font-black text-brand-text">{money(sale.price)}</p>
                                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-brand-muted">
                                            {[sale.condition, sale.finish, sale.language].filter(Boolean).join(' · ') || 'Variação não informada'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase text-emerald-400">Verificada</p>
                                        <p className="mt-1 text-[9px] text-brand-muted">{new Date(sale.soldAt).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyData text="Ainda não há vendas verificadas desta carta. O índice atual usa referências externas com confiança conservadora." />
                    )}
                </div>
            </div>

            <div className="surface-card rounded-3xl p-6 sm:p-8">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-brand-amber/10 p-3 text-brand-amber"><BookOpen className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-amber">Como calculamos</p>
                        <h3 className="mt-2 text-xl font-black text-brand-text">Metodologia pública · {data.methodology.version}</h3>
                        <p className="mt-3 max-w-4xl text-sm leading-6 text-brand-muted">{data.methodology.summary}</p>
                        <ul className="mt-5 grid gap-3 md:grid-cols-2">
                            {data.methodology.rules.map((rule) => (
                                <li key={rule} className="flex gap-2 text-sm text-brand-muted">
                                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{rule}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
    return <div className="surface-card-hi rounded-2xl p-4"><p className="text-[9px] font-black uppercase tracking-widest text-brand-muted">{label}</p><p className="mt-2 text-xl font-black text-brand-text">{value}</p><p className="mt-1 text-[10px] text-brand-muted">{helper}</p></div>;
}

function MarketSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
    return <label className="flex min-w-36 flex-col gap-1 text-[9px] font-black uppercase tracking-wider text-brand-muted">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#191f31] px-3 text-xs font-bold normal-case tracking-normal text-brand-text outline-none focus:border-emerald-500/40"><option value="">Todas</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function PeriodCard({ label, value }: { label: string; value: IndexValue }) {
    return <div className="surface-card rounded-3xl p-6"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-muted">{label}</p><p className="mt-3 text-3xl font-black text-brand-text">{money(value.price)}</p><p className="mt-2 text-xs text-brand-muted">{value.verifiedSales > 0 ? `${value.verifiedSales} venda(s) confirmada(s) · confiança ${confidence(value.confidence).toLowerCase()}` : 'Sem vendas verificadas no período'}</p></div>;
}

function EmptyData({ text }: { text: string }) {
    return <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm leading-6 text-brand-muted">{text}</div>;
}

function money(value: number | null | undefined) {
    return value === null || value === undefined ? 'Sem dados' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function confidence(value: IndexValue['confidence']) {
    if (value === 'high') return 'Alta';
    if (value === 'medium') return 'Média';
    if (value === 'low') return 'Baixa';
    return 'Insuficiente';
}
