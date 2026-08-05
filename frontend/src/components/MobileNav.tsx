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
        if (error?.message.includes('Refresh Token Not Found')) {
          await supabase.auth.signOut();
          setIsAdmin(false);
          return;
        }
        setIsAdmin(session?.user?.email === 'admin@tcghub.com.br');
      } catch {
        // silent
      }
    };

    void checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(session?.user?.email === 'admin@tcghub.com.br');
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const navItems = isAdmin
    ? [
        { label: 'Loja',     icon: '🃏', href: '/marketplace' },
        { label: 'Leilões',  icon: '⚡', href: '/leilao' },
        { label: 'Vendas',   icon: '📦', href: '/admin/vendas' },
        { label: 'Estoque',  icon: '📋', href: '/estoque' },
      ]
    : [
        { label: 'Loja',     icon: '🃏', href: '/marketplace' },
        { label: 'Leilões',  icon: '⚡', href: '/leilao' },
        { label: 'Conta',    icon: '👤', href: '/minha-conta' },
        { label: 'Preços',   icon: '📈', href: '/precos' },
      ];

  return (
    <nav
      className="fixed bottom-4 left-4 right-4 z-[100] lg:hidden"
      style={{
        background: 'rgba(25,31,49,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1.5rem',
        boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6)',
      }}
    >
      <div className="flex items-center justify-around px-3 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-w-[68px] flex-col items-center justify-center rounded-xl px-3 py-2 transition-all"
              style={{
                background: isActive ? 'rgba(225,29,72,0.15)' : 'transparent',
                color: isActive ? '#ffb3b6' : '#8b95b5',
              }}
            >
              <span
                className={`text-lg transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}
              >
                {item.icon}
              </span>
              <span className="mt-0.5 text-[9px] font-black uppercase tracking-[0.15em]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
