'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ChevronRight,
    CircleUserRound,
    Gem,
    Gavel,
    Handshake,
    LogOut,
    MapPin,
    Medal,
    Package,
    Radio,
    Settings,
    Trophy,
    WalletCards,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AccountStats {
    orders: number;
    arremates: number;
    addresses: number;
    balance: number;
    credits: number;
    creditsLocked: number;
}

interface Achievement {
    id?: string;
    name: string;
    description?: string;
    icon?: string;
    unlockedAt: string;
}

interface MenuItem {
    title: string;
    description: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
}

const sections: Array<{ title: string; items: MenuItem[] }> = [
    {
        title: 'Compras e leilões',
        items: [
            { title: 'Meus pedidos', description: 'Pagamento, envio e histórico de compras', href: '/minha-conta/pedidos', icon: Package },
            { title: 'Arremates', description: 'Itens conquistados durante as lives', href: '/minha-conta/arremates', icon: Gavel },
            { title: 'Créditos de leilão', description: 'Saldo, reservas e movimentações', href: '/minha-conta/creditos', icon: Gem },
        ],
    },
    {
        title: 'Vendas',
        items: [
            { title: 'Central de live', description: 'Transmissão e controle dos lotes', href: '/admin/live', icon: Radio },
            { title: 'Minhas vendas', description: 'Pedidos vendidos, envios e rastreio', href: '/minha-conta/vendas', icon: Handshake },
        ],
    },
    {
        title: 'Perfil e segurança',
        items: [
            { title: 'Perfil público', description: 'Medalhas e informações visíveis', href: '/minha-conta/perfil', icon: CircleUserRound },
            { title: 'Endereços', description: 'Locais usados nas suas entregas', href: '/minha-conta/enderecos', icon: MapPin },
            { title: 'Dados da conta', description: 'Informações pessoais e segurança', href: '/minha-conta/dados', icon: Settings },
        ],
    },
];

const initialStats: AccountStats = { orders: 0, arremates: 0, addresses: 0, balance: 0, credits: 0, creditsLocked: 0 };

function money(value: number) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MinhaContaDashboard() {
    const [userName, setUserName] = useState('');
    const [stats, setStats] = useState<AccountStats>(initialStats);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const router = useRouter();

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { router.replace('/auth/login'); return; }

                if (active) setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Membro');

                const [ordersRes, arrematesRes, addressRes, walletRes, creditsRes, achievementsRes] = await Promise.all([
                    supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', user.id).neq('payment_method', 'live_credits'),
                    supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('payment_method', 'live_credits'),
                    supabase.from('user_addresses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
                    supabase.from('auction_credits').select('balance, locked').eq('user_id', user.id).maybeSingle(),
                    supabase.from('user_achievements').select('unlocked_at, achievements(id, name, description, icon)').eq('user_id', user.id),
                ]);

                const failed = [ordersRes, arrematesRes, addressRes, walletRes, creditsRes, achievementsRes].some(result => result.error);
                if (!active) return;

                setLoadError(failed);
                setStats({
                    orders: ordersRes.count || 0,
                    arremates: arrematesRes.count || 0,
                    addresses: addressRes.count || 0,
                    balance: Number(walletRes.data?.balance || 0),
                    credits: Number(creditsRes.data?.balance || 0),
                    creditsLocked: Number(creditsRes.data?.locked || 0),
                });

                const unlocked = (achievementsRes.data || []).flatMap(row => {
                    const achievement = Array.isArray(row.achievements) ? row.achievements[0] : row.achievements;
                    return achievement ? [{ ...achievement, unlockedAt: row.unlocked_at } as Achievement] : [];
                });
                setAchievements(unlocked);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [router]);

    if (loading) return (
        <div className="flex min-h-[70vh] items-center justify-center bg-brand-bg px-6" role="status">
            <div className="flex items-center gap-3 text-sm font-semibold text-brand-muted">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-brand-rose" />
                Preparando sua conta
            </div>
        </div>
    );

    const availableCredits = Math.max(0, stats.credits - stats.creditsLocked);

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text">
            <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:pb-20 lg:pt-16">
                <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-balance text-[clamp(2.25rem,8vw,4.5rem)] font-black leading-[0.95] tracking-[-0.04em] text-white">
                            Olá, {userName}.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-brand-muted sm:text-base">
                            Pedidos, créditos, vendas e dados da conta reunidos em um só lugar.
                        </p>
                    </div>
                    <button
                        onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
                        className="flex min-h-11 w-fit items-center gap-2 rounded-xl px-3 text-sm font-semibold text-brand-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-rose"
                    >
                        <LogOut className="h-4 w-4" />
                        Sair da conta
                    </button>
                </header>

                {loadError && (
                    <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100" role="alert">
                        Parte dos seus dados não pôde ser atualizada. Tente recarregar a página em alguns instantes.
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                    <main className="min-w-0 space-y-10">
                        <section aria-labelledby="wallet-title" className="overflow-hidden rounded-2xl bg-brand-surface shadow-[0_18px_45px_rgba(0,0,0,.18)]">
                            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                                <div>
                                    <div className="flex items-center gap-2 text-brand-muted">
                                        <WalletCards className="h-4 w-4" />
                                        <h2 id="wallet-title" className="text-sm font-semibold">Disponível para leilões</h2>
                                    </div>
                                    <p className="mt-2 text-3xl font-black tabular-nums tracking-[-0.03em] text-white sm:text-4xl">{money(availableCredits)}</p>
                                    {stats.creditsLocked > 0 && <p className="mt-1 text-xs text-brand-muted">{money(stats.creditsLocked)} reservado em lances ativos</p>}
                                </div>
                                <Link href="/minha-conta/creditos" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-rose px-5 text-sm font-bold text-white transition-colors hover:bg-brand-rose-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                                    Adicionar créditos
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </div>
                            <dl className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 sm:grid-cols-4">
                                {[
                                    ['Pedidos', stats.orders],
                                    ['Arremates', stats.arremates],
                                    ['Endereços', stats.addresses],
                                    ['Cashback', money(stats.balance)],
                                ].map(([label, value]) => (
                                    <div key={label} className="px-4 py-4 sm:px-5">
                                        <dt className="text-xs text-brand-muted">{label}</dt>
                                        <dd className="mt-1 truncate text-lg font-bold tabular-nums text-white">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        <section aria-labelledby="access-title">
                            <h2 id="access-title" className="text-xl font-bold tracking-[-0.02em] text-white">Acessos da conta</h2>
                            <div className="mt-4 overflow-hidden rounded-2xl bg-brand-surface">
                                {sections.map((section, sectionIndex) => (
                                    <div key={section.title} className={sectionIndex > 0 ? 'border-t border-white/10' : ''}>
                                        <h3 className="px-5 pb-2 pt-5 text-xs font-semibold text-brand-muted">{section.title}</h3>
                                        <div className="grid sm:grid-cols-2">
                                            {section.items.map(item => {
                                                const Icon = item.icon;
                                                return (
                                                    <Link key={item.href} href={item.href} className="group flex min-h-20 items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none">
                                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-brand-muted transition-colors group-hover:text-white">
                                                            <Icon className="h-5 w-5" />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-sm font-bold text-white">{item.title}</span>
                                                            <span className="mt-0.5 block truncate text-xs text-brand-muted">{item.description}</span>
                                                        </span>
                                                        <ChevronRight className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </main>

                    <aside aria-labelledby="achievements-title" className="rounded-2xl bg-brand-surface p-5 lg:sticky lg:top-36">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Medal className="h-5 w-5 text-brand-amber" />
                                <h2 id="achievements-title" className="font-bold text-white">Medalhas</h2>
                            </div>
                            <span className="text-sm font-bold tabular-nums text-brand-muted">{achievements.length}</span>
                        </div>

                        {achievements.length > 0 ? (
                            <ul className="mt-5 space-y-1">
                                {achievements.slice(0, 6).map((badge, index) => (
                                    <li key={badge.id || `${badge.name}-${index}`} className="flex items-center gap-3 rounded-xl px-2 py-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-amber/10 text-lg" aria-hidden="true">{badge.icon || <Trophy className="h-4 w-4 text-brand-amber" />}</span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-white">{badge.name}</span>
                                            <span className="block text-xs text-brand-muted">{new Date(badge.unlockedAt).toLocaleDateString('pt-BR')}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="mt-5 border-t border-white/10 py-8 text-center">
                                <Trophy className="mx-auto h-7 w-7 text-brand-muted" />
                                <p className="mt-3 text-sm font-semibold text-white">Sua primeira medalha está a caminho</p>
                                <p className="mt-1 text-xs leading-5 text-brand-muted">Participe de compras e leilões para desbloquear conquistas.</p>
                            </div>
                        )}

                        <Link href="/minha-conta/perfil" className="mt-3 flex min-h-11 items-center justify-between border-t border-white/10 pt-4 text-sm font-semibold text-brand-muted transition-colors hover:text-white">
                            Ver perfil público
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </aside>
                </div>
            </div>
        </div>
    );
}
