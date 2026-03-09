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
    const [cpf, setCpf] = useState('');


    // Address State
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [cepLoading, setCepLoading] = useState(false);

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setCep(value);

        if (value.length === 8) {
            setCepLoading(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setStreet(data.logradouro);
                    setNeighborhood(data.bairro);
                    setCity(data.localidade);
                    setState(data.uf);
                }
            } catch (err) {
                console.error("Erro ao buscar CEP:", err);
            } finally {
                setCepLoading(false);
            }
        }
    };

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
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (signUpError) throw signUpError;
            if (!user) throw new Error('Não foi possível criar o usuário.');

            // Success sign up -> Create profile
            const { error: profileError } = await supabase.from('profiles').insert({
                id: user.id,
                full_name: name,
                document_number: cpf,
                document_type: 'CPF'
            });

            if (profileError) {
                console.error("Erro ao salvar perfil:", profileError);
            }

            // Save address to user_addresses
            if (cep) {
                const { error: addressError } = await supabase.from('user_addresses').insert({
                    user_id: user.id,
                    label: 'Principal',
                    cep,
                    street,
                    number,
                    complement,
                    neighborhood,
                    city,
                    state,
                    is_default: true
                });

                if (addressError) {
                    console.error("Erro ao salvar endereço:", addressError);
                }
            }

            router.push('/auth/verify-email');
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
            setError("Erro ao autenticar com Google. Tente novamente.");
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

                        {/* CPF */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">CPF</label>
                            <input
                                required
                                type="text"
                                value={cpf}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                    setCpf(val);
                                }}
                                placeholder="000.000.000-00"
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

                        {/* Address Header */}
                        <div className="flex items-center gap-4 pt-6 pb-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Endereço de Entrega</h3>
                            <div className="h-[1px] flex-1 bg-slate-100" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">CEP</label>
                                <div className="relative">
                                    <input
                                        required maxLength={8}
                                        type="text" value={cep} onChange={handleCepChange}
                                        placeholder="01001000"
                                        className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white outline-none transition-all font-bold text-sm text-slate-900"
                                    />
                                    {cepLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Estado</label>
                                <input
                                    required readOnly
                                    type="text" value={state}
                                    placeholder="UF"
                                    className="w-full h-14 px-6 bg-slate-200 border border-transparent rounded-2xl font-black text-sm text-slate-600 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Rua / Logradouro</label>
                            <input
                                required
                                type="text" value={street} onChange={e => setStreet(e.target.value)}
                                placeholder="Praça da Sé"
                                className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white outline-none transition-all font-bold text-sm text-slate-900"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Número</label>
                                <input
                                    required
                                    type="text" value={number} onChange={e => setNumber(e.target.value)}
                                    placeholder="123"
                                    className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white outline-none transition-all font-bold text-sm text-slate-900"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Complemento</label>
                                <input
                                    type="text" value={complement} onChange={e => setComplement(e.target.value)}
                                    placeholder="Apto 42"
                                    className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white outline-none transition-all font-bold text-sm text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Bairro</label>
                                <input
                                    required
                                    type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                                    placeholder="Sé"
                                    className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white outline-none transition-all font-bold text-sm text-slate-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Cidade</label>
                                <input
                                    required
                                    type="text" value={city} onChange={e => setCity(e.target.value)}
                                    placeholder="São Paulo"
                                    className="w-full h-14 px-6 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white outline-none transition-all font-bold text-sm text-slate-900"
                                />
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                <span className="text-rose-600 text-sm">⚠</span>
                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-wide">{error}</p>
                            </div>
                        )}

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
                    <span className="text-[9px] font-black tracking-[0.4em] text-slate-900">ENCRYPT AES 256</span>
                    <div className="h-1.5 w-1.5 bg-rose-600 rounded-full" />
                    <span className="text-[9px] font-black tracking-[0.4em] text-slate-900">POKE PROTO v5.0</span>
                </div>
            </div>
        </div>
    );
}
