'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/routing';
import { Bell, CheckCheck, ShoppingCart, Gavel, Package, Star, ChevronRight, Trash2 } from 'lucide-react';

type NotifType = 'pedido' | 'leilao' | 'promo' | 'sistema';

interface Notification {
    id: string;
    type: NotifType;
    title: string;
    body: string;
    time: string;
    read: boolean;
    href?: string;
}

const ICON_MAP: Record<NotifType, React.ReactNode> = {
    pedido: <ShoppingCart className="h-5 w-5 text-blue-400" />,
    leilao: <Gavel className="h-5 w-5 text-amber-400" />,
    promo: <Star className="h-5 w-5 text-rose-400" />,
    sistema: <Bell className="h-5 w-5 text-slate-400" />,
};

const BG_MAP: Record<NotifType, string> = {
    pedido: 'bg-blue-500/10 border-blue-500/20',
    leilao: 'bg-amber-500/10 border-amber-500/20',
    promo: 'bg-rose-500/10 border-rose-500/20',
    sistema: 'bg-white/5 border-white/10',
};

const INITIAL: Notification[] = [
    { id: '1', type: 'pedido', title: 'Pedido enviado!', body: 'Seu pedido #TCG-1042 foi despachado. Previsão: 2-4 dias úteis.', time: 'Agora', read: false, href: '/minha-conta/pedidos' },
    { id: '2', type: 'leilao', title: 'Você foi superado!', body: 'Outro usuário deu um lance maior no Pikachu ex FA. Lance atual: R$ 420,00.', time: '5min atrás', read: false, href: '/leilao' },
    { id: '3', type: 'promo', title: 'Novos itens no Marketplace', body: '12 novas cartas foram adicionadas ao catálogo. Confira antes que esgotem!', time: '1h atrás', read: true, href: '/marketplace' },
    { id: '4', type: 'leilao', title: 'Leilão encerrado — Você venceu! 🎉', body: 'Você arrematou o Charizard ex por R$ 890,00. Efetue o pagamento para confirmar.', time: '3h atrás', read: true, href: '/minha-conta/arremates' },
    { id: '5', type: 'sistema', title: 'Boas-vindas à TCG Hub!', body: 'Sua conta foi criada com sucesso. Explore o marketplace e os leilões ao vivo.', time: '2d atrás', read: true },
];

export default function NotificacoesPage() {
    const [notifs, setNotifs] = useState<Notification[]>(INITIAL);
    const [filter, setFilter] = useState<'todas' | 'nao-lidas'>('todas');

    const unreadCount = notifs.filter(n => !n.read).length;

    const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const remove = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));

    const filtered = filter === 'nao-lidas' ? notifs.filter(n => !n.read) : notifs;

    return (
        <div className="min-h-screen pb-20" style={{ background: '#0c1324' }}>
            <div className="page-frame py-10 max-w-3xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Notificações</h1>
                        {unreadCount > 0 && (
                            <p className="mt-1 text-sm" style={{ color: '#8b95b5' }}>
                                {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                            </p>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                            <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
                        </button>
                    )}
                </div>

                {/* Filter */}
                <div className="flex gap-2">
                    {(['todas', 'nao-lidas'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                                filter === f ? 'bg-rose-600 text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                            }`}>
                            {f === 'todas' ? 'Todas' : 'Não lidas'}
                        </button>
                    ))}
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center">
                        <Bell className="h-12 w-12 text-white/10" />
                        <p className="text-xl font-black text-white">Nenhuma notificação</p>
                        <p className="text-sm" style={{ color: '#8b95b5' }}>Você está em dia com tudo!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(n => (
                            <div key={n.id} className={`group relative flex gap-4 rounded-2xl border p-5 transition-all ${BG_MAP[n.type]} ${!n.read ? 'opacity-100' : 'opacity-70'}`}>
                                {/* Unread dot */}
                                {!n.read && <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-rose-500" />}

                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${BG_MAP[n.type]}`}>
                                    {ICON_MAP[n.type]}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-white">{n.title}</p>
                                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: '#8b95b5' }}>{n.body}</p>
                                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>{n.time}</p>
                                </div>

                                <div className="flex flex-col gap-2 shrink-0">
                                    {n.href && (
                                        <Link href={n.href} onClick={() => markRead(n.id)}
                                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    )}
                                    <button onClick={() => remove(n.id)}
                                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
