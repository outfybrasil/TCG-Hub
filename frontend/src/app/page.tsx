"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';

interface CardAsset {
  id: string;
  name: string;
  official_name?: string;
  set: string;
  official_set_name?: string;
  price: number;
  image_url: string;
  official_image_url?: string;
  grade?: string;
  finish?: string;
  quantity?: number;
}

export default function HomePage() {
  const { addItem } = useCart();
  const [featuredCards, setFeaturedCards] = useState<CardAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from('enriched_inventory')
        .select('*')
        .order('price', { ascending: false })
        .limit(4);

      if (data) {
        setFeaturedCards(data.map((card) => ({
          id: card.id,
          name: card.official_name ?? card.name,
          set: card.official_set_name ?? card.set,
          price: Number(card.price),
          image_url: card.official_image_url ?? card.image_url,
          grade: card.grade ?? 'MINT',
          finish: card.finish,
          quantity: card.quantity || 0,
        })));
      }

      setLoading(false);
    };

    void fetchFeatured();
  }, []);

  const heroCard = featuredCards[0];
  const highlights = featuredCards.slice(1);

  return (
    <div className="min-h-screen animate-fade-up bg-slate-950 text-slate-200">
      <section className="relative overflow-hidden px-6 pb-40 pt-32">
        <div className="absolute right-0 top-0 -z-10 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/3 rounded-full bg-rose-600/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] -translate-x-1/3 translate-y-1/3 rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute inset-0 -z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center gap-16 lg:flex-row">
          <div className="flex-1 space-y-8 tracking-tight text-center lg:text-left">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Estoque Premium Disponivel</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl font-black leading-[0.92] tracking-tighter text-white sm:text-7xl lg:text-8xl">
                SUA<br />
                <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent drop-shadow-lg">
                  COLECAO.
                </span><br />
                NOSSO LEGADO.
              </h1>
              <p className="mx-auto max-w-xl text-lg font-medium leading-relaxed text-slate-400 lg:mx-0">
                Acesse o estoque mais exclusivo de Pokemon TCG do Brasil. Cartas raras, certificadas e prontas para envio imediato.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 pt-6 sm:flex-row lg:justify-start">
              <Link href="/marketplace">
                <button className="h-14 rounded-2xl border border-rose-500/50 bg-rose-600 px-10 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_0_30px_rgba(225,29,72,0.3)] transition-all hover:-translate-y-1 hover:bg-rose-500 hover:shadow-[0_0_40px_rgba(225,29,72,0.5)]">
                  Explorar Catalogo
                </button>
              </Link>
              <Link href="/suporte">
                <button className="group h-14 rounded-2xl border border-white/10 bg-white/5 px-10 text-[11px] font-black uppercase tracking-widest text-white backdrop-blur-md transition-all hover:bg-white/10">
                  Como Comprar <span className="ml-2 inline-block text-rose-500 transition-transform group-hover:translate-x-1">→</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="w-full max-w-[500px] flex-1">
            {loading ? (
              <div className="h-[600px] w-full animate-pulse rounded-[40px] border border-white/5 bg-slate-900/50" />
            ) : heroCard ? (
              <div className="group perspective-[2000px] relative">
                <div className="absolute inset-0 rounded-[40px] bg-gradient-to-tr from-yellow-500/30 via-rose-500/20 to-purple-600/30 blur-2xl transition-all duration-500 group-hover:blur-3xl" />

                <div className="relative rounded-[40px] border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl transition-all duration-700 ease-out group-hover:-translate-y-2 group-hover:rotate-[0deg] rotate-[2deg]">
                  <div className="absolute -right-4 -top-4 z-20 flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 px-5 py-2 text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-xl">
                    <span className="text-xs">✨</span> Certificado {heroCard.grade || 'A+'}
                  </div>

                  <div className="relative flex min-h-[400px] items-center justify-center overflow-hidden rounded-3xl transition-all duration-500 group-hover:shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                    <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay" />
                    <img src={heroCard.image_url} alt={heroCard.name} className="relative z-0 h-auto w-full drop-shadow-2xl transition-transform duration-700 ease-out group-hover:scale-105" />
                  </div>

                  <div className="relative z-10 mt-8 space-y-4">
                    <div>
                      <h3 className="text-3xl font-black tracking-tighter text-white">{heroCard.name}</h3>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-rose-400">{heroCard.set}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Valor de Mercado</p>
                        <p className="text-xl font-black tracking-tighter text-white">
                          R$ {heroCard.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button
                        onClick={() => addItem({
                          id: heroCard.id,
                          name: heroCard.name,
                          price: heroCard.price,
                          imageUrl: heroCard.image_url,
                          maxStock: heroCard.quantity,
                        })}
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-900 shadow-lg transition-all hover:scale-110 hover:bg-rose-500 hover:text-white hover:shadow-rose-500/50 active:scale-95"
                        title="Adicionar ao Carrinho"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[600px] w-full items-center justify-center rounded-[40px] border-2 border-dashed border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Nenhum ativo disponivel no momento
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="relative z-20 border-y border-white/5 bg-slate-900/50 py-8 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-8 px-6 opacity-70 sm:justify-between">
          {['100% AUTENTICO', 'ENTREGA SEGURA', 'CRIPTOGRAFIA SSL', 'SUPORTE VIP'].map((badge) => (
            <div key={badge} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span className="text-xs font-black uppercase tracking-[0.3em] text-white">{badge}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto relative z-20 px-6 py-32">
        <div className="mb-20 flex flex-col items-end justify-between gap-6 sm:flex-row">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="h-[1px] w-8 bg-rose-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Colecao Privada</span>
            </div>
            <h2 className="text-5xl font-black leading-[1.1] tracking-tighter text-white lg:text-6xl">
              Pecas de <br /><span className="text-slate-500">Destaque.</span>
            </h2>
          </div>
          <Link href="/marketplace" className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">
            <span className="transition-colors group-hover:text-rose-400">Explorar Acervo</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 transition-all group-hover:bg-white group-hover:text-slate-900">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-10 text-left md:grid-cols-3">
          {loading ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="aspect-[3/4] animate-pulse rounded-[32px] bg-slate-900/50" />
            ))
          ) : highlights.length > 0 ? (
            highlights.map((card) => (
              <div key={card.id} className="group relative">
                <div className="absolute -inset-4 -z-10 rounded-[40px] bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-all duration-500 group-hover:opacity-100" />
                <div className="relative mb-8 aspect-[3/4] cursor-pointer overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/80 backdrop-blur-sm">
                  <div className="absolute left-4 top-4 z-20 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 backdrop-blur-md">
                    <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400">{card.grade || 'MINT'}</span>
                  </div>

                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-950/60 opacity-0 transition-all duration-500 group-hover:opacity-100 backdrop-blur-[2px]">
                    <button
                      onClick={() => addItem({
                        id: card.id,
                        name: card.name,
                        price: card.price,
                        imageUrl: card.image_url,
                        maxStock: card.quantity,
                      })}
                      className="h-12 rounded-xl bg-white px-8 text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-xl transition-all hover:scale-105 hover:bg-rose-500 hover:text-white active:scale-95"
                    >
                      Adicionar a Collection
                    </button>
                    <Link href={`/marketplace/card/${card.id}`}>
                      <button className="h-12 rounded-xl border border-white/30 px-8 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/10">
                        Ver Detalhes
                      </button>
                    </Link>
                  </div>

                  <div className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl transition-colors duration-500 group-hover:bg-rose-500/10" />

                  <img src={card.image_url} alt={card.name} className="relative z-0 h-full w-full object-contain p-10 drop-shadow-2xl transition-transform duration-700 ease-in-out group-hover:-translate-y-2 group-hover:scale-110" />
                </div>

                <div className="space-y-3 px-2">
                  <h3 className="text-xl font-black tracking-tighter text-white transition-colors group-hover:text-rose-400">{card.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Investimento</span>
                    <span className="text-lg font-black text-white">R$ {card.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-20 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
              Produtos em destaque em breve
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
