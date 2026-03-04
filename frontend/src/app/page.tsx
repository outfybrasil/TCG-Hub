"use client";

import React from 'react';
import AIScanner from '@/components/AIScanner';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

export default function HomePage() {
  const { addItem } = useCart();
  return (
    <div className="animate-fade-up bg-slate-950 min-h-screen text-slate-200">

      {/* Hero Section - A Loja Exclusiva */}
      <section className="relative pt-32 pb-40 px-6 overflow-hidden">
        {/* Deep blur backgrounds for premium dark aesthetic */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[120px] -z-10 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -z-10 -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] -z-10 mix-blend-overlay" />

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
          <div className="flex-1 space-y-8 text-center lg:text-left tracking-tight">
            <div className="inline-flex items-center gap-2 mb-2 bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Estoque Premium Disponível</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9]">
                SUA<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600 drop-shadow-lg">
                  COLEÇÃO.
                </span><br />
                NOSSO LEGADO.
              </h1>
              <p className="max-w-xl mx-auto lg:mx-0 text-slate-400 text-lg font-medium leading-relaxed">
                Acesse o estoque mais exclusivo de Pokémon TCG do Brasil. Cartas raras, certificadas e prontas para envio imediato.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-6">
              <Link href="/marketplace">
                <button className="h-14 px-10 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_0_30px_rgba(225,29,72,0.3)] hover:bg-rose-500 hover:shadow-[0_0_40px_rgba(225,29,72,0.5)] transition-all transform hover:-translate-y-1 border border-rose-500/50">
                  Explorar Catálogo
                </button>
              </Link>
              <Link href="/suporte">
                <button className="h-14 px-10 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-white/10 backdrop-blur-md transition-all group">
                  Como Comprar <span className="inline-block transform group-hover:translate-x-1 transition-transform ml-2 text-rose-500">→</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="flex-1 w-full max-w-[500px]">
            <div className="relative group perspective-[2000px]">
              {/* Glowing behind the card */}
              <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/30 via-rose-500/20 to-purple-600/30 rounded-[40px] blur-2xl group-hover:blur-3xl transition-all duration-500" />

              {/* Glassmorphism Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl border border-white/10 relative transform rotate-[2deg] group-hover:rotate-[0deg] group-hover:-translate-y-2 transition-all duration-700 ease-out preserve-3d">

                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-900 px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl flex items-center gap-2 z-20">
                  <span className="text-xs">✨</span> Certificado A+
                </div>

                <div className="relative overflow-hidden rounded-3xl group-hover:shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none mix-blend-overlay" />
                  <img src="https://images.pokemontcg.io/base1/4.png" alt="Charizard" className="w-full h-auto drop-shadow-2xl relative z-0 transform group-hover:scale-105 transition-transform duration-700 ease-out" />
                </div>

                <div className="mt-8 space-y-4 relative z-10">
                  <div>
                    <h3 className="text-3xl font-black tracking-tighter text-white">Charizard</h3>
                    <p className="text-rose-400 font-bold text-xs uppercase tracking-widest mt-1">Base Set 1999</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Avaliação do Especialista</p>
                      <p className="text-white font-black text-xl tracking-tighter">R$ 15.600</p>
                    </div>
                    <button
                      onClick={() => addItem({ id: 'featured-1', name: 'Charizard Base Set', price: 15600, imageUrl: "https://images.pokemontcg.io/base1/4.png" })}
                      className="h-12 w-12 flex items-center justify-center bg-white text-slate-900 font-black rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-lg hover:shadow-rose-500/50 hover:scale-110 active:scale-95"
                      title="Adicionar ao Carrinho"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges - Premium Style */}
      <section className="py-8 border-y border-white/5 bg-slate-900/50 backdrop-blur-sm relative z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center sm:justify-between items-center gap-8 opacity-70">
          {[
            "100%_AUTÊNTICO",
            "ENTREGA_SEGURA",
            "CRIPTOGRAFIA_SSL",
            "SUPORTE_VIP"
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 bg-rose-500 rounded-full" />
              <span className="text-white font-black text-xs tracking-[0.3em] uppercase">{badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto relative z-20">
        <div className="flex flex-col sm:flex-row items-end justify-between mb-20 gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="h-[1px] w-8 bg-rose-500" />
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Coleção Privada</span>
            </div>
            <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[1.1]">
              Peças de <br /><span className="text-slate-500">Destaque.</span>
            </h2>
          </div>
          <Link href="/marketplace" className="group flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-[0.2em]">
            <span className="group-hover:text-rose-400 transition-colors">Explorar Acervo</span>
            <span className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-all">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
          {[
            { id: "hlt-1", name: "Pikachu Illustrator", price: 1200000, img: "https://images.pokemontcg.io/promo/1.png", grade: "PSA 10" },
            { id: "hlt-2", name: "Mewtwo Shadowless", price: 25000, img: "https://images.pokemontcg.io/base1/10.png", grade: "BGS 9.5" },
            { id: "hlt-3", name: "Lugia Legend", price: 8500, img: "https://images.pokemontcg.io/hgss1/114.png", grade: "CGC 10" }
          ].map((card, i) => (
            <div key={i} className="group relative">
              <div className="absolute -inset-4 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-[40px] transition-all duration-500 -z-10" />
              <div
                className="aspect-[3/4] bg-slate-900/80 rounded-[32px] mb-8 overflow-hidden border border-white/10 relative backdrop-blur-sm cursor-pointer"
              >
                {/* Grade Badge */}
                <div className="absolute top-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">{card.grade}</span>
                </div>

                {/* Hover Add to Cart Overlay */}
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500 z-10 flex flex-col items-center justify-center gap-4">
                  <button
                    onClick={() => addItem({ id: card.id, name: card.name, price: card.price, imageUrl: card.img })}
                    className="h-12 px-8 bg-white text-slate-900 font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl hover:bg-rose-500 hover:text-white"
                  >
                    Adicionar à Collection
                  </button>
                  <Link href={`/marketplace`}>
                    <button className="h-12 px-8 border border-white/30 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white/10 transition-all">
                      Ver Detalhes
                    </button>
                  </Link>
                </div>

                {/* Glow behind image */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-white/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors duration-500" />

                <img src={card.img} alt={card.name} className="w-full h-full object-contain p-10 group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-700 ease-in-out relative z-0 drop-shadow-2xl" />
              </div>

              <div className="px-2 space-y-3">
                <h3 className="text-xl font-black tracking-tighter text-white group-hover:text-rose-400 transition-colors">{card.name}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Investimento_</span>
                  <span className="text-white font-black text-lg">R$ {card.price.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Premium Features */}
      <section className="py-32 px-6 relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900 border border-white/5 rounded-[50px] p-8 sm:p-16 lg:p-24 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-10">
                <div className="space-y-6">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[1] uppercase">
                    O Padrão <span className="text-rose-500">Ouro</span> de Colecionismo.
                  </h2>
                  <p className="text-slate-400 font-medium leading-relaxed max-w-lg text-lg">
                    Não somos apenas uma loja. Somos a ponte entre você e as cartas mais raras já impressas. Curadoria impecável para investidores e colecionadores sérios.
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    "Certificação de Autenticidade em 3 Etapas",
                    "Embalagem Blindada com Case Acrílico",
                    "Comunicação VIP e Assessoria de Investimento"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                        <span className="text-rose-500 text-xs font-black">✓</span>
                      </div>
                      <span className="text-slate-300 font-bold text-sm tracking-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-6 lg:translate-y-12">
                  <div className="bg-slate-950/50 backdrop-blur-md p-10 rounded-[32px] border border-white/5 hover:border-rose-500/30 transition-colors group">
                    <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🛡️</div>
                    <h4 className="text-white font-black tracking-tighter text-xl mb-3">Garantia TCG</h4>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">Reembolso total garantido caso a certificação não seja validada.</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-10 rounded-[32px] border border-white/10 hover:border-rose-500/30 transition-colors group">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">✈️</div>
                    <h4 className="text-white font-black tracking-tighter text-xl mb-3">Envio Global</h4>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">Logística especializada com seguro completo door-to-door.</p>
                  </div>
                </div>
                <div className="space-y-6 lg:-translate-y-12">
                  <div className="bg-gradient-to-br from-rose-900/40 to-slate-900/50 p-10 rounded-[32px] border border-rose-500/20 backdrop-blur-md group">
                    <div className="h-12 w-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">💎</div>
                    <h4 className="text-white font-black tracking-tighter text-xl mb-3">Card Grading</h4>
                    <p className="text-sm text-rose-200/70 leading-relaxed font-medium">Trabalhamos exclusivamente com PSA, BGS e CGC (Grades 9+).</p>
                  </div>
                  <div className="bg-slate-950/50 backdrop-blur-md p-10 rounded-[32px] border border-white/5 hover:border-rose-500/30 transition-colors group">
                    <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🏛️</div>
                    <h4 className="text-white font-black tracking-tighter text-xl mb-3">Acervo Histórico</h4>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">Acesso às primeiras edições e cartas promocionais não listadas.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 text-center max-w-5xl mx-auto relative mt-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[400px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="space-y-12 relative z-10">
          <div className="inline-block px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-2">
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em]">ACESSO IMEDIATO</span>
          </div>
          <h2 className="text-6xl sm:text-7xl lg:text-9xl font-black text-white tracking-tighter leading-[0.9] uppercase">
            Eleve Seu <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">Patamar.</span>
          </h2>
          <p className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.4em] max-w-xl mx-auto leading-relaxed">
            Junte-se ao seleto grupo de investidores e colecionadores da TCG Mega Store.
          </p>
          <div className="pt-10">
            <Link href="/marketplace">
              <button className="h-20 px-16 border border-rose-500/50 bg-rose-600 hover:bg-rose-500 backdrop-blur-md text-white font-black uppercase tracking-[0.2em] text-xs rounded-full transition-all duration-300 shadow-[0_0_40px_rgba(225,29,72,0.3)] hover:shadow-[0_0_60px_rgba(225,29,72,0.6)] hover:scale-105 active:scale-95">
                Iniciar Aquisições Seguras
              </button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
