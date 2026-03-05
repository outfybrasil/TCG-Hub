'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (password.length < 8) {
            setError('A senha deve ter no mínimo 8 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                    },
                },
            });

            if (signUpError) throw signUpError;

            router.push('/membro');
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            if (msg.includes('already registered')) {
                setError('Este e-mail já está cadastrado. Faça login.');
            } else {
                setError('Erro ao criar conta. Verifique os dados e tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-6 bg-white animate-fade-up">
            <div className="w-full max-w-md">
                <div className="text-center mb-10 space-y-4">
                    <div className="h-20 w-20 bg-slate-900 rounded-[30px] flex items-center justify-center text-white text-3xl shadow-2xl shadow-slate-900/20 mx-auto mb-8">
                        <span>🃏</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                        Criar <span className="text-rose-600">Conta</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">Junte-se à Comunidade TCG Mega Store</p>
                </div>

                <div className="bg-white border border-slate-100 p-8 sm:p-12 rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.05)] relative overflow-hidden">
                    <form onSubmit={handleRegister} className="space-y-5 relative z-10">

                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ash Ketchum"
                                className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm text-slate-900"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">E-mail</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="ash@pokemon.com"
                                className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm text-slate-900"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Senha <span className="opacity-50">(mín. 8 caracteres)</span></label>
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm text-slate-900"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Confirmar Senha</label>
                            <input
                                required
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full h-14 px-6 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm text-slate-900 ${confirmPassword && confirmPassword !== password
                                    ? 'border-rose-400 bg-rose-50/30'
                                    : 'border-transparent focus:border-rose-600 focus:bg-white'
                                    }`}
                            />
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                <span className="text-rose-600 text-sm">⚠</span>
                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-wide">{error}</p>
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full h-16 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-xl hover:bg-rose-600 transition-all transform hover:-translate-y-1 disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Criando Conta...' : 'Criar Minha Conta'}
                        </button>
                    </form>

                    <div className="mt-10 text-center border-t border-slate-50 pt-10">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                            Já tem conta?{' '}
                            <a href="/auth/login" className="text-rose-600 hover:text-rose-700 transition-colors">
                                Fazer Login
                            </a>
                        </p>
                    </div>
                </div>

                <div className="mt-16 flex items-center justify-center gap-6 opacity-30">
                    <span className="text-[9px] font-black tracking-[0.4em] text-slate-900">ENCRYPT_AES_256</span>
                    <div className="h-1.5 w-1.5 bg-rose-600 rounded-full" />
                    <span className="text-[9px] font-black tracking-[0.4em] text-slate-900">POKE_PROTO_v5.0</span>
                </div>
            </div>
        </div>
    );
}
