'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, ChartNoAxesColumnIncreasing, Gavel, Package, Radio, ShoppingBag, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MobileNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sync = async () => { const { data } = await supabase.auth.getSession(); setIsAdmin(data.session?.user?.email === 'admin@tcghub.com.br'); };
    void sync();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setIsAdmin(session?.user?.email === 'admin@tcghub.com.br'));
    return () => data.subscription.unsubscribe();
  }, []);

  const navItems = isAdmin
    ? [
        { label: 'Loja', icon: ShoppingBag, href: '/marketplace' },
        { label: 'Leilões', icon: Gavel, href: '/leilao' },
        { label: 'Ao vivo', icon: Radio, href: '/lives', live: true },
        { label: 'Vendas', icon: Package, href: '/admin/vendas' },
        { label: 'Estoque', icon: Boxes, href: '/estoque' },
      ]
    : [
        { label: 'Loja', icon: ShoppingBag, href: '/marketplace' },
        { label: 'Leilões', icon: Gavel, href: '/leilao' },
        { label: 'Ao vivo', icon: Radio, href: '/lives', live: true },
        { label: 'Preços', icon: ChartNoAxesColumnIncreasing, href: '/precos' },
        { label: 'Conta', icon: User, href: '/minha-conta' },
      ];

  if (pathname.includes('/admin')) return null;

  return <nav className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-[#0b1120]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Navegação principal">
    <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1">
      {navItems.map(item => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition-colors ${active ? 'text-white' : 'text-slate-500'}`}>
          {item.live && <span className="absolute top-2 right-[calc(50%-13px)] h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,.8)]" />}
          <Icon className={`h-5 w-5 ${item.live && active ? 'text-rose-400' : ''}`} strokeWidth={active ? 2.4 : 1.8} />
          <span className="truncate">{item.label}</span>
          {active && <span className="absolute bottom-0 h-0.5 w-7 rounded-full bg-rose-500" />}
        </Link>;
      })}
    </div>
  </nav>;
}
