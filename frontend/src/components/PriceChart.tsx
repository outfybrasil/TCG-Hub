'use client';

import React, { useState, useEffect } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface PriceChartProps {
    cardId: string;
    cardName: string;
    cardCode?: string;
    currentPrice?: number;
    setExpansion?: string;
}

export default function PriceChart({ cardId, cardName, cardCode, currentPrice, setExpansion }: PriceChartProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFetchingNew, setIsFetchingNew] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [cardId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/prices/history?cardId=${cardId}`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (e) {
            console.error('Error fetching price history', e);
        } finally {
            setLoading(false);
        }
    };

    const scrapeCurrentPrice = async () => {
        setIsFetchingNew(true);
        try {
            const res = await fetch(`/api/prices/fetch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId, cardName, cardCode })
            });
            const json = await res.json();
            if (json.success) {
                // Refresh the graph
                await fetchHistory();
            } else {
                alert(`Erro na comunicação com o servidor de scraping: ${json.error || 'Erro desconhecido'}`);
            }
        } catch (e) {
            alert(`Erro na solicitação: ${e instanceof Error ? e.message : 'Erro na rede'}`);
            console.error(e);
            alert('Erro na comunicação com o servidor de scraping.');
        } finally {
            setIsFetchingNew(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-xl">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-slate-300 text-sm font-medium">{entry.name}:</span>
                            <span className="text-white text-sm font-black">
                                R$ {entry.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Function to get the latest prices for comparison
    const getComparisonData = () => {
        if (data.length === 0) return null;

        // Find the last record for each store
        const stores = ['TCG Mega Store', 'MYP Cards', 'Liga Pokémon'];
        const currentPrices: { name: string; price: number }[] = [];

        if (currentPrice) {
            currentPrices.push({ name: 'TCG Mega Store', price: currentPrice });
        }

        // Search in the data array (sorted by date) for the last valid prices
        const latestPoints = data[data.length - 1];
        if (latestPoints['MYP Cards']) currentPrices.push({ name: 'MYP Cards', price: latestPoints['MYP Cards'] });
        if (latestPoints['Liga Pokémon']) currentPrices.push({ name: 'Liga Pokémon', price: latestPoints['Liga Pokémon'] });

        if (currentPrices.length === 0) return null;

        // Sort by price to determine colors
        const sorted = [...currentPrices].sort((a, b) => a.price - b.price);

        return currentPrices.map(item => {
            const rank = sorted.findIndex(s => s.price === item.price);
            let styles = { bg: 'bg-white border-slate-100 text-slate-400', label: '---' };

            if (currentPrices.length > 1) {
                if (rank === 0) {
                    styles = { bg: 'bg-emerald-50 border-emerald-100 text-emerald-600', label: 'MELHOR' };
                } else if (rank === sorted.length - 1) {
                    styles = { bg: 'bg-rose-50 border-rose-100 text-rose-600', label: 'CARO' };
                } else {
                    styles = { bg: 'bg-amber-50 border-amber-100 text-amber-600', label: 'MÉDIO' };
                }
            }

            return { ...item, styles };
        });
    };

    const comparison = getComparisonData();

    if (loading) {
        return (
            <div className="w-full h-64 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Carregando Histórico...</span>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Price Comparison Bar */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm overflow-hidden relative">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xs">
                            {setExpansion || 'TCG'}
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Comparativo de Mercado</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Baseado nos últimos registros</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {['TCG Mega Store', 'MYP Cards', 'Liga Pokémon'].map(store => {
                        const info = comparison?.find(c => c.name === store);
                        const price = store === 'TCG Mega Store' ? currentPrice : (comparison?.find(c => c.name === store)?.price);
                        const styles = info?.styles || { bg: 'bg-slate-50 border-slate-100 opacity-60', label: '' };

                        return (
                            <div key={store} className={`p-5 rounded-[2rem] border transition-all duration-300 shadow-sm ${styles.bg}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[9px] font-black uppercase tracking-[0.1em] opacity-40">{store === 'TCG Mega Store' ? 'Meu Site' : store}</span>
                                    {styles.label && (
                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-white/40 border border-current/10">
                                            {styles.label}
                                        </span>
                                    )}
                                </div>
                                <div className="text-2xl font-black tracking-tighter">
                                    {price ? `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter">Gráfico de Performance</h3>
                    <p className="text-xs font-medium text-slate-500">Variação de preços nos últimos 30 dias</p>
                </div>
                <button
                    onClick={scrapeCurrentPrice}
                    disabled={isFetchingNew}
                    className="h-9 px-4 bg-slate-900 text-white hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                    {isFetchingNew ? 'Consultando Robô...' : 'Atualizar Preço Agora'}
                </button>
            </div>

            {data.length === 0 ? (
                <div className="w-full h-64 bg-slate-50 border border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center space-y-2 p-6 text-center">
                    <span className="text-2xl">📉</span>
                    <p className="text-sm font-bold text-slate-600">Nenhum histórico encontrado.</p>
                    <p className="text-xs text-slate-400">Clique em "Atualizar Preço Agora" para o robô buscar os valores atuais na Liga Pokémon e MYP Cards.</p>
                </div>
            ) : (
                <div className="w-full h-72 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `R$${val}`}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '10px' }} />

                            {/* Note: Check the exact keys returned from the API grouping. 
                  Currently the parser groupings use the store_name "Liga Pokémon" and "MYP Cards" */}
                            <Line
                                type="monotone"
                                dataKey="Liga Pokémon"
                                name="Liga"
                                stroke="#eab308"
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="MYP Cards"
                                name="MYP"
                                stroke="#2563eb"
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
