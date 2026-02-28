"use client";

import React from 'react';
import AIScanner from '@/components/AIScanner';

export default function HomePage() {
  return (
    <div className="animate-fade-up bg-white">
      {/* Hero Section - A Loja Exclusiva */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-2 bg-rose-50 px-4 py-2 rounded-full border border-rose-100">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Estoque Premium Disponível</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-slate-900 leading-[0.9]">
                SUA<br />
                <span className="text-rose-600">COLEÇÃO.</span><br />
                NOSSO LEGADO.
              </h1>
              <p className="max-w-xl mx-auto lg:mx-0 text-slate-500 text-lg font-medium leading-relaxed">
                Acesse o estoque mais exclusivo de Pokémon TCG do Brasil. Cartas raras, certificadas e prontas para envio imediato.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-6">
              <a href="/marketplace">
                <button className="h-14 px-10 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all transform hover:-translate-y-1">
                  Ver Todo o Estoque
                </button>
              </a>
              <a href="/suporte">
                <button className="h-14 px-10 border border-slate-200 text-slate-900 font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-slate-50 transition-all group">
                  Como Comprar <span className="inline-block transform group-hover:translate-x-1 transition-transform ml-2">→</span>
                </button>
              </a>
            </div>
          </div>

          <div className="flex-1 w-full max-w-[500px]">
            <div className="relative group">
              <div className="absolute inset-0 bg-yellow-400 rounded-[40px] rotate-3 group-hover:rotate-6 transition-transform -z-10" />
              <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 relative shadow-rose-500/5">
                <div className="absolute -top-4 -right-4 bg-rose-600 text-white px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl">
                  Featured_Asset
                </div>
                <img src="https://images.pokemontcg.io/base1/4.png" alt="Charizard" className="w-full h-auto rounded-3xl" />
                <div className="mt-8 space-y-2">
                  <h3 className="text-2xl font-black tracking-tighter text-slate-900">Charizard Base Set</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certificado IA - Nota 10</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Background */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-rose-50/50 rounded-full blur-3xl -z-10" />
      </section>

      {/* Trust Badges - Estilo Poke */}
      <section className="py-12 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-around items-center gap-12 grayscale opacity-50 contrast-125">
          <span className="text-white font-black text-xl italic tracking-tighter">AUTHENTIC_</span>
          <span className="text-white font-black text-xl italic tracking-tighter">SECURE_PAY_</span>
          <span className="text-white font-black text-xl italic tracking-tighter">FAST_SHIP_</span>
          <span className="text-white font-black text-xl italic tracking-tighter">POKE_EXPERT_</span>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="space-y-4">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Destaques da Semana.</h2>
            <p className="text-slate-500 font-medium">As cartas mais desejadas da nossa curadoria privada.</p>
          </div>
          <a href="/marketplace" className="hidden sm:block text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] hover:underline">Ver TUDO →</a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { name: "Pikachu Illustrator", price: "R$ 1.2M", img: "https://images.pokemontcg.io/promo/1.png" },
            { name: "Mewtwo Shadowless", price: "R$ 25.000", img: "https://images.pokemontcg.io/base1/10.png" },
            { name: "Lugia Legend", price: "R$ 8.500", img: "https://images.pokemontcg.io/hgss1/114.png" }
          ].map((card, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="aspect-[3/4] bg-slate-50 rounded-3xl mb-6 overflow-hidden border border-slate-100 group-hover:shadow-2xl transition-all">
                <img src={card.img} alt={card.name} className="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h3 className="text-lg font-black tracking-tighter text-slate-900">{card.name}</h3>
              <p className="text-rose-600 font-black text-sm">{card.price}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6 bg-slate-50 rounded-[60px] mx-6 mb-32">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="space-y-6">
            <div className="h-14 w-14 bg-rose-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-rose-500/20">🛒</div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter underline decoration-yellow-400 decoration-4 underline-offset-8">Escolha seu Ativo</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Navegue por nossa loja e selecione as cartas que deseja adicionar ao seu legado.</p>
          </div>
          <div className="space-y-6">
            <div className="h-14 w-14 bg-rose-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-rose-500/20">📦</div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter underline decoration-yellow-400 decoration-4 underline-offset-8">Finalização Segura</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Crie sua conta, preencha seus dados de entrega e finalize o pagamento via Gateways oficiais.</p>
          </div>
          <div className="space-y-6">
            <div className="h-14 w-14 bg-rose-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-rose-500/20">⚡</div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter underline decoration-yellow-400 decoration-4 underline-offset-8">Envio Prioritário</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Receba sua carta em embalagem profissional com seguro total e rastreamento em tempo real.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 text-center max-w-4xl mx-auto">
        <div className="space-y-10">
          <h2 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter leading-none">PRONTO PARA O PRÓXIMO <span className="text-rose-600">NÍVEL?</span></h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">O melhor estoque Pokémon TCG a um clique de distância.</p>
          <a href="/marketplace" className="inline-block">
            <button className="h-16 px-12 bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-rose-600 transition-all shadow-xl">Explorar Catálogo Completo</button>
          </a>
        </div>
      </section>
    </div>
  );
}
