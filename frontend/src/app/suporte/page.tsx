"use client";

import React from 'react';

export default function SupportPage() {
    const faqs = [
        { q: "Quais são as formas de pagamento aceitas?", a: "Aceitamos Cartões de Crédito (até 12x), Pix com aprovação imediata e Transferências Bancárias. Todos os pagamentos são processados via gateways seguros." },
        { q: "Como é feito o envio das cartas?", a: "Todas as cartas são enviadas em 'double sleeve', 'toploader' e embalagem rígida. Utilizamos Correios com seguro total declarado para garantir que seu ativo chegue impecável." },
        { q: "As cartas são originais e verificadas?", a: "Sim. Garantimos 100% de autenticidade em todo o nosso estoque. Cada carta passa por uma análise rigorosa de originalidade antes de ser listada na loja." },
        { q: "Qual o prazo de postagem?", a: "Realizamos postagens diárias. Após a confirmação do pagamento, seu pedido é processado e enviado em até 24 horas úteis." },
    ];

    return (
        <div className="max-w-5xl mx-auto px-6 py-16 animate-fade-up">
            <div className="mb-20 space-y-6">
                <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Suporte ao Colecionador</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-tight">
                    Central de<br /><span className="text-rose-600">Atendimento.</span>
                </h1>
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest leading-relaxed max-w-xl">Suporte dedicado para garantir a melhor experiência na aquisição dos seus colecionáveis.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
                <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-600/10 rounded-bl-3xl -mr-12 -mt-12 group-hover:bg-rose-600/20 transition-all" />
                    <div className="space-y-6 relative z-10">
                        <span className="text-4xl text-rose-500">✉️</span>
                        <div className="space-y-1">
                            <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-50">E-mail de Contato</h3>
                            <p className="text-rose-500 font-black text-lg tracking-tight uppercase">suporte@tcgmegastore.com</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 p-10 rounded-3xl shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-all">
                    <div className="space-y-6 relative z-10">
                        <span className="text-4xl">📱</span>
                        <div className="space-y-1">
                            <h3 className="text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">WhatsApp Exclusivo</h3>
                            <p className="text-slate-900 font-black text-lg tracking-tight">(11) 99999-0000</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-12">
                <div className="flex items-center gap-6">
                    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 whitespace-nowrap">Dúvidas Frequentes</h2>
                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {faqs.map((faq, i) => (
                        <div key={i} className="bg-white p-8 rounded-[30px] border border-slate-100 hover:border-rose-600/40 hover:shadow-2xl hover:shadow-rose-500/5 transition-all group">
                            <div className="flex gap-6 items-start">
                                <span className="text-rose-600 font-black text-xs pt-1 tracking-tighter">0{i + 1}</span>
                                <div className="space-y-4">
                                    <h4 className="text-slate-900 text-xl font-black tracking-tighter group-hover:text-rose-600 transition-colors uppercase leading-none">{faq.q}</h4>
                                    <p className="text-slate-500 font-medium text-sm leading-relaxed">{faq.a}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-24 p-12 rounded-[50px] text-center space-y-10 border border-slate-100 bg-slate-50/50">
                <div className="space-y-4">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Ainda precisa de ajuda?</h3>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Nossos especialistas estão online para você.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="h-16 px-12 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all">Iniciar Atendimento</button>
                    <button className="h-16 px-12 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-800 transition-all">Track Order</button>
                </div>
            </div>
        </div>
    );
}
