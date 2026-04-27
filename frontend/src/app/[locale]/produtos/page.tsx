'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/routing';
import { ShoppingCart, Package, Star, Zap, Shield } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const PRODUCTS = [
    { id: 'sv-booster', name: 'Booster Escarlate e Violeta', description: 'Pacote com 10 cartas aleatórias do set mais recente.', price: 24.90, image: 'https://images.pokemontcg.io/sv1/logo.png', badge: 'NOVO', badgeColor: 'bg-emerald-500', category: 'Boosters' },
    { id: 'sv-etb', name: 'Elite Trainer Box - SV', description: 'Contém 9 boosters, card promoção, acessórios e mais.', price: 389.90, image: 'https://images.pokemontcg.io/sv1/logo.png', badge: 'DESTAQUE', badgeColor: 'bg-rose-600', category: 'Elite Trainer Box' },
    { id: 'sv4-booster', name: 'Booster Paradoxo Temporal', description: 'Explore as cartas do Paradoxo Temporal com novos Pokémon.', price: 26.90, image: 'https://images.pokemontcg.io/sv4/logo.png', badge: 'EM ALTA', badgeColor: 'bg-amber-500', category: 'Boosters' },
    { id: 'sv3pt5-booster', name: 'Booster 151', description: 'Os 151 Pokémon originais em formato moderno.', price: 29.90, image: 'https://images.pokemontcg.io/sv3pt5/logo.png', badge: 'CLÁSSICO', badgeColor: 'bg-blue-500', category: 'Boosters' },
];

const CATEGORY_ICONS = [
    { icon: Package, label: 'Boosters', description: 'Pacotes individuais e displays', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { icon: Star, label: 'Elite Trainer Box', description: 'Conjuntos premium completos', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { icon: Zap, label: 'Coleções Especiais', description: 'Edições limitadas e promos', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { icon: Shield, label: 'Decks de Batalha', description: 'Prontos para jogar', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
];

const ALL_CATEGORIES = ['Todos', 'Boosters', 'Elite Trainer Box', 'Coleções Especiais', 'Decks de Batalha'];

export default function ProdutosPage() {
    const { addItem } = useCart();
    const [activeCategory, setActiveCategory] = useState('Todos');

    const filtered = activeCategory === 'Todos'
        ? PRODUCTS
        : PRODUCTS.filter(p => p.category === activeCategory);

    return (
        <div className="min-h-screen pb-20" style={{ background: '#0c1324' }}>
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-white/5 py-16">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-rose-600/10 blur-3xl" />
                    <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
                </div>
                <div className="page-frame relative space-y-4">
                    <div className="eyebrow">Loja Oficial</div>
                    <h1 className="font-black text-white" style={{ fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.03em', lineHeight: 0.9 }}>
                        Produtos<br /><span style={{ color: '#e11d48' }}>TCG</span>
                    </h1>
                    <p className="max-w-xl text-sm" style={{ color: '#8b95b5' }}>
                        Boosters, Elite Trainer Boxes, decks de batalha e coleções especiais. Tudo com procedência garantida.
                    </p>
                </div>
            </section>

            {/* Category Filter Pills */}
            <section className="page-frame py-8">
                <div className="flex flex-wrap gap-2 mb-8">
                    {ALL_CATEGORIES.map(cat => (
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

                {/* Category Icon Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {CATEGORY_ICONS.map(({ icon: Icon, label, description, color, bg }) => (
                        <button key={label} onClick={() => setActiveCategory(label)}
                            className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:scale-[1.02] ${bg} ${activeCategory === label ? 'ring-1 ring-rose-500/40' : ''}`}>
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 ${color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white">{label}</p>
                                <p className="text-[10px]" style={{ color: '#8b95b5' }}>{description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Products Grid */}
            <section className="page-frame space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-white tracking-tight">Todos os Produtos</h2>
                    <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>{filtered.length} itens</span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {filtered.map((product) => (
                        <div key={product.id} className="card-product group relative flex flex-col">
                            <span className={`absolute top-3 left-3 z-10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white ${product.badgeColor}`}>
                                {product.badge}
                            </span>

                            <div className="relative aspect-square overflow-hidden rounded-t-[1.25rem] bg-white/5 flex items-center justify-center p-8">
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    loading="lazy"
                                    className="max-h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>

                            <div className="flex flex-1 flex-col p-5 gap-3">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>{product.category}</p>
                                    <h3 className="mt-1 text-sm font-black text-white leading-tight">{product.name}</h3>
                                    <p className="mt-1 text-xs" style={{ color: '#8b95b5' }}>{product.description}</p>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
                                    <span className="text-lg font-black" style={{ color: '#f59e0b' }}>
                                        R$ {product.price.toFixed(2).replace('.', ',')}
                                    </span>
                                    <button
                                        onClick={() => addItem({ id: product.id, name: product.name, price: product.price, imageUrl: product.image })}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white transition-transform hover:scale-110 hover:bg-rose-700"
                                    >
                                        <ShoppingCart className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Coming Soon CTA */}
                <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] py-16 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>Catálogo em expansão</p>
                    <h3 className="text-2xl font-black text-white tracking-tight">Mais produtos chegando em breve</h3>
                    <p className="max-w-md text-sm" style={{ color: '#8b95b5' }}>
                        Novidades toda semana. Siga a TCG Hub nas redes sociais para ser o primeiro a saber.
                    </p>
                    <Link href="/suporte" className="btn-primary" style={{ height: 44 }}>
                        Falar com suporte
                    </Link>
                </div>
            </section>
        </div>
    );
}
