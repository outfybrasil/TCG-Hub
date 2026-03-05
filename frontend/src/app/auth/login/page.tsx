"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            router.push('/membro');
        } catch (err) {
            console.error(err); // Changed from 'error' to 'err' to match catch block variable
            alert("Acesso negado. Verifique suas credenciais de acesso.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-6 bg-white animate-fade-up">
            <div className="w-full max-w-md">
                <div className="text-center mb-10 space-y-4">
                    <div className="h-20 w-20 bg-rose-600 rounded-[30px] flex items-center justify-center text-white text-3xl shadow-2xl shadow-rose-500/30 mx-auto mb-8 transform rotate-6">
                        <span>⚡</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Acesso à <span className="text-rose-600">Loja</span></h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">Protocolo de Autenticação TCG Mega Store</p>
                </div>

                <div className="bg-white border border-slate-100 p-8 sm:p-12 rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.05)] relative overflow-hidden">
                    <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">E-mail Corporativo</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="exemplo@tcgmegastore.com"
                                className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm text-slate-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Chave de Acesso</label>
                                <button type="button" className="text-[9px] font-black text-rose-600 uppercase tracking-widest hover:underline">Esqueci</button>
                            </div>
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm text-slate-900"
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full h-16 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-xl hover:bg-rose-600 transition-all transform hover:-translate-y-1 disabled:opacity-50"
                        >
                            {loading ? 'Validando...' : 'Entrar no Sistema'}
                        </button>
                    </form>

                    <div className="mt-10 text-center border-t border-slate-50 pt-10">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                            Novo colecionador? <a href="/auth/register" className="text-rose-600 hover:text-rose-700 transition-colors">Criar Conta de Cliente</a>
                        </p>
                    </div>
                </div>

                <div className="mt-16 flex items-center justify-center gap-6 opacity-30">
                    <span className="text-[9px] font-black tracking-[0.4em] text-slate-900">ENCRYPT_AES_256</span>
                    <div className="h-1.5 w-1.5 bg-rose-600 rounded-full"></div>
                    <span className="text-[9px] font-black tracking-[0.4em] text-slate-900">POKE_PROTO_v5.0</span>
                </div>
            </div>
        </div>
    );
}
