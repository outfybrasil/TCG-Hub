"use client";

import React, { useEffect, useState } from 'react';
import CardGallery from '@/components/CardGallery';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

export default function InventoryPage() {
    const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
    const [cards, setCards] = useState<{ id: string; name: string; set: string; imageUrl: string; price: number; grade: string; finish: string; isPromo: boolean }[]>([]);
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
                    grade: doc.grade || "NM",
                    finish: doc.finish || "Normal",
                    isPromo: doc.is_promo || false
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <AdminGuard>
            <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up">
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16 border-b border-slate-200 pb-12">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Painel de Controle de Vendas</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">
                            Gestão de <span className="text-rose-600">Estoque.</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Admin Control Center v5.0</p>
                    </div>

                    <div className="flex gap-3">
                        <Link href="/admin/vendas">
                            <button className="h-11 px-6 bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Ver Vendas</button>
                        </Link>
                        <Link href="/admin/sync">
                            <button className="h-11 px-6 bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Sincronizar Cloud</button>
                        </Link>
                        <a href="/estoque/novo">
                            <button className="h-11 px-6 bg-rose-600 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all">Novo Item na Loja</button>
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
                        <Link key={i} href={stat.label === "Vendas Concluídas" ? "/admin/vendas" : "#"} className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all group cursor-pointer block">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                {stat.icon && <span className="text-xl group-hover:scale-110 transition-transform">{stat.icon}</span>}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black tracking-tighter text-slate-900 group-hover:text-rose-600 transition-colors">{stat.value}</h2>
                                <p className="text-[9px] text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded-md inline-block">{stat.trend}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="space-y-10">
                    <div className="flex items-center gap-6">
                        <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 whitespace-nowrap">Itens Publicados na Loja</h2>
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>
                    <CardGallery cards={cards} onDelete={handleDelete} />
                </div>
            </div>
        </AdminGuard>
    );
}
