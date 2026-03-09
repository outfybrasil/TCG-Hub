"use client";

import React from 'react';
import Link from 'next/link';

export default function VerifyEmailPage() {
    return (
        <div className="min-h-[85vh] flex items-center justify-center p-6 bg-white animate-fade-up">
            <div className="w-full max-w-md">
                <div className="text-center mb-10 space-y-4">
                    <div className="h-20 w-20 bg-amber-500 rounded-[30px] flex items-center justify-center text-white text-3xl shadow-2xl shadow-amber-500/30 mx-auto mb-8 transform -rotate-6">
                        <span>✉️</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Confirme seu <span className="text-rose-600">E-mail</span></h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">Protocolo de Segurança TCG Mega Store</p>
                </div>

                <div className="bg-white border border-slate-100 p-8 sm:p-12 rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.05)] relative overflow-hidden text-center">
                    <div className="space-y-6 relative z-10">
                        <p className="text-slate-600 font-medium italic text-sm leading-relaxed">
                            Acabamos de enviar um link de ativação para o seu e-mail.
                            Verifique sua caixa de entrada (e a pasta de spam) para liberar seu acesso à plataforma.
                        </p>

                        <div className="py-6 border-y border-slate-50 space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Próximos Passos</h3>
                            <ul className="text-left space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="text-rose-600 mt-0.5">✓</span>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Abra o e-mail de confirmação</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-rose-600 mt-0.5">✓</span>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Clique no botão de ativação</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-rose-600 mt-0.5">✓</span>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Faça login e comece sua coleção</p>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <Link
                                href="/auth/login"
                                className="block w-full h-16 bg-slate-900 text-white flex items-center justify-center font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-xl hover:bg-rose-600 transition-all transform hover:-translate-y-1"
                            >
                                Voltar para o Login
                            </Link>

                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest pt-2">
                                Não recebeu? <button className="text-rose-600 hover:underline">Reenviar Link</button>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-16 flex items-center justify-center gap-6 opacity-30">
                    <span className="text-[9px] font-black tracking-[0.4em] text-slate-900">SECURE_AUTH</span>
                    <div className="h-1.5 w-1.5 bg-rose-600 rounded-full"></div>
                    <span className="text-[9px] font-black tracking-[0.4em] text-slate-900">VERIFY_v1.0</span>
                </div>
            </div>
        </div>
    );
}
