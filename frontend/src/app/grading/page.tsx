"use client";

import React from 'react';
import AIScanner from '@/components/AIScanner';

export default function ArtificialIntelligenceGradingPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up border-t border-slate-50">
            {/* Header - Digital Certification Hub */}
            <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 border-b border-slate-200 pb-12">
                <div className="space-y-6 flex-1">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Protocolo de Certificação Digital</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                            IA <span className="text-rose-600 font-black">Grading.</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest max-w-lg">Certificação de ativos baseada em visão computacional e redes neurais profundas.</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <button className="h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg hover:bg-rose-600 transition-all transform hover:-translate-y-1">Novo Escaneamento</button>
                        <button className="h-12 px-8 bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-50 transition-all">Ver Relatórios</button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full lg:w-auto pt-8 lg:pt-0">
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest leading-none">Precisão_</span>
                        <span className="text-2xl font-black text-rose-600 tracking-tighter">99.9%</span>
                    </div>
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest leading-none">Processo_</span>
                        <span className="text-2xl font-black text-slate-900 tracking-tighter">12s</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Scanner Visualization */}
                <div className="order-2 lg:order-1">
                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl shadow-rose-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none text-rose-600 font-black text-[9px] uppercase tracking-[0.4em]">POKE_SCAN_NODE_v5</div>
                        <AIScanner />
                    </div>
                </div>

                {/* Feature Context */}
                <div className="space-y-12 order-1 lg:order-2">
                    <div className="space-y-6">
                        <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-tight">Ciência Aplicada ao <br /><span className="text-rose-600">Patrimônio.</span></h2>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-md">Nosso laboratório digital utiliza o NeuralScan v.2.4 para mapear imperfeições micrométricas, garantindo a nota mais justa para cada item da nossa TCGStore.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {[
                            { title: "Detecção de Micro-Erosão", desc: "Análise de superfície para identificar riscos e falhas na camada UV.", icon: "🔬" },
                            { title: "Validação de Centragem", desc: "Cálculo vetorial da moldura original com precisão de 0.01mm.", icon: "📏" },
                            { title: "Verificação de Autenticidade", desc: "Comparação de padrões de retícula e pigmentação institucional.", icon: "🏛️" }
                        ].map((feat, i) => (
                            <div key={i} className="flex gap-6 p-6 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
                                <div className="h-12 w-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:bg-yellow-400 group-hover:scale-110 transition-all">
                                    <span className="text-2xl">{feat.icon}</span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{feat.title}</h3>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Process Map */}
            <div className="mt-32 pt-16 border-t border-slate-100 space-y-12">
                <div className="flex items-center gap-6">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">Protocolo de Operação</h2>
                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[
                        { step: "01", title: "Ingestão", desc: "Carregamento de macro-fotos de alta densidade." },
                        { step: "02", title: "Análise", desc: "Decomposição vetorial pela rede neural." },
                        { step: "03", title: "Scoring", desc: "Geração de nota baseada em padrões globais." },
                        { step: "04", title: "Registro", desc: "Indexação imutável no banco de dados." }
                    ].map((item, i) => (
                        <div key={i} className="space-y-4 group">
                            <span className="text-5xl font-black text-slate-100 group-hover:text-yellow-400 transition-colors tracking-tighter leading-none">{item.step}</span>
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.title}</h4>
                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
