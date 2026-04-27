"use client";

import React, { useEffect, useState } from 'react';
import CardGallery from '@/components/CardGallery';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';


export default function InventoryPage() {
    const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
    const [cards, setCards] = useState<{ id: string; name: string; set: string; imageUrl: string; price: number; originalPrice?: number; grade: string; finish: string; isPromo: boolean }[]>([]);
    const [editingCard, setEditingCard] = useState<any>(null);
    const [editPrice, setEditPrice] = useState('');
    const [editOriginalPrice, setEditOriginalPrice] = useState('');
    const [editQuantity, setEditQuantity] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalValue: 0, itemsCount: 0, salesCount: 0 });

    useEffect(() => {
        const fetchStatsAndCards = async (userId: string, email: string) => {
            try {
                const isAdmin = email === 'admin@tcghub.com.br';

                // Fetch Cards (Global if admin, otherwise user-specific)
                const cardsQuery = supabase.from('inventory').select('*');
                if (!isAdmin) cardsQuery.eq('user_id', userId);

                const { data: inventoryData, error: inventoryError } = await cardsQuery;
                if (inventoryError) throw inventoryError;

                const formattedCards = (inventoryData || []).map((doc: any) => ({
                    id: doc.id,
                    name: doc.name || "Ativo Desconhecido",
                    set: doc.set || "Arquivo Nulo",
                    imageUrl: doc.image_url || "https://images.pokemontcg.io/base1/4.png",
                    price: doc.price || 0,
                    originalPrice: doc.original_price,
                    grade: doc.grade || "NM",
                    finish: doc.finish || "Normal",
                    isPromo: doc.is_promo || false,
                    quantity: doc.quantity || 0
                }));
                setCards(formattedCards);

                // Calculate Inventory Value
                const totalValue = (inventoryData || []).reduce((acc: number, curr: any) => acc + (curr.price || 0), 0);

                // Fetch Total Sales (Purchases count)
                const { count: salesCount, error: salesError } = await supabase
                    .from('purchases')
                    .select('*', { count: 'exact', head: true });

                setStats({
                    totalValue,
                    itemsCount: formattedCards.length,
                    salesCount: salesCount || 0
                });

            } catch (error) {
                console.error("Erro ao buscar dados do dashboard:", error);
                // Fallback a dados vazios para evitar crash, mantendo a UI limpa
            } finally {
                setLoading(false);
            }
        };

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                fetchStatsAndCards(user.id, user.email || '');
            } else {
                setLoading(false);
            }
        };

        init();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('inventory')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setCards(prev => prev.filter(card => card.id !== id));
            setStats(prev => ({
                ...prev,
                itemsCount: prev.itemsCount - 1,
                totalValue: prev.totalValue - (cards.find(c => c.id === id)?.price || 0)
            }));
        } catch (error) {
            console.error("Erro ao deletar item:", error);
            alert("Erro ao remover item do estoque.");
        }
    };

    const handleUpdateItem = async () => {
        if (!editingCard) return;
        try {
            const newPrice = parseFloat(editPrice);
            const originalPrice = editOriginalPrice ? parseFloat(editOriginalPrice) : null;
            const newQuantity = parseInt(editQuantity);

            const { error } = await supabase
                .from('inventory')
                .update({
                    price: newPrice,
                    original_price: originalPrice,
                    quantity: newQuantity
                })
                .eq('id', editingCard.id);

            if (error) throw error;

            setCards(prev => prev.map(c =>
                c.id === editingCard.id
                    ? { ...c, price: newPrice, originalPrice: originalPrice || undefined, quantity: newQuantity }
                    : c
            ));
            setEditingCard(null);
        } catch (error) {
            console.error("Erro ao atualizar item:", error);
            alert("Erro ao atualizar item.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-slate-900 text-white selection:bg-rose-500/30">
                <div className="max-w-7xl mx-auto px-6 py-20 animate-fade-up">
                    {/* Dashboard Header */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16 border-b border-white/10 pb-12">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.6)]"></span>
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Painel de Controle de Vendas</span>
                            </div>
                            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
                                Gestão de <span className="text-rose-600">Estoque.</span>
                            </h1>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Admin Control Center v5.0</p>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <Link href="/admin/vendas">
                                <button className="h-11 px-6 bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white/10 hover:text-white transition-all cursor-pointer">Ver Vendas</button>
                            </Link>
                            <Link href="/admin/sync">
                                <button className="h-11 px-6 bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white/10 hover:text-white transition-all cursor-pointer">Sincronizar Cloud</button>
                            </Link>
                            <Link href="/admin/configuracoes">
                                <button className="h-11 px-6 bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white/10 hover:text-white transition-all cursor-pointer">⚙️ Configurações</button>
                            </Link>
                            <a href="/estoque/novo">
                                <button className="h-11 px-6 bg-rose-600 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg shadow-rose-600/30 hover:bg-rose-700 transition-all hover:-translate-y-1">Novo Item na Loja</button>
                            </a>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                        {[
                            {
                                label: "Valor em Loja",
                                value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.totalValue),
                                trend: "+12.4%",
                                icon: null
                            },
                            {
                                label: "Itens Ativos",
                                value: `${stats.itemsCount} Cards`,
                                trend: "+3 este mês",
                                icon: null
                            },
                            {
                                label: "Vendas Concluídas",
                                value: stats.salesCount.toString(),
                                trend: "Taxa: 100%",
                                icon: null
                            }
                        ].map((stat, i) => (
                            <Link key={i} href={stat.label === "Vendas Concluídas" ? "/admin/vendas" : "#"} className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-sm hover:shadow-2xl hover:border-white/20 transition-all group cursor-pointer block relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 blur-[60px] -z-10"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                                    {stat.icon && <span className="text-xl group-hover:scale-110 transition-transform">{stat.icon}</span>}
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black tracking-tighter text-white group-hover:text-rose-600 transition-colors tabular-nums">{stat.value}</h2>
                                    <p className="text-[9px] text-rose-500 font-black bg-rose-500/10 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">{stat.trend}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="space-y-10">
                        <div className="flex items-center gap-6">
                            <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-white whitespace-nowrap">Itens Publicados na Loja</h2>
                            <div className="h-[1px] flex-1 bg-white/10"></div>
                        </div>
                    <CardGallery
                        cards={cards}
                        onDelete={handleDelete}
                        onEditCard={(id, price, originalPrice, quantity) => {
                            const card = cards.find(c => c.id === id);
                            if (card) {
                                setEditingCard(card);
                                setEditPrice(price.toString());
                                setEditOriginalPrice(originalPrice?.toString() || '');
                                setEditQuantity(quantity?.toString() || '1');
                            }
                        }}
                    />

                        {/* Quick Edit Modal */}
                        {editingCard && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
                                <div className="bg-slate-900 w-full max-w-sm rounded-[40px] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 animate-fade-up">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Editar Ativo_</h3>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço de Venda (BRL)</label>
                                            <input
                                                type="number"
                                                value={editPrice}
                                                onChange={(e) => setEditPrice(e.target.value)}
                                                className="w-full h-14 px-6 rounded-2xl border border-white/10 bg-white/5 text-white font-black focus:border-rose-600 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço Original (MSRP)</label>
                                            <input
                                                type="number"
                                                value={editOriginalPrice}
                                                onChange={(e) => setEditOriginalPrice(e.target.value)}
                                                placeholder="Ex: 100.00"
                                                className="w-full h-14 px-6 rounded-2xl border border-white/10 bg-white/5 text-white font-black focus:border-rose-600 transition-all outline-none placeholder:text-slate-700"
                                            />
                                            <p className="text-[9px] text-slate-500 font-bold ml-1 uppercase">Deixe vazio se não houver desconto</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantidade em Estoque</label>
                                            <input
                                                type="number"
                                                value={editQuantity}
                                                onChange={(e) => setEditQuantity(e.target.value)}
                                                className="w-full h-14 px-6 rounded-2xl border border-white/10 bg-white/5 text-white font-black focus:border-rose-600 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-10">
                                        <button
                                            onClick={() => setEditingCard(null)}
                                            className="h-14 bg-white/5 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleUpdateItem}
                                            className="h-14 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30"
                                        >
                                            Salvar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
