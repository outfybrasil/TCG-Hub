'use client';

import React, { useState } from 'react';
import { ShoppingCart, Shield, BookOpen, Layers, Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const CATEGORIES = ['Todos', 'Sleeves', 'Pastas', 'Deck Box', 'Tapetes', 'Dados'];

const ACCESSORIES = [
    { id: 'sleeve-dragon', name: 'Sleeves Dragon Shield Classic', description: 'Proteção premium para suas cartas. Pack com 100 unidades.', price: 79.90, category: 'Sleeves', badge: 'TOP', badgeColor: 'bg-blue-500', icon: Shield },
    { id: 'sleeve-ultimate', name: 'Ultimate Guard Sleeves', description: 'Sleeves profissionais. 80 unidades por pack.', price: 89.90, category: 'Sleeves', badge: null, badgeColor: '', icon: Shield },
    { id: 'pasta-ultra-pro', name: 'Ultra Pro 9-Pocket Binder', description: 'Pasta com 9 bolsos por página. 360 cartas no total.', price: 149.90, category: 'Pastas', badge: 'DESTAQUE', badgeColor: 'bg-rose-600', icon: BookOpen },
    { id: 'pasta-pokemon', name: 'Álbum Oficial Pokémon', description: 'Pasta oficial com arte de Pokémon. 180 cartas.', price: 99.90, category: 'Pastas', badge: null, badgeColor: '', icon: BookOpen },
    { id: 'deckbox-dragon', name: 'Dragon Shield Deck Shell', description: 'Deck box rígido para 100 cartas ensleevadas.', price: 59.90, category: 'Deck Box', badge: null, badgeColor: '', icon: Layers },
    { id: 'deckbox-ultimate', name: 'Ultimate Guard Twin Flip', description: 'Deck box dupla. Magnética.', price: 119.90, category: 'Deck Box', badge: 'NOVO', badgeColor: 'bg-emerald-500', icon: Layers },
    { id: 'tapete-oficial', name: 'Tapete de Batalha Oficial', description: 'Tapete de neoprene 60x35cm com arte oficial.', price: 189.90, category: 'Tapetes', badge: 'EXCLUSIVO', badgeColor: 'bg-amber-500', icon: Star },
    { id: 'dados-pack', name: 'Pack de Dados para TCG', description: 'Kit com 10 dados em acrílico colorido.', price: 39.90, category: 'Dados', badge: null, badgeColor: '', icon: Star },
];

export default function AcessoriosPage() {
    const { addItem } = useCart();
    const [activeCategory, setActiveCategory] = useState('Todos');

    const filtered = activeCategory === 'Todos'
        ? ACCESSORIES
        : ACCESSORIES.filter(a => a.category === activeCategory);

    return (
        <div className="min-h-screen pb-20" style={{ background: '#0c1324' }}>
            <section className="relative overflow-hidden border-b border-white/5 py-16">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute right-1/4 top-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
                </div>
                <div className="page-frame relative space-y-4">
                    <div className="eyebrow">Proteção &amp; Organização</div>
                    <h1 className="font-black text-white" style={{ fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.03em', lineHeight: 0.9 }}>
                        Acessórios<br /><span style={{ color: '#e11d48' }}>Premium</span>
                    </h1>
                    <p className="max-w-xl text-sm" style={{ color: '#8b95b5' }}>
                        Sleeves, pastas, deck boxes, tapetes e tudo para proteger sua coleção.
                    </p>
                </div>
            </section>

            <section className="page-frame py-8">
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)}
                            className={`rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                                activeCategory === cat
                                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                                    : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                            }`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </section>

            <section className="page-frame">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {filtered.map((acc) => {
                        const Icon = acc.icon;
                        return (
                            <div key={acc.id} className="card-product group relative flex flex-col">
                                {acc.badge && (
                                    <span className={`absolute top-3 left-3 z-10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white ${acc.badgeColor}`}>
                                        {acc.badge}
                                    </span>
                                )}
                                <div className="flex aspect-square items-center justify-center rounded-t-[1.25rem] bg-white/[0.03]">
                                    <Icon className="h-20 w-20 text-white/10 transition-all duration-500 group-hover:text-white/20 group-hover:scale-110" />
                                </div>
                                <div className="flex flex-1 flex-col p-5 gap-3">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>{acc.category}</p>
                                        <h3 className="mt-1 text-sm font-black text-white leading-tight">{acc.name}</h3>
                                        <p className="mt-1 text-xs" style={{ color: '#8b95b5' }}>{acc.description}</p>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
                                        <span className="text-lg font-black" style={{ color: '#f59e0b' }}>
                                            R$ {acc.price.toFixed(2).replace('.', ',')}
                                        </span>
                                        <button
                                            onClick={() => addItem({ id: acc.id, name: acc.name, price: acc.price, imageUrl: '' })}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white transition-transform hover:scale-110">
                                            <ShoppingCart className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
