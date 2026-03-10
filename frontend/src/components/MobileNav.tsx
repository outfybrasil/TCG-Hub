"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MobileNav() {
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsAdmin(session?.user?.email === 'admin@tcghub.com.br');
        };

        checkUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setIsAdmin(session?.user?.email === 'admin@tcghub.com.br');
        });

        return () => { authListener.subscription.unsubscribe(); };
    }, []);

    let navItems = [
        { label: 'Loja', icon: '🃏', href: '/marketplace' },
        { label: 'Leilões', icon: '⚡', href: '/leilao' },
        { label: 'Conta', icon: '👤', href: '/minha-conta' },
        { label: 'Suporte', icon: '💬', href: '/suporte' },
    ];

    if (isAdmin) {
        navItems = [
            { label: 'Loja', icon: '🃏', href: '/marketplace' },
            { label: 'Leilões', icon: '⚡', href: '/leilao' },
            { label: 'Vendas', icon: '📦', href: '/admin/vendas' },
            { label: 'Estoque', icon: '📋', href: '/estoque' },
        ];
    }

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-[100] pb-safe-area-inset-bottom">
            <div className="flex items-center justify-around h-20 px-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center space-y-1 group transition-all ${isActive ? 'text-rose-600 scale-110' : 'text-slate-400'
                                }`}
                        >
                            <span className={`text-xl transition-transform group-hover:scale-110 ${isActive ? 'animate-bounce-subtle' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
