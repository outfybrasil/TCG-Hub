"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/navigation'; // Using next/link might be safer, let's keep it consistent
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';

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

export default function UserInventoryPage() {
    const router = useRouter();
    const [items, setItems] = useState<UserCollectionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [stats, setStats] = useState({ totalInvested: 0, currentMarketValue: 0, itemsCount: 0 });

    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [modalPage, setModalPage] = useState(1);
    const [editingPriceTarget, setEditingPriceTarget] = useState<string | null>(null);
    const [editingPriceValue, setEditingPriceValue] = useState<string>('');

    const fetchInventory = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            const res = await fetch('/api/user/inventory', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            const data = await res.json();
            
            if (data.collection) {
                setItems(data.collection);
                updateStats(data.collection);
                
                // If it's the initial load, trigger background sync
                if (isInitial) {
                    void syncInventory();
                }
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const syncInventory = async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch('/api/user/inventory/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            // Fetch again after sync to get updated values
            await fetchInventory(false);
        } catch (error) {
            console.error('Error syncing inventory:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja remover esta carta do inventário?')) return;
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/user/inventory?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            
            if (res.ok) {
                const newItems = items.filter(item => item.id !== id);
                setItems(newItems);
                updateStats(newItems);
            } else {
                alert('Erro ao remover carta.');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Erro ao remover item.');
        }
    };

    const updateStats = (collection: UserCollectionItem[]) => {
        const invested = collection.reduce((acc: number, item: any) => acc + (item.purchase_price || 0) * item.quantity, 0);
        const market = collection.reduce((acc: number, item: any) => acc + (item.currentValue || 0) * item.quantity, 0);
        
        setStats({
            totalInvested: invested,
            currentMarketValue: market,
            itemsCount: collection.length
        });
    };

    useEffect(() => {
        fetchInventory(true);
    }, []);

    const profitLoss = stats.currentMarketValue - stats.totalInvested;
    const profitPercentage = stats.totalInvested > 0 ? (profitLoss / stats.totalInvested) * 100 : 0;

    // Group collections by set_name
    const groupedCollections = items.reduce((acc, item) => {
        if (!acc[item.set_name]) {
            acc[item.set_name] = {
                setName: item.set_name,
                totalItems: 0,
                totalInvested: 0,
                currentValue: 0,
                sampleImage: item.image_url,
                items: []
            };
        }
        acc[item.set_name].totalItems += item.quantity;
        acc[item.set_name].totalInvested += (item.purchase_price || 0) * item.quantity;
        acc[item.set_name].currentValue += item.currentValue * item.quantity;
        acc[item.set_name].items.push(item);
        return acc;
    }, {} as Record<string, { setName: string, totalItems: number, totalInvested: number, currentValue: number, sampleImage?: string, items: UserCollectionItem[] }>);

    const collectionList = Object.values(groupedCollections).sort((a, b) => b.currentValue - a.currentValue);

    // Modal calculations
    const selectedCollectionData = selectedCollection ? groupedCollections[selectedCollection] : null;
    const itemsPerPage = 10;
    const totalPages = selectedCollectionData ? Math.ceil(selectedCollectionData.items.length / itemsPerPage) : 0;
    const currentModalItems = selectedCollectionData 
        ? selectedCollectionData.items.slice((modalPage - 1) * itemsPerPage, modalPage * itemsPerPage) 
        : [];

    const handleUpdatePrice = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
        e.stopPropagation();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let priceNum = parseFloat(editingPriceValue.replace(',', '.'));
            if (isNaN(priceNum) || priceNum < 0) priceNum = 0;
            
            const res = await fetch('/api/user/inventory', {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, updates: { purchase_price: priceNum } })
            });

            if (res.ok) {
                const newItems = items.map(item => item.id === id ? { ...item, purchase_price: priceNum } : item);
                setItems(newItems);
                updateStats(newItems);
                setEditingPriceTarget(null);
            } else {
                alert('Erro ao atualizar preço.');
            }
        } catch (error) {
            console.error('Error updating price:', error);
            alert('Erro ao atualizar preço.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16 border-b border-slate-200 pb-12">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Controle de Portfólio Pessoal</span>
                        </div>
                        {syncing && (
                            <div className="inline-flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 animate-pulse">
                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce"></div>
                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Sincronizando Valores...</span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">
                        Meu <span className="text-rose-600">Inventário.</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Acompanhe a valorização da sua coleção</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={syncInventory}
                        disabled={syncing}
                        className={`h-14 px-8 bg-slate-950 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl transition-all flex items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed ${!syncing && 'hover:bg-slate-800'}`}
                    >
                        <span className={`${syncing && 'animate-spin'}`}>🔄</span>
                        {syncing ? 'Atualizando...' : 'Atualizar Valor Inventário'}
                    </button>
                    <NextLink href="/minha-conta/inventario/novo">
                        <button className="h-14 px-8 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all transform hover:-translate-y-1">
                            + Adicionar Carta
                        </button>
                    </NextLink>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Investido_</p>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900">
                        R$ {stats.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h2>
                </div>

                <div className="bg-slate-950 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Valor de Mercado Atual_</p>
                        <h2 className="text-4xl font-black tracking-tighter text-white">
                            R$ {stats.currentMarketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                    <div className="absolute -bottom-6 -right-6 text-7xl opacity-10">⚡</div>
                </div>

                <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Performance_</p>
                    <div className="flex items-center gap-3">
                        <h2 className={`text-4xl font-black tracking-tighter ${profitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {profitLoss >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
                        </h2>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${profitLoss >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {profitLoss >= 0 ? '↑' : '↓'} R$ {Math.abs(profitLoss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Inventory List */}
            <div className="space-y-8">
                <div className="flex items-center gap-6 mb-10">
                    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 whitespace-nowrap">Cards na Coleção ({stats.itemsCount})</h2>
                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                </div>

                {items.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center space-y-6">
                        <div className="text-5xl">🃏</div>
                        <h3 className="text-2xl font-black text-slate-900">Sua coleção está vazia.</h3>
                        <p className="text-slate-400 font-medium max-w-sm mx-auto">Comece a adicionar suas cartas para acompanhar o valor de mercado delas em tempo real.</p>
                        <NextLink href="/minha-conta/inventario/novo">
                            <button className="h-12 px-8 bg-slate-950 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-rose-600 transition-all">
                                Começar Agora
                            </button>
                        </NextLink>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collectionList.map((collection) => (
                            <div 
                                key={collection.setName} 
                                onClick={() => { setSelectedCollection(collection.setName); setModalPage(1); }}
                                className="bg-white border border-slate-100 p-6 rounded-[30px] shadow-sm hover:shadow-xl hover:border-rose-100 transition-all cursor-pointer group flex flex-col items-center gap-4 text-center relative"
                            >
                                <div className="h-32 w-24 flex-shrink-0 relative z-10 pointer-events-none mb-2">
                                    <img 
                                        src={collection.sampleImage || 'https://images.pokemontcg.io/base1/4.png'} 
                                        alt={collection.setName}
                                        className="h-full w-full object-contain rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <div className="space-y-1 z-10 pointer-events-none">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-rose-600 transition-colors">{collection.setName}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{collection.totalItems} cartas na coleção</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 w-full text-center z-10 pointer-events-none mt-4 border-t border-slate-100 pt-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Investido_</p>
                                        <p className="font-black text-slate-900">R$ {collection.totalInvested.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Valor Atual_</p>
                                        <p className="font-black text-slate-950">R$ {collection.currentValue.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Collection Modal */}
            {selectedCollectionData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedCollection(null)}></div>
                    <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-fade-up">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-8 border-b border-slate-100">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight text-slate-900">{selectedCollectionData.setName}</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedCollectionData.totalItems} cartas • Valor Total: R$ {selectedCollectionData.currentValue.toFixed(2).replace('.', ',')}</p>
                            </div>
                            <button onClick={() => setSelectedCollection(null)} className="p-3 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {/* Modal Body (List) */}
                        <div className="overflow-y-auto p-4 md:p-8 space-y-4">
                            {currentModalItems.map((item) => (
                                <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-[20px] flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group relative">
                                    <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                                        <div className="h-20 w-14 flex-shrink-0 cursor-pointer" onClick={() => router.push(`/minha-conta/inventario/${item.id}`)}>
                                            <img src={item.image_url || 'https://images.pokemontcg.io/base1/4.png'} alt={item.name} className="h-full w-full object-contain rounded-md shadow-sm group-hover:scale-105 transition-transform" />
                                        </div>
                                        <div className="flex-1 cursor-pointer" onClick={() => router.push(`/minha-conta/inventario/${item.id}`)}>
                                            <h4 className="text-lg font-black text-slate-900 leading-tight group-hover:text-rose-600 transition-colors">{item.name}</h4>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className="text-[8px] font-black uppercase px-2 py-1 bg-slate-50 text-slate-500 rounded-sm border border-slate-100">{item.condition}</span>
                                                <span className="text-[8px] font-black uppercase px-2 py-1 bg-slate-50 text-slate-500 rounded-sm border border-slate-100">{item.finish}</span>
                                                <span className="text-[8px] font-black uppercase px-2 py-1 bg-slate-50 text-slate-500 rounded-sm border border-slate-100">{item.language}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 md:gap-8 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                                        <div className="text-center w-16">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Qtd</p>
                                            <p className="font-black text-slate-900">{item.quantity}x</p>
                                        </div>
                                        <div className="text-center w-24 relative">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pago</p>
                                            {editingPriceTarget === item.id ? (
                                                <div className="flex items-center gap-1 justify-center mt-1 absolute inset-x-0 -bottom-2 md:bottom-auto md:top-6 bg-white z-20 p-1.5 rounded-lg shadow-xl border border-rose-200">
                                                    <span className="text-[10px] font-bold text-slate-400">R$</span>
                                                    <input 
                                                        type="text" 
                                                        autoFocus
                                                        className="w-14 text-sm font-black text-slate-900 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400" 
                                                        value={editingPriceValue}
                                                        onChange={(e) => setEditingPriceValue(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdatePrice(e, item.id); if (e.key === 'Escape') setEditingPriceTarget(null); }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <div className="flex flex-col gap-1">
                                                        <button onClick={(e) => handleUpdatePrice(e, item.id)} className="text-emerald-600 hover:text-emerald-700 bg-emerald-100 p-0.5 rounded leading-none" title="Salvar"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></button>
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingPriceTarget(null); }} className="text-rose-600 hover:text-rose-700 bg-rose-100 p-0.5 rounded leading-none" title="Cancelar"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="group/edit cursor-pointer inline-flex items-center gap-1" onClick={(e) => { e.stopPropagation(); setEditingPriceTarget(item.id); setEditingPriceValue((item.purchase_price || 0).toString().replace('.', ',')); }} title="Clique para editar o valor pago">
                                                    <p className="font-black text-slate-900 border-b border-dashed border-slate-300 group-hover/edit:border-rose-400 transition-colors">R$ {(item.purchase_price || 0).toFixed(2).replace('.', ',')}</p>
                                                    <span className="text-slate-300 opacity-0 group-hover/edit:opacity-100 group-hover/edit:text-rose-500 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center w-24 md:border-l border-slate-100 md:pl-4">
                                            <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Atual</p>
                                            <p className="font-black text-slate-950">R$ {item.currentValue.toFixed(2).replace('.', ',')}</p>
                                        </div>
                                        <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors absolute top-4 right-4 md:relative md:top-auto md:right-auto" title="Remover do Inventário">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-between mt-auto">
                                <button 
                                    onClick={() => setModalPage(p => Math.max(1, p - 1))} 
                                    disabled={modalPage === 1}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                                >
                                    ← Anterior
                                </button>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                                    Página <span className="text-slate-900">{modalPage}</span> de {totalPages}
                                </span>
                                <button 
                                    onClick={() => setModalPage(p => Math.min(totalPages, p + 1))} 
                                    disabled={modalPage === totalPages}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                                >
                                    Próxima →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
