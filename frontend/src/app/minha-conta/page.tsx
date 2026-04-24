'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const E = {
    bg: '#0c1324',
    surface: 'rgba(25,31,49,0.8)',
    surfaceHigh: '#23293c',
    border: 'rgba(220,225,251,0.08)',
    rose: '#e11d48',
    amber: '#f59e0b',
    green: '#6ee591',
    text: '#dce1fb',
    muted: 'rgba(220,225,251,0.5)',
    faint: 'rgba(220,225,251,0.12)',
};

const menuItems = [
    { title: 'Meus Pedidos', desc: 'Histórico de compras, status de pagamento e acompanhamento de envio.', href: '/minha-conta/pedidos', icon: '📦' },
    { title: 'Central de Live', desc: 'Gerencie suas transmissões ao vivo e configure lotes de leilão.', href: '/admin/live', icon: '📡' },
    { title: 'Arremates', desc: 'Histórico de todos os itens conquistados nas lives do TCG MEGASTORE.', href: '/minha-conta/arremates', icon: '🔨' },
    { title: 'Créditos de Leilão', desc: 'Saldo disponível, bloqueado e movimentações para leilões.', href: '/minha-conta/creditos', icon: '💎' },
    { title: 'Perfil Público', desc: 'Gerencie sua exibição de medalhas e títulos para outros usuários.', href: '/minha-conta/perfil', icon: '🏅' },
    { title: 'Endereços', desc: 'Locais de entrega para checkout mais rápido e organizado.', href: '/minha-conta/enderecos', icon: '📍' },
    { title: 'Dados da Conta', desc: 'Informações pessoais, segurança e manutenção da conta.', href: '/minha-conta/dados', icon: '⚙️' },
];

export default function MinhaContaDashboard() {
    const [userName, setUserName] = useState('');
    const [stats, setStats] = useState({ orders: 0, arremates: 0, addresses: 0, balance: 0, credits: 0, creditsLocked: 0 });
    const [achievements, setAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace('/auth/login'); return; }

            setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Membro');

            const [ordersRes, arrematesRes, addressRes, walletRes, creditsRes, achievementsRes] = await Promise.all([
                supabase.from('purchases').select('id', { count: 'exact' }).eq('user_id', user.id).neq('payment_method', 'live_credits'),
                supabase.from('purchases').select('id', { count: 'exact' }).eq('user_id', user.id).eq('payment_method', 'live_credits'),
                supabase.from('user_addresses').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
                supabase.from('auction_credits').select('balance, locked').eq('user_id', user.id).single(),
                supabase.from('user_achievements').select('unlocked_at, achievements(id, name, description, icon)').eq('user_id', user.id),
            ]);

            setStats({
                orders: ordersRes.count || 0,
                arremates: arrematesRes.count || 0,
                addresses: addressRes.count || 0,
                balance: walletRes.data?.balance || 0,
                credits: creditsRes.data?.balance || 0,
                creditsLocked: creditsRes.data?.locked || 0,
            });

            if (achievementsRes.data) {
                setAchievements(achievementsRes.data.map((ua: any) => ({ unlockedAt: ua.unlocked_at, ...ua.achievements })));
            }

            setLoading(false);
        };
        void load();
    }, [router]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: E.bg }}>
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-t-rose-600 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: E.muted }}>Carregando painel...</p>
            </div>
        </div>
    );

    const statCards = [
        { label: 'Pedidos', value: `${stats.orders}`, icon: '📦' },
        { label: 'Arremates', value: `${stats.arremates}`, icon: '🔨' },
        { label: 'Endereços', value: `${stats.addresses}`, icon: '📍' },
        { label: 'Cashback', value: `R$ ${stats.balance.toFixed(2).replace('.', ',')}`, icon: '💸', amber: true },
        { label: 'Créditos Livres', value: `R$ ${(stats.credits - stats.creditsLocked).toFixed(2).replace('.', ',')}`, icon: '💎', amber: true },
    ];

    return (
        <div style={{ background: E.bg, minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: E.text }}>
            {/* Ambient glow top */}
            <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(225,29,72,0.06) 0%, transparent 60%)', zIndex: 0 }}></div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20 pt-10">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <span className="text-xs font-black uppercase tracking-widest mb-3 block" style={{ color: E.rose }}>Área do Cliente</span>
                        <h1 className="text-5xl font-black tracking-tighter leading-none" style={{ color: E.text }}>
                            Olá, <span style={{ color: E.rose }}>{userName}</span>.
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed max-w-xl" style={{ color: E.muted }}>
                            Bem-vindo ao seu painel. Gerencie pedidos, créditos, arremates e sua conta em um só lugar.
                        </p>
                    </div>
                    <button
                        onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
                        className="shrink-0 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all hover:scale-105"
                        style={{ background: E.faint, color: E.muted, border: `1px solid ${E.border}` }}
                    >
                        Encerrar Sessão →
                    </button>
                </div>

                {/* STAT CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                    {statCards.map(({ label, value, icon, amber }) => (
                        <div key={label} className="rounded-2xl p-5 transition-all hover:-translate-y-0.5" style={{ background: E.surface, border: `1px solid ${E.border}`, backdropFilter: 'blur(12px)' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">{icon}</span>
                                <p className="text-xs font-black uppercase tracking-widest" style={{ color: E.muted }}>{label}</p>
                            </div>
                            <p className="text-2xl font-black tabular-nums tracking-tighter" style={{ color: amber ? E.amber : E.text }}>
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ACHIEVEMENTS */}
                <div className="rounded-[24px] p-7 mb-10" style={{ background: E.surface, border: `1px solid ${E.border}`, backdropFilter: 'blur(12px)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black tracking-tighter" style={{ color: E.text }}>Quadro de Medalhas</h2>
                            <p className="text-sm mt-1" style={{ color: E.muted }}>Conquistas desbloqueadas no TCG MEGASTORE.</p>
                        </div>
                        <span className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest" style={{ background: 'rgba(225,29,72,0.1)', color: E.rose, border: `1px solid rgba(225,29,72,0.2)` }}>
                            {achievements.length} Desbloqueadas
                        </span>
                    </div>

                    {achievements.length > 0 ? (
                        <div className="flex flex-wrap gap-4">
                            {achievements.map((badge, idx) => (
                                <div
                                    key={idx}
                                    className="group relative flex flex-col items-center p-4 w-28 rounded-2xl cursor-default transition-all hover:-translate-y-1"
                                    style={{ background: E.faint, border: `1px solid ${E.border}` }}
                                    title={badge.description}
                                >
                                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{badge.icon}</div>
                                    <h3 className="text-center text-xs font-black uppercase tracking-wider leading-tight" style={{ color: E.text }}>{badge.name}</h3>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all rounded-xl p-3 shadow-2xl z-20 pointer-events-none text-center" style={{ background: '#191f31', border: `1px solid ${E.border}` }}>
                                        <p className="text-xs font-black mb-1" style={{ color: E.text }}>{badge.name}</p>
                                        <p className="text-xs" style={{ color: E.muted }}>{badge.description}</p>
                                        <p className="text-xs mt-2 font-black uppercase tracking-widest" style={{ color: E.amber }}>
                                            {new Date(badge.unlockedAt).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 rounded-2xl flex flex-col items-center justify-center text-center" style={{ border: `2px dashed ${E.border}` }}>
                            <span className="text-4xl mb-3 opacity-30 grayscale">🏆</span>
                            <h3 className="text-sm font-black uppercase tracking-widest mb-1" style={{ color: E.muted }}>Quadro Vazio</h3>
                            <p className="text-xs max-w-sm" style={{ color: E.muted }}>Realize ações no TCG MEGASTORE para ganhar suas primeiras medalhas!</p>
                        </div>
                    )}
                </div>

                {/* MENU GRID */}
                <div className="grid gap-4 md:grid-cols-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group rounded-[20px] p-7 flex items-start gap-5 transition-all hover:-translate-y-1"
                            style={{ background: E.surface, border: `1px solid ${E.border}`, backdropFilter: 'blur(12px)', textDecoration: 'none' }}
                        >
                            <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl transition-all group-hover:scale-110" style={{ background: 'rgba(225,29,72,0.1)', border: `1px solid rgba(225,29,72,0.15)` }}>
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: E.muted }}>Atalho</p>
                                <h2 className="text-xl font-black tracking-tighter transition-colors" style={{ color: E.text }}>
                                    <span className="group-hover:text-rose-400 transition-colors">{item.title}</span>
                                </h2>
                                <p className="text-sm mt-1 leading-relaxed" style={{ color: E.muted }}>{item.desc}</p>
                            </div>
                            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all group-hover:bg-rose-600/20" style={{ background: E.faint, color: E.muted }}>
                                →
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
