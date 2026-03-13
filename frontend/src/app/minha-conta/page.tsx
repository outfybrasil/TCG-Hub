'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function MinhaContaDashboard() {
    const [userName, setUserName] = useState('');
    const [stats, setStats] = useState({
        orders: 0,
        addresses: 0,
        balance: 0,
        credits: 0,
        creditsLocked: 0,
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

            const [ordersRes, addressRes, walletRes, creditsRes] = await Promise.all([
                supabase.from('purchases').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabase.from('user_addresses').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
                supabase.from('auction_credits').select('balance, locked').eq('user_id', user.id).single(),
            ]);

            setStats({
                orders: ordersRes.count || 0,
                addresses: addressRes.count || 0,
                balance: walletRes.data?.balance || 0,
                credits: creditsRes.data?.balance || 0,
                creditsLocked: creditsRes.data?.locked || 0,
            });

            setLoading(false);
        };

        void fetchDashboardData();
    }, [router]);

    const menuItems = [
        {
            title: 'Meus pedidos',
            desc: 'Historico de compras, status do pagamento e acompanhamento do envio.',
            href: '/minha-conta/pedidos',
        },
        {
            title: 'Creditos para leilao',
            desc: 'Saldo disponivel, bloqueado e movimentacao para participacao em leiloes.',
            href: '/minha-conta/creditos',
        },
        {
            title: 'Enderecos',
            desc: 'Locais de entrega para checkout mais rapido e organizado.',
            href: '/minha-conta/enderecos',
        },
        {
            title: 'Dados da conta',
            desc: 'Informacoes pessoais, seguranca e manutencao da conta.',
            href: '/minha-conta/dados',
        },
    ];

    if (loading) {
        return (
            <div className="page-frame animate-pulse py-28 text-center text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Preparando seu painel
            </div>
        );
    }

    return (
        <div className="animate-fade-up pb-20 pt-10">
            <section className="page-frame page-hero space-y-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-5">
                        <span className="eyebrow">Area do cliente</span>
                        <div className="space-y-4">
                            <h1 className="text-5xl font-black tracking-[-0.07em] text-slate-950 sm:text-6xl">
                                Ola, <span className="text-rose-600">{userName}</span>.
                            </h1>
                            <p className="max-w-2xl text-base leading-8 text-slate-600">
                                A area logada foi simplificada para priorizar pedido, saldo e atalhos realmente usados no fluxo de compra.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/';
                        }}
                        className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                    >
                        Encerrar sessao
                    </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ['Pedidos', `${stats.orders}`],
                        ['Enderecos', `${stats.addresses}`],
                        ['Cashback', `R$ ${stats.balance.toFixed(2).replace('.', ',')}`],
                        ['Creditos livres', `R$ ${(stats.credits - stats.creditsLocked).toFixed(2).replace('.', ',')}`],
                    ].map(([label, value]) => (
                        <div key={label} className="surface-card p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                            <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">{value}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="page-frame mt-8 grid gap-5 md:grid-cols-2">
                {menuItems.map((item) => (
                    <Link key={item.href} href={item.href} className="surface-card group p-7 transition-all hover:-translate-y-1 hover:border-rose-100 hover:shadow-[0_28px_80px_-48px_rgba(225,29,72,0.38)]">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Atalho</p>
                                <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950 group-hover:text-rose-600">{item.title}</h2>
                                <p className="max-w-xl text-sm leading-7 text-slate-600">{item.desc}</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg text-slate-400 transition-all group-hover:border-rose-100 group-hover:bg-rose-50 group-hover:text-rose-600">
                                →
                            </div>
                        </div>
                    </Link>
                ))}
            </section>
        </div>
    );
}
