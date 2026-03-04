'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function UserNav() {
    const [user, setUser] = useState<any>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const { items, setIsOpen } = useCart();

    // Calcula badge
    const cartItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

    useEffect(() => {
        // Fetch session on mount
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUser(user);
                supabase.from('wallets').select('balance').eq('user_id', user.id).single()
                    .then(({ data }) => {
                        if (data) setWalletBalance(data.balance);
                    });
            }
        });

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setUser(session.user);
                supabase.from('wallets').select('balance').eq('user_id', session.user.id).single()
                    .then(({ data }) => {
                        if (data) setWalletBalance(data.balance);
                    });
            } else {
                setUser(null);
                setWalletBalance(0);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    return (
        <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/suporte" className="hidden sm:block text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
                Suporte
            </Link>

            {user && (
                <div className="hidden sm:flex items-center h-11 px-4 bg-rose-50 border border-rose-100 rounded-xl" title="Seu saldo de Cashback">
                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest mr-2">Cashback</span>
                    <span className="text-xs font-black text-slate-900">R$ {walletBalance.toFixed(2).replace('.', ',')}</span>
                </div>
            )}

            <button
                onClick={() => setIsOpen(true)}
                className="relative h-11 w-11 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors"
                title="Sacola de Compras"
            >
                <span className="text-lg">🛒</span>
                {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {cartItemCount}
                    </span>
                )}
            </button>

            {user && (
                <Link href="/minha-conta/pedidos" className="hidden sm:flex h-11 px-4 bg-slate-50 text-slate-600 items-center text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all rounded-xl border border-slate-100">
                    Pedidos
                </Link>
            )}

            <Link href="/membro" className="h-11 px-6 bg-slate-100 text-slate-900 flex items-center text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all rounded-xl">
                {user ? 'Minha Conta' : 'Entrar'}
            </Link>
        </div>
    );
}
