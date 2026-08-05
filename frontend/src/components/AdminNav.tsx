'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { 
  BarChart3, 
  Settings, 
  RefreshCcw, 
  Radio, 
  Home,
  LogOut,
  Package,
  ShieldAlert,
  Flag
} from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { id: 'vendas', label: 'Vendas', href: '/admin/vendas', icon: BarChart3 },
  { id: 'riscos', label: 'Antifraude', href: '/admin/riscos', icon: ShieldAlert },
  { id: 'denuncias', label: 'Denúncias', href: '/admin/denuncias', icon: Flag },
  { id: 'live', label: 'Live Dashboard', href: '/admin/live', icon: Radio },
  { id: 'estoque', label: 'Meu Estoque', href: '/minha-conta/inventario', icon: Package },
  { id: 'sync', label: 'Sincronização', href: '/admin/sync', icon: RefreshCcw },
  { id: 'configuracoes', label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0c1324] border-r border-white/5 hidden lg:flex flex-col z-[110]">
        {/* Header */}
        <div className="p-8 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.3)] group-hover:scale-105 transition-transform">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-tighter text-white">Admin <span className="text-rose-600">Hub</span></span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">TCG MEGASTORE</span>
            </div>
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname.includes(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`relative flex items-center gap-3 px-5 py-4 rounded-2xl transition-all group ${
                  isActive 
                    ? 'bg-rose-600/10 text-white border border-rose-500/20 shadow-[0_0_20px_rgba(225,29,72,0.05)]' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-nav-active"
                    className="absolute left-0 w-1 h-6 bg-rose-600 rounded-full"
                    initial={false}
                  />
                )}
                <Icon className={`h-5 w-5 transition-colors ${isActive ? 'text-rose-500' : 'group-hover:text-slate-300'}`} />
                <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 space-y-4">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                      <span className="text-[10px] font-black text-white">AD</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white uppercase">Admin</span>
                      <span className="text-[8px] font-bold text-slate-500">admin@tcghub.com.br</span>
                  </div>
              </div>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full h-12 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation for Admin */}
      <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-white/10 bg-[#0c1324]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <nav className="mx-auto flex h-16 max-w-lg items-center gap-1 overflow-x-auto overscroll-x-contain px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Navegação administrativa">
            <Link href="/" aria-label="Voltar para a loja" title="Loja" className="flex h-12 min-w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
              <Home className="h-5 w-5" />
              <span className="text-[8px] font-bold">Loja</span>
            </Link>
            {navItems.map(item => {
                const isActive = pathname.includes(item.href);
                const Icon = item.icon;
                const mobileItemClass = isActive
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white';
                return (
                    <Link key={item.id} href={item.href} aria-label={item.label} title={item.label} aria-current={isActive ? 'page' : undefined} className={`relative flex h-12 min-w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${mobileItemClass}`}>
                        <Icon className="h-5 w-5" />
                        <span className="max-w-12 truncate px-0.5 text-[8px] font-bold">{item.label}</span>
                        {isActive && <span className="absolute -top-2 h-0.5 w-7 rounded-full bg-rose-400" />}
                    </Link>
                )
            })}
        </nav>
      </div>
    </>
  );
}
