'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function MobileNav() {
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error && error.message.includes('Refresh Token Not Found')) {
                    console.warn('[MobileNav] Stale session detected, clearing...');
                    await supabase.auth.signOut();
                    setIsAdmin(false);
                    return;
                }

                setIsAdmin(session?.user?.email === 'admin@tcghub.com.br');
            } catch (err) {
                console.error('[MobileNav] Auth check error:', err);
            }
        };

        void checkUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAdmin(session?.user?.email === 'admin@tcghub.com.br');
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const navItems = isAdmin
        ? [
            { label: 'Loja', icon: '🃏', href: '/marketplace' },
            { label: 'Leiloes', icon: '⚡', href: '/leilao' },
            { label: 'Vendas', icon: '📦', href: '/admin/vendas' },
            { label: 'Estoque', icon: '📋', href: '/estoque' },
        ]
        : [
            { label: 'Loja', icon: '🃏', href: '/marketplace' },
            { label: 'Leiloes', icon: '⚡', href: '/leilao' },
            { label: 'Conta', icon: '👤', href: '/minha-conta' },
            { label: 'Suporte', icon: '💬', href: '/suporte' },
        ];

    return (
        <nav className="fixed bottom-4 left-4 right-4 z-[100] rounded-[1.75rem] border border-white/70 bg-white/86 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-around px-3 py-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex min-w-[68px] flex-col items-center justify-center rounded-2xl px-3 py-2 transition-all ${isActive ? 'bg-rose-50 text-rose-600' : 'text-slate-400'
                                }`}
                        >
                            <span className={`text-lg transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[0.18em]">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
