"use client";

import React, { useEffect, useState } from 'react';
import CardGallery from '@/components/CardGallery';
import { supabase } from '@/lib/supabase';

export default function InventoryPage() {
    const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
    const [cards, setCards] = useState<{ id: string; name: string; set: string; imageUrl: string; price: number; grade: string; finish: string; isPromo: boolean }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUser(user);
                    fetchUserCards(user.id);
                } else {
                    console.log("No active session");
                    setLoading(false);
                }
            } catch (_error) {
                console.log("No active session");
                setLoading(false);
            }
        };

        const fetchUserCards = async (userId: string) => {
            try {
                const { data, error } = await supabase.from('inventory').select('*').eq('user_id', userId);
                if (error) throw error;

                setCards((data || []).map((doc: { id: string; name?: string; set?: string; image_url?: string; price?: number; grade?: string; finish?: string; is_promo?: boolean }) => ({
                    id: doc.id,
                    name: doc.name || "Ativo Desconhecido",
                    set: doc.set || "Arquivo Nulo",
                    imageUrl: doc.image_url || "https://images.pokemontcg.io/base1/4.png",
                    price: doc.price || 0,
                    grade: doc.grade || "NM",
                    finish: doc.finish || "Normal",
                    isPromo: doc.is_promo || false
                })));
            } catch (_error) {
                // Mock data for demo if fetch fails
                setCards([
                    { id: "1", name: "Pikachu Illustrator", set: "Arquivo Promo", imageUrl: "https://images.pokemontcg.io/promo/1.png", price: 250000, grade: "10", isPromo: true, finish: "Holo" },
                ]);
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-32 text-center animate-fade-up">
                <div className="max-w-md mx-auto space-y-8 bg-white p-12 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-rose-100">🔒</div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Acesso Restrito ao <span className="text-rose-600">Admin</span></h2>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-relaxed">Apenas o administrador da TCG Mega Store pode gerenciar o estoque global.</p>
                    </div>
                    <a href="/auth/login" className="block">
                        <button className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg hover:bg-rose-600 transition-all transform hover:-translate-y-0.5">
                            Identificar Administrador
                        </button>
                    </a>
                </div>
            </div>
        );
    }

    return (
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
                    <button className="h-11 px-6 bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-50 transition-all">Sincronizar Cloud</button>
                    <a href="/estoque/novo">
                        <button className="h-11 px-6 bg-rose-600 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all">Novo Item na Loja</button>
                    </a>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                {[
                    { label: "VALOR_EM_LOJA_", value: "R$ 428.500", trend: "+12.4%", icon: "💰" },
                    { label: "ITENS_ATIVOS_", value: `${cards.length} Cards`, trend: "+3 este mês", icon: "🃏" },
                    { label: "VENDAS_CONCLUÍDAS_", value: "42", trend: "Taxa: 98%", icon: "⚡" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                            <span className="text-xl group-hover:scale-110 transition-transform">{stat.icon}</span>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black tracking-tighter text-slate-900 group-hover:text-rose-600 transition-colors">{stat.value}</h2>
                            <p className="text-[9px] text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded-md inline-block">{stat.trend}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-10">
                <div className="flex items-center gap-6">
                    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 whitespace-nowrap">Itens Publicados na Loja</h2>
                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                </div>
                <CardGallery cards={cards} />
            </div>
        </div>
    );
}
