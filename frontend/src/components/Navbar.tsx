'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, List, TrendingUp, Eye, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import UserNav from '@/components/UserNav';
import GlobalSearchBar from '@/components/GlobalSearchBar';

export default function Navbar() {
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  const menuItems = [
    { id: 'cartas', label: 'Cartas', hasMegaMenu: true },
    { id: 'precos', label: 'Preços', hasMegaMenu: false, href: '/precos' },
    { id: 'leilao', label: 'Leilões', hasMegaMenu: false, href: '/leilao' },
    { id: 'lives', label: 'Ao Vivo', hasMegaMenu: false, href: '/lives', isLive: true },
    { id: 'produtos', label: 'Produtos', hasMegaMenu: false, href: '/produtos' },
    { id: 'acessorios', label: 'Acessórios', hasMegaMenu: false, href: '/acessorios' },
    { id: 'comunidade', label: 'Comunidade', hasMegaMenu: false, href: '/comunidade' },
    { id: 'vender', label: 'Vender', hasMegaMenu: false, href: '/vender', isSell: true },
  ];

  return (
    <nav className="sticky top-0 z-[100] w-full" onMouseLeave={() => setHoveredMenu(null)}>
      {/* 1. Top Bar */}
      <div className="bg-[#0c1324] border-b border-white/5 relative z-20">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-6 gap-8">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80 shrink-0">
            <Image
              src="/tcg-icon.png"
              alt="TCG MEGASTORE"
              width={56}
              height={56}
              className="object-contain"
            />
            <span className="hidden lg:flex items-center text-xl font-black uppercase tracking-tighter text-white">
              TCG<span style={{ color: '#e11d48' }}>MEGASTORE</span>
              <span className="ml-1 h-1.5 w-1.5 rounded-full" style={{ background: '#e11d48' }} />
            </span>
          </Link>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-2xl hidden md:block">
            <GlobalSearchBar />
          </div>

          {/* User & Cart Icons */}
          <div className="shrink-0">
            <UserNav />
          </div>
        </div>
      </div>

      {/* 2. Sub Bar (Categories) */}
      <div className="bg-[#12192a]/95 backdrop-blur-md border-b border-white/5 relative z-10 shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-1">
          {menuItems.map((item) => (
            <div 
              key={item.id}
              className="h-full"
              onMouseEnter={() => setHoveredMenu(item.hasMegaMenu ? item.id : null)}
            >
              {item.href ? (
                <Link 
                  href={item.href}
                  className={`h-full px-5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-t-lg ${
                    (item as any).isSell
                      ? 'text-brand-rose hover:text-white hover:bg-brand-rose/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {(item as any).isSell && <span className="mr-0.5 text-brand-rose">+</span>}
                  {item.label}
                  {(item as any).isLive && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                  )}
                </Link>
              ) : (
                <button
                  className={`h-full px-5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-t-lg ${
                    hoveredMenu === item.id 
                      ? 'text-white bg-white/5 border-b-2 border-rose-600' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                  {item.hasMegaMenu && (
                    <ChevronDown className={`h-3 w-3 transition-transform ${hoveredMenu === item.id ? 'rotate-180 text-rose-500' : ''}`} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Mega Menu Panel */}
      <AnimatePresence>
        {hoveredMenu === 'cartas' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 w-full bg-[#151c2f]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl z-0"
            onMouseEnter={() => setHoveredMenu('cartas')}
            onMouseLeave={() => setHoveredMenu(null)}
          >
            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-4 gap-8">
              
              {/* Column 1 */}
              <Link href="/edicoes" className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
                <div className="h-10 w-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-black text-white mb-2 tracking-tight group-hover:text-blue-400 transition-colors">Edições</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Cada carta tem sua coleção. Veja as edições completas e explore sets.</p>
              </Link>


              {/* Column 2 */}
              <Link href="/precos" className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all">
                <div className="h-10 w-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <List className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-black text-white mb-2 tracking-tight group-hover:text-rose-400 transition-colors">Compra por Lista</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Monte sua lista de compras de forma rápida colando a decklist.</p>
              </Link>

              {/* Column 3 */}
              <Link href="/marketplace" className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-black text-white mb-2 tracking-tight group-hover:text-amber-400 transition-colors">Cartas em Alta</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Acompanhe a valorização das cartas mais procuradas do momento.</p>
              </Link>

              {/* Column 4 */}
              <Link href="/marketplace" className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Eye className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-black text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">Cartas Mais Vistas</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Fique de olho nas cartas que estão chamando mais atenção hoje.</p>
              </Link>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
