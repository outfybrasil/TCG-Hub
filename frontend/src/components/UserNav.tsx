'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ShoppingCart, Bell, User as UserIcon, LogOut, Settings } from 'lucide-react';

import type { CartItem } from '@/context/CartContext';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { Link } from '@/i18n/routing';

export default function UserNav() {
    const [user, setUser] = useState<User | null>(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const { items, setIsOpen } = useCart();

    const cartItemCount = items.reduce((acc: number, item: CartItem) => acc + item.quantity, 0);

    const fetchUnreadCount = async (userId: string) => {
        const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);
        setUnreadCount(count ?? 0);
    };

    const fetchBalances = async (userId: string) => {
        const [walletRes] = await Promise.all([
            supabase.from('wallets').select('balance').eq('user_id', userId).single(),
        ]);
        if (walletRes.data) setWalletBalance(walletRes.data.balance);
    };

    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error && error.message.includes('Refresh Token Not Found')) {
                    await supabase.auth.signOut();
                    setUser(null);
                    return;
                }

                if (session?.user) {
                    setUser(session.user);
                    if (session.user.email !== 'admin@tcghub.com.br') {
                        await fetchBalances(session.user.id);
                        await fetchUnreadCount(session.user.id);

                        // Realtime: atualiza badge quando chega notificação nova
                        channelRef.current = supabase
                            .channel('user-nav-notifications')
                            .on('postgres_changes', {
                                event: '*',
                                schema: 'public',
                                table: 'notifications',
                                filter: `user_id=eq.${session.user.id}`,
                            }, () => { void fetchUnreadCount(session.user.id); })
                            .subscribe();
                    }
                }
            } catch (err) {
                console.error('[UserNav] Error initializing auth:', err);
            }
        };

        void initAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setUser(session.user);
                if (session.user.email !== 'admin@tcghub.com.br') {
                    void fetchBalances(session.user.id);
                    void fetchUnreadCount(session.user.id);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setWalletBalance(0);
                setUnreadCount(0);
                channelRef.current?.unsubscribe();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
            channelRef.current?.unsubscribe();
        };
    }, []);

    const isAdmin = user?.email === 'admin@tcghub.com.br';

    return (
        <div className="flex items-center gap-3">
            {/* Saldo cashback */}
            {user && !isAdmin && (
                <div className="hidden lg:flex items-center gap-2 mr-2">
                    <div className="h-10 px-3 flex flex-col justify-center rounded-xl bg-white/5 border border-white/10" title="Cashback">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 leading-none">Cashback</span>
                        <span className="text-xs font-black text-rose-500">R$ {walletBalance.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
            )}

            {/* Notificações com badge real */}
            {user && !isAdmin && (
                <Link
                    href="/notificacoes"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    title="Notificações"
                >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 border-2 border-[#0c1324] text-[9px] font-black text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Link>
            )}

            {/* Cart */}
            <button
                onClick={() => setIsOpen(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white shadow-[0_4px_14px_rgba(225,29,72,0.4)] transition-transform hover:scale-105"
                title="Sacola de Compras"
            >
                <ShoppingCart className="h-4 w-4" />
                {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0c1324] bg-white text-[9px] font-black text-rose-600">
                        {cartItemCount}
                    </span>
                )}
            </button>

            {/* Profile Dropdown Trigger (Mocked as Link for now) */}
            {user ? (
                <div className="flex items-center gap-2 ml-2">
                    {isAdmin ? (
                        <Link href="/admin/vendas" className="flex h-10 items-center gap-2 rounded-full bg-rose-600 px-4 transition-all hover:bg-rose-700 shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white">
                                <Settings className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-white">
                                Painel Admin
                            </span>
                        </Link>
                    ) : (
                        <Link href="/minha-conta" className="flex h-10 items-center gap-2 rounded-full bg-white/5 border border-white/10 pl-2 pr-4 transition-colors hover:bg-white/10">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
                                <UserIcon className="h-4 w-4" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                                Conta
                            </span>
                        </Link>
                    )}
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/';
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                        title="Sair"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <Link href="/auth/login" className="ml-2 flex h-10 items-center rounded-full bg-white text-slate-900 px-6 text-[11px] font-black uppercase tracking-wider transition-transform hover:scale-105">
                    Entrar
                </Link>
            )}
        </div>
    );
}
