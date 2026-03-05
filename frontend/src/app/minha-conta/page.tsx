'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MinhaContaDashboard() {
    const [userName, setUserName] = useState('');
    const [stats, setStats] = useState({
        orders: 0,
        addresses: 0,
        balance: 0,
        credits: 0,
        creditsLocked: 0
    });
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchDashboardData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/auth/login');
                return;
            }
            setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Membro');

            // Parallel fetch
            const [ordersRes, addrRes, walletRes, creditsRes] = await Promise.all([
                supabase.from('purchases').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabase.from('user_addresses').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
                supabase.from('auction_credits').select('balance, locked').eq('user_id', user.id).single()
            ]);

            setStats({
                orders: ordersRes.count || 0,
                addresses: addrRes.count || 0,
                balance: walletRes.data?.balance || 0,
                credits: creditsRes.data?.balance || 0,
                creditsLocked: creditsRes.data?.locked || 0
            });

            setLoading(false);
        };

        fetchDashboardData();
    }, []);

    const menuItems = [
        {
            title: 'Créditos para Leilão',
            desc: 'Gerencie seus créditos para participar dos pregões.',
            icon: '🏆',
            href: '/minha-conta/creditos',
            color: 'bg-rose-50 text-rose-600'
        },
        {
            title: 'Meus Pedidos',
            desc: 'Histórico de compras e rastreamento.',
            icon: '📦',
            href: '/minha-conta/pedidos',
            color: 'bg-blue-50 text-blue-600'
        },
        {
            title: 'Endereços de Entrega',
            desc: 'Gerencie seus locais para envio rápido.',
            icon: '📍',
            href: '/minha-conta/enderecos',
            color: 'bg-emerald-50 text-emerald-600'
        },
        {
            title: 'Dados da Conta',
            desc: 'Altere nome, celular e senha.',
            icon: '⚙️',
            href: '/minha-conta/dados',
            color: 'bg-amber-50 text-amber-600'
        }
    ];

    if (loading) return (
        <div className="max-w-7xl mx-auto px-6 py-32 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">
            Preparando seu painel...
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-16 min-h-screen animate-fade-up">
            <div className="mb-16 space-y-4">
                <span className="inline-block px-4 py-1.5 rounded-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em]">
                    Área do Cliente
                </span>
                <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-slate-900 leading-none">
                    Olá, <span className="text-rose-600">{userName}.</span>
                </h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Bem-vindo ao seu centro de controle TCG Mega Store.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
                <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pedidos</p>
                    <p className="text-4xl font-black text-slate-900 leading-none">{stats.orders}</p>
                </div>
                <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cashback Acumulado</p>
                    <p className="text-4xl font-black text-emerald-600 leading-none">R$ {stats.balance.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {menuItems.map((item, idx) => (
                    <Link key={idx} href={item.href} className="group">
                        <div className="h-full bg-white border border-slate-100 p-10 rounded-[50px] shadow-sm group-hover:shadow-xl group-hover:shadow-slate-200/50 group-hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                            <div className={`h-16 w-16 ${item.color} rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform duration-500`}>
                                {item.icon}
                            </div>
                            <h3 className="text-2xl font-black tracking-tight text-slate-900 mb-2 uppercase">{item.title}</h3>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed">{item.desc}</p>

                            <div className="mt-8 flex items-center gap-2 text-rose-600 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                Acessar Agora <span>→</span>
                            </div>

                            {/* Accent Circle */}
                            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-slate-50 rounded-full group-hover:bg-rose-50 transition-colors -z-10" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Logout Footer */}
            <div className="mt-24 pt-10 border-t border-slate-100 text-center">
                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = '/';
                    }}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-rose-600 transition-colors"
                >
                    Encerrar Sessão da Conta
                </button>
            </div>
        </div>
    );
}
