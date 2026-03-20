'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function MinhaContaDashboard() {
    const [userName, setUserName] = useState('');
    const [stats, setStats] = useState({
        orders: 0,
        arremates: 0,
        addresses: 0,
        balance: 0,
        credits: 0,
        creditsLocked: 0,
    });
    const [achievements, setAchievements] = useState<any[]>([]);
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

            const [ordersRes, arrematesRes, addressRes, walletRes, creditsRes, achievementsRes] = await Promise.all([
                supabase.from('purchases').select('id', { count: 'exact' }).eq('user_id', user.id).neq('payment_method', 'live_credits'),
                supabase.from('purchases').select('id', { count: 'exact' }).eq('user_id', user.id).eq('payment_method', 'live_credits'),
                supabase.from('user_addresses').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
                supabase.from('auction_credits').select('balance, locked').eq('user_id', user.id).single(),
                supabase.from('user_achievements')
                    .select('unlocked_at, achievements(id, name, description, icon)')
                    .eq('user_id', user.id)
            ]);

            setStats({
                orders: ordersRes.count || 0,
                arremates: arrematesRes.count || 0,
                addresses: addressRes.count || 0,
                balance: walletRes.data?.balance || 0,
                credits: creditsRes.data?.balance || 0,
                creditsLocked: creditsRes.data?.locked || 0,
            });

            // Flatten achievements data (if table exists and returned data)
            if (achievementsRes.data) {
                const formattedBadges = achievementsRes.data.map((ua: any) => ({
                    unlockedAt: ua.unlocked_at,
                    ...ua.achievements
                }));
                setAchievements(formattedBadges);
            }

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
            title: 'Central de Live',
            desc: 'Gerencie suas transmissões ou acompanhe o histórico de itens que você ganhou nos leilões.',
            href: '/admin/live', // Agora centralizado aqui
        },
        {
            title: 'Histórico de Arremates',
            desc: 'Veja detalhes de todos os itens conquistados nas lives do TCG Hub.',
            href: '/minha-conta/arremates',
        },
        {
            title: 'Creditos para leilao',
            desc: 'Saldo disponivel, bloqueado e movimentacao para participacao em leiloes.',
            href: '/minha-conta/creditos',
        },
        {
            title: 'Perfil Público',
            desc: 'Acesse seu perfil público e gerencie sua exibição de medalhas e títulos.',
            href: '/minha-conta/perfil',
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

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        ['Pedidos', `${stats.orders}`],
                        ['Arremates', `${stats.arremates}`],
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

            {/* SEÇÃO DE CONQUISTAS (GAMIFICAÇÃO) */}
            <section className="page-frame mt-8">
                    <div className="surface-card p-8">
                        <div className="mb-6 flex items-end justify-between">
                            <div>
                                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">Quadro de Medalhas</h2>
                                <p className="text-sm text-slate-500 mt-1">Conquistas que você desbloqueou no TCG Hub.</p>
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 bg-rose-50 px-4 py-2 rounded-xl">
                                {achievements.length} Desbloqueadas
                            </div>
                        </div>

                        {achievements.length > 0 ? (
                            <div className="flex flex-wrap gap-4">
                                {achievements.map((badge, idx) => (
                                    <div 
                                        key={idx} 
                                        className="group relative flex flex-col items-center justify-center p-4 w-28 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-rose-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10 cursor-default"
                                        title={badge.description}
                                    >
                                        <div className="text-4xl mb-3 drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                                            {badge.icon}
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 text-center leading-tight">
                                            {badge.name}
                                        </h3>
                                        
                                        {/* Tooltip Hover Redesigned as Absolute Box */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-10 pointer-events-none text-center">
                                            <div className="font-bold mb-1">{badge.name}</div>
                                            <div className="text-slate-300 opacity-90">{badge.description}</div>
                                            <div className="mt-2 pt-2 border-t border-slate-700/50 text-[9px] uppercase tracking-widest text-yellow-400">
                                                Desbloqueado em {new Date(badge.unlockedAt).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center">
                                <span className="text-4xl mb-3 opacity-30 grayscale">🏆</span>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Quadro Vazio</h3>
                                <p className="text-xs text-slate-400 max-w-sm">Você ainda não desbloqueou nenhuma conquista. Realize ações no TCG Hub para ganhar suas primeiras medalhas!</p>
                            </div>
                        )}
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
