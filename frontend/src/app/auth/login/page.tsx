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

            if (signInError) {
                if (signInError.message.includes('Email not confirmed')) {
                    router.push('/auth/verify-email');
                    return;
                }
                throw signInError;
            }

            router.push('/membro');
        } catch (err: any) {
            console.error(err);
            const message = err.message === 'Invalid login credentials'
                ? "Acesso negado. Verifique suas credenciais de acesso."
                : err.message;
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err) {
            console.error("Erro ao fazer login com Google:", err);
            alert("Erro ao autenticar com Google. Tente novamente.");
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

                        {/* Google Login Button */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full h-14 bg-white border border-slate-200 text-slate-900 font-bold text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#EA4335" d="M12.48 10.92v3.28h7.84c-.24 1.84-.9 3.32-2.06 4.44-1.28 1.24-3.24 2.16-5.78 2.16-4.52 0-8.24-3.48-8.24-8.04s3.72-8.04 8.24-8.04c2.44 0 4.28.96 5.6 2.24l2.32-2.32C18.44 2.56 15.64 1.2 12.48 1.2 6.48 1.2 1.6 6.08 1.6 12.08s4.88 10.88 10.88 10.88c3.24 0 5.68-1.04 7.6-3.04 2-2 2.64-4.8 2.64-7.08 0-.52-.04-1.04-.12-1.52h-10.12z" />
                                </svg>
                                Continuar com Google
                            </button>
                        </div>

                        <div className="flex items-center gap-4 py-2">
                            <div className="h-[1px] flex-1 bg-slate-100" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">ou</span>
                            <div className="h-[1px] flex-1 bg-slate-100" />
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
