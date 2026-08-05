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

      {/* Mobile Top Bar for Admin */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0c1324] border-b border-white/5 flex items-center justify-between px-6 z-[110]">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 bg-rose-600 rounded-lg flex items-center justify-center">
            <Home className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-black uppercase text-white">Admin <span className="text-rose-600">Hub</span></span>
        </Link>
        <div className="flex gap-2">
            {navItems.map(item => {
                const isActive = pathname.includes(item.href);
                const Icon = item.icon;
                return (
                    <Link key={item.id} href={item.href} className={`p-2 rounded-lg ${isActive ? 'bg-rose-600 text-white' : 'text-slate-500'}`}>
                        <Icon className="h-4 w-4" />
                    </Link>
                )
            })}
        </div>
      </div>
    </>
  );
}
