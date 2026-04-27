"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';

interface CardAsset {
  id: string;
  name: string;
  set: string;
  price: number;
  image_url: string;
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
        setFeaturedCards(
          data.map((card) => ({
            id: card.id,
            name: card.official_name ?? card.name,
            set: card.official_set_name ?? card.set,
            price: Number(card.price),
            image_url: card.official_image_url ?? card.image_url,
            grade: card.grade ?? 'MINT',
            finish: card.finish,
            quantity: card.quantity || 0,
          }))
        );
      }

      setLoading(false);
    };

    void fetchFeatured();
  }, []);

  const heroCard = featuredCards[0];
  const highlights = featuredCards.slice(1);

  return (
    <div className="min-h-screen animate-fade-up" style={{ background: '#0c1324' }}>

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-40 pt-28">
        {/* Atmospheric glows */}
        <div
          className="glow-rose"
          style={{
            right: '-5%', top: '-10%',
            width: 700, height: 700,
            animation: 'glow-pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="glow-blue"
          style={{
            left: '-5%', bottom: '-10%',
            width: 600, height: 600,
            animation: 'glow-pulse 5s ease-in-out infinite 1s',
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center gap-16 lg:flex-row">
          {/* Left copy */}
          <div className="flex-1 space-y-8 text-center lg:text-left">
            {/* Pill badge */}
            <div className="badge-live inline-flex">
              <span
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ background: '#e11d48' }}
              />
              Estoque Premium Disponível
            </div>

            {/* Headline */}
            <div className="space-y-0">
              <h1
                className="text-prestige leading-[0.88] text-white"
                style={{ fontSize: 'clamp(56px, 9vw, 96px)' }}
              >
                SUA<br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #ffb3b6 0%, #e11d48 50%, #be0037 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  COLEÇÃO.
                </span>
                <br />
                NOSSO LEGADO.
              </h1>
            </div>

            <p className="mx-auto max-w-xl text-base leading-relaxed lg:mx-0" style={{ color: '#8b95b5' }}>
              Acesse o estoque mais exclusivo de Pokémon TCG do Brasil.
              Cartas raras, certificadas e prontas para envio imediato.
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row lg:justify-start">
              <Link href="/marketplace">
                <button className="btn-primary">
                  Explorar Catálogo →
                </button>
              </Link>
              <Link href="/suporte">
                <button className="btn-ghost">
                  Como Comprar
                </button>
              </Link>
            </div>

            {/* Trust micro */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 lg:justify-start">
              {['PSA Certificado', 'Envio Secreto', 'Suporte VIP'].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ background: '#e11d48' }}
                  />
                  <span
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: '#8b95b5' }}
                  >
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — hero card */}
          <div className="w-full max-w-[420px] flex-shrink-0">
            {loading ? (
              <div
                className="h-[560px] w-full animate-pulse rounded-[40px]"
                style={{ background: '#191f31' }}
              />
            ) : heroCard ? (
              <div className="relative group">
                {/* Multi-color glow behind card */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '-24px',
                    borderRadius: '56px',
                    background: 'radial-gradient(ellipse at center, rgba(225,29,72,0.25) 0%, rgba(59,130,246,0.15) 60%, transparent 100%)',
                    filter: 'blur(32px)',
                    transition: 'all 0.5s ease',
                    animation: 'glow-pulse 3s ease-in-out infinite',
                  }}
                />

                {/* Card wrapper floating */}
                <div
                  className="card-glint relative"
                  style={{
                    background: 'rgba(25,31,49,0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '40px',
                    padding: '32px',
                    animation: 'float 6s ease-in-out infinite',
                    boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Grade badge top-right */}
                  <div
                    className="absolute -right-3 -top-3 z-20 flex items-center gap-2 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                    }}
                  >
                    ✨ Certificado {heroCard.grade || 'PSA 10'}
                  </div>

                  {/* Card image */}
                  <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-3xl">
                    <img
                      src={heroCard.image_url}
                      alt={heroCard.name}
                      className="relative z-0 h-auto w-full drop-shadow-2xl transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>

                  {/* Card info */}
                  <div className="relative z-10 mt-6 space-y-4">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-white">
                        {heroCard.name}
                      </h3>
                      <p
                        className="mt-0.5 text-[10px] font-black uppercase tracking-widest"
                        style={{ color: '#ffb3b6' }}
                      >
                        {heroCard.set}
                      </p>
                    </div>

                    <div
                      className="flex items-center justify-between border-t pt-4"
                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>
                          Valor de Mercado
                        </p>
                        <p className="price-tag text-xl">
                          R$ {heroCard.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          addItem({
                            id: heroCard.id,
                            name: heroCard.name,
                            price: heroCard.price,
                            imageUrl: heroCard.image_url,
                            maxStock: heroCard.quantity,
                          })
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-xl font-black text-white transition-all hover:scale-110 active:scale-95"
                        style={{ background: '#e11d48', boxShadow: '0 0 20px rgba(225,29,72,0.4)' }}
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
              <div
                className="flex h-[560px] w-full items-center justify-center rounded-[40px] text-[10px] font-bold uppercase tracking-widest"
                style={{
                  background: '#191f31',
                  border: '2px dashed rgba(255,255,255,0.06)',
                  color: '#8b95b5',
                }}
              >
                Em breve
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ─────────────────────────────────── */}
      <section
        className="relative z-20 py-5"
        style={{
          background: '#070d1f',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-10 px-6">
          {['100% Autêntico', 'Entrega Segura', 'Criptografia SSL', 'Suporte VIP'].map((badge) => (
            <div key={badge} className="flex items-center gap-3">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: '#e11d48' }}
              />
              <span
                className="text-[10px] font-black uppercase tracking-[0.28em]"
                style={{ color: '#dce1fb' }}
              >
                {badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED CARDS ────────────────────────────── */}
      <section className="max-w-7xl mx-auto relative z-20 px-6 py-32">
        {/* Section header */}
        <div className="mb-20 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="space-y-4">
            <div className="eyebrow">Coleção Privada</div>
            <h2
              className="text-prestige leading-[1.0]"
              style={{ fontSize: 'clamp(40px, 5vw, 60px)', color: '#dce1fb' }}
            >
              Peças de<br />
              <span style={{ color: '#2e3447' }}>Destaque.</span>
            </h2>
          </div>
          <Link
            href="/marketplace"
            className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-white"
            style={{ color: '#8b95b5' }}
          >
            <span>Explorar Acervo</span>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all group-hover:text-slate-900"
              style={{
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#dce1fb';
                (e.currentTarget as HTMLElement).style.color = '#0c1324';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'inherit';
              }}
            >
              →
            </span>
          </Link>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-8 text-left md:grid-cols-3">
          {loading ? (
            [1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-[28px]"
                style={{ aspectRatio: '3/4', background: '#191f31' }}
              />
            ))
          ) : highlights.length > 0 ? (
            highlights.map((card) => (
              <div key={card.id} className="group relative">
                <div
                  className="card-product relative mb-6"
                  style={{ aspectRatio: '3/4', cursor: 'pointer' }}
                >
                  {/* Grade badge top-left */}
                  <div
                    className="badge-grade absolute left-4 top-4 z-20"
                  >
                    {card.grade || 'MINT'}
                  </div>

                  {/* Hover overlay with CTAs */}
                  <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 opacity-0 transition-all duration-400 group-hover:opacity-100"
                    style={{
                      background: 'rgba(12,19,36,0.7)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: 'inherit',
                    }}
                  >
                    <button
                      onClick={() =>
                        addItem({
                          id: card.id,
                          name: card.name,
                          price: card.price,
                          imageUrl: card.image_url,
                          maxStock: card.quantity,
                        })
                      }
                      className="h-11 rounded-xl px-8 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                      style={{ background: '#e11d48', color: '#fff', boxShadow: '0 0 24px rgba(225,29,72,0.4)' }}
                    >
                      Adicionar à Coleção
                    </button>
                    <Link href={`/marketplace/card/${card.id}`}>
                      <button
                        className="h-11 rounded-xl px-8 text-[10px] font-black uppercase tracking-widest transition-all hover:text-white"
                        style={{
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#dce1fb',
                          background: 'transparent',
                        }}
                      >
                        Ver Detalhes
                      </button>
                    </Link>
                  </div>

                  {/* Inner glow */}
                  <div
                    className="absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-60"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(225,29,72,0.08) 0%, transparent 70%)',
                      borderRadius: 'inherit',
                    }}
                  />

                  <img
                    src={card.image_url}
                    alt={card.name}
                    className="relative z-0 h-full w-full object-contain p-8 drop-shadow-2xl transition-transform duration-700 ease-in-out group-hover:-translate-y-2 group-hover:scale-110"
                  />
                </div>

                <div className="space-y-2 px-1">
                  <h3
                    className="text-lg font-black tracking-tight transition-colors group-hover:text-white"
                    style={{ color: '#dce1fb' }}
                  >
                    {card.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: '#8b95b5' }}
                    >
                      Investimento
                    </span>
                    <span className="price-tag text-base">
                      R$ {card.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              className="col-span-3 py-20 text-center text-xs font-bold uppercase tracking-widest"
              style={{ color: '#8b95b5' }}
            >
              Produtos em destaque em breve
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
