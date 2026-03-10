'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import type { User } from '@supabase/supabase-js';

export default function UserNav() {
    const [user, setUser] = useState<User | null>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [creditBalance, setCreditBalance] = useState<number>(0);
    const [creditLocked, setCreditLocked] = useState<number>(0);
    const [hasMounted, setHasMounted] = useState(false);
    const { items, setIsOpen } = useCart();

    const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

    const fetchBalances = async (userId: string) => {
        const [walletRes, creditRes] = await Promise.all([
            supabase.from('wallets').select('balance').eq('user_id', userId).single(),
            supabase.from('auction_credits').select('balance, locked').eq('user_id', userId).single()
        ]);
        if (walletRes.data) setWalletBalance(walletRes.data.balance);
        if (creditRes.data) {
            setCreditBalance(creditRes.data.balance);
            setCreditLocked(creditRes.data.locked);
        }
    };

    useEffect(() => {
        setHasMounted(true);

        // Immediate session check
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                fetchBalances(session.user.id);
            }
        };

        initAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setUser(session.user);
                fetchBalances(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setWalletBalance(0);
                setCreditBalance(0);
                setCreditLocked(0);
            }
        });

        return () => { authListener.subscription.unsubscribe(); };
    }, []);

    const availableCredits = creditBalance - creditLocked;

    return (
        <div className="flex items-center space-x-2 sm:space-x-4">

            {user?.email === 'admin@tcghub.com.br' && (
                <Link href="/estoque" className="hidden lg:block text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-all">
                    Admin
                </Link>
            )}


            {user && (
                <div className="hidden sm:flex items-center h-11 px-4 bg-rose-50 border border-rose-100 rounded-xl" title="Seu saldo de Cashback">
                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest mr-2">Cashback</span>
                    <span className="text-xs font-black text-slate-900">R$ {walletBalance.toFixed(2).replace('.', ',')}</span>
                </div>
            )}

            {user && (
                <Link
                    href="/minha-conta/creditos"
                    className="hidden sm:flex h-11 px-4 items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-all"
                    title="Créditos para Leilão"
                >
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Créditos</span>
                    <span className="text-xs font-black text-slate-900">R$ {availableCredits.toFixed(2).replace('.', ',')}</span>
                </Link>
            )}

            <Link href={user ? (user.email === 'admin@tcghub.com.br' ? '/admin/vendas' : '/minha-conta') : '/auth/login'} className="h-11 px-6 bg-slate-100 text-slate-900 flex items-center text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all rounded-xl">
                {user ? (user.email === 'admin@tcghub.com.br' ? 'Pedidos' : 'Minha Conta') : 'Entrar'}
            </Link>

            {user && (
                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = '/';
                    }}
                    className="h-11 px-4 text-slate-400 flex items-center text-[10px] font-black uppercase tracking-widest hover:text-rose-600 transition-all rounded-xl border border-transparent hover:border-rose-100 hover:bg-rose-50"
                    title="Sair"
                >
                    Sair
                </button>
            )}

            <button
                onClick={() => setIsOpen(true)}
                className="relative h-11 w-11 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors"
                title="Sacola de Compras"
            >
                <span className="text-lg">🛒</span>
                {hasMounted && cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {cartItemCount}
                    </span>
                )}
            </button>
        </div>
    );
}
