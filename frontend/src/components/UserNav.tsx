'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

import type { CartItem } from '@/context/CartContext';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';

export default function UserNav() {
    const [user, setUser] = useState<User | null>(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [creditBalance, setCreditBalance] = useState(0);
    const [creditLocked, setCreditLocked] = useState(0);
    const { items, setIsOpen } = useCart();

    const cartItemCount = items.reduce((acc: number, item: CartItem) => acc + item.quantity, 0);

    const fetchBalances = async (userId: string) => {
        const [walletRes, creditRes] = await Promise.all([
            supabase.from('wallets').select('balance').eq('user_id', userId).single(),
            supabase.from('auction_credits').select('balance, locked').eq('user_id', userId).single(),
        ]);

        if (walletRes.data) setWalletBalance(walletRes.data.balance);
        if (creditRes.data) {
            setCreditBalance(creditRes.data.balance);
            setCreditLocked(creditRes.data.locked);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                await fetchBalances(session.user.id);
            }
        };

        void initAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setUser(session.user);
                void fetchBalances(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setWalletBalance(0);
                setCreditBalance(0);
                setCreditLocked(0);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const availableCredits = creditBalance - creditLocked;

    return (
        <div className="flex items-center gap-2 sm:gap-3">
            {user?.email === 'admin@tcghub.com.br' && (
                <Link href="/estoque" className="hidden rounded-full border border-white/80 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 transition-all hover:border-rose-100 hover:text-rose-600 lg:block">
                    Admin
                </Link>
            )}

            {user && (
                <div className="hidden h-11 items-center rounded-xl border border-rose-100 bg-rose-50 px-4 sm:flex" title="Seu saldo de Cashback">
                    <span className="mr-2 text-[9px] font-black uppercase tracking-[0.2em] text-rose-600">Cashback</span>
                    <span className="text-xs font-black text-slate-900">R$ {walletBalance.toFixed(2).replace('.', ',')}</span>
                </div>
            )}

            {user && (
                <Link href="/minha-conta/creditos" className="hidden h-11 items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 transition-all hover:bg-amber-100 sm:flex" title="Creditos para Leilao">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">Creditos</span>
                    <span className="text-xs font-black text-slate-900">R$ {availableCredits.toFixed(2).replace('.', ',')}</span>
                </Link>
            )}

            <Link href={user ? (user.email === 'admin@tcghub.com.br' ? '/admin/vendas' : '/minha-conta') : '/auth/login'} className="flex h-11 items-center rounded-xl border border-white/80 bg-white/80 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.55)] transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600">
                {user ? (user.email === 'admin@tcghub.com.br' ? 'Pedidos' : 'Minha Conta') : 'Entrar'}
            </Link>

            {user && (
                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = '/';
                    }}
                    className="flex h-11 items-center rounded-xl border border-transparent px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                    title="Sair"
                >
                    Sair
                </button>
            )}

            <button
                onClick={() => setIsOpen(true)}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-[0_14px_30px_-22px_rgba(15,23,42,0.55)] transition-colors hover:bg-rose-600"
                title="Sacola de Compras"
            >
                <span className="text-lg">🛒</span>
                {cartItemCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-[10px] font-bold text-slate-950">
                        {cartItemCount}
                    </span>
                )}
            </button>
        </div>
    );
}
