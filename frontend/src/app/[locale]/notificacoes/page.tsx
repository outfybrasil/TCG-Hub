'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell, CheckCheck, ShoppingCart, Gavel, Package,
  Star, ChevronRight, Trash2, Zap
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

type NotifType = 'leilao_ganho' | 'lance_superado' | 'pedido_confirmado' | 'pedido_enviado' | 'sistema' | 'promo';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; bg: string; badge: string }> = {
  leilao_ganho: {
    icon: <Gavel className="h-5 w-5 text-amber-400" />,
    bg: 'bg-amber-500/10 border-amber-500/20',
    badge: 'bg-amber-500',
  },
  lance_superado: {
    icon: <Zap className="h-5 w-5 text-rose-400" />,
    bg: 'bg-rose-500/10 border-rose-500/20',
    badge: 'bg-rose-500',
  },
  pedido_confirmado: {
    icon: <ShoppingCart className="h-5 w-5 text-blue-400" />,
    bg: 'bg-blue-500/10 border-blue-500/20',
    badge: 'bg-blue-500',
  },
  pedido_enviado: {
    icon: <Package className="h-5 w-5 text-emerald-400" />,
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    badge: 'bg-emerald-500',
  },
  sistema: {
    icon: <Bell className="h-5 w-5 text-slate-400" />,
    bg: 'bg-white/5 border-white/10',
    badge: 'bg-slate-500',
  },
  promo: {
    icon: <Star className="h-5 w-5 text-rose-400" />,
    bg: 'bg-rose-500/10 border-rose-500/20',
    badge: 'bg-rose-500',
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export default function NotificacoesPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'nao-lidas'>('todas');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const res = await fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setNotifs(json.notifications ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchNotifications();

    // Realtime: recebe novas notificações sem precisar de F5
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      channelRef.current = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            setNotifs(prev => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();
    };

    void setupRealtime();
    return () => { channelRef.current?.unsubscribe(); };
  }, [fetchNotifications]);

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const remove = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifs.filter(n => !n.read).length;
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
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {(['todas', 'nao-lidas'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                filter === f
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'todas' ? 'Todas' : `Não lidas${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center">
              <Bell className="h-10 w-10 text-white/10" />
            </div>
            <p className="text-xl font-black text-white">Nenhuma notificação</p>
            <p className="text-sm" style={{ color: '#8b95b5' }}>Você está em dia com tudo!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-2">
              {filtered.map(n => {
                const cfg = TYPE_CONFIG[n.type];
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.2 }}
                    className={`group relative flex gap-4 rounded-2xl border p-5 transition-all ${cfg.bg} ${!n.read ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                  >
                    {/* Dot não lida */}
                    {!n.read && (
                      <span className={`absolute top-4 right-4 h-2 w-2 rounded-full ${cfg.badge}`} />
                    )}

                    {/* Ícone */}
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${cfg.bg}`}>
                      {cfg.icon}
                    </div>

                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: '#8b95b5' }}>{n.body}</p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {n.href && (
                        <Link
                          href={n.href}
                          onClick={() => { if (!n.read) void markRead(n.id); }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => void remove(n.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
