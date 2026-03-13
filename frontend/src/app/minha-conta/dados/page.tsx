'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ProfileData {
    full_name: string;
    phone: string;
    email: string;
}

export default function DadosContaPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<ProfileData>({
        full_name: '',
        phone: '',
        email: '',
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');

    useEffect(() => {
        void fetchProfile();
    }, []);

    async function fetchProfile() {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', user.id)
                .single();

            setProfile({
                full_name: profileData?.full_name || user.user_metadata?.name || '',
                phone: profileData?.phone || '',
                email: user.email || '',
            });
        }

        setLoading(false);
    }

    async function handleUpdateProfile(event: React.FormEvent) {
        event.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return;
            }

            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                full_name: profile.full_name,
                phone: profile.phone,
                updated_at: new Date().toISOString(),
            });

            if (error) {
                throw error;
            }

            await supabase.auth.updateUser({
                data: { name: profile.full_name },
            });

            setMessage({ type: 'success', text: 'Dados atualizados com sucesso.' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao atualizar dados.' });
        } finally {
            setSaving(false);
        }
    }

    async function handleUpdatePassword(event: React.FormEvent) {
        event.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas nao coincidem.' });
            return;
        }

        setSaving(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Senha alterada com sucesso.' });
            setNewPassword('');
            setConfirmPassword('');
        }

        setSaving(false);
    }

    async function handleUpdateEmail(event: React.FormEvent) {
        event.preventDefault();
        setSaving(true);

        const { error } = await supabase.auth.updateUser({ email: newEmail });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Um link de confirmacao foi enviado para o novo email.' });
            setNewEmail('');
        }

        setSaving(false);
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-4xl px-6 py-32 text-center text-sm font-black uppercase tracking-[0.22em] text-slate-300">
                Carregando seus dados...
            </div>
        );
    }

    return (
        <div className="mx-auto min-h-screen max-w-4xl px-6 py-16 animate-fade-up">
            <div className="mb-12 space-y-3">
                <Link href="/minha-conta" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 hover:underline">
                    ← Voltar para painel
                </Link>
                <h1 className="text-4xl font-black tracking-[-0.04em] text-slate-900">
                    Dados da <span className="text-rose-600">conta.</span>
                </h1>
                <p className="text-sm text-slate-500">
                    Atualize suas informacoes pessoais, senha e email. O gerenciamento de cartao fica direto no Mercado Pago.
                </p>
            </div>

            {message && (
                <div className={`mb-8 flex items-center gap-3 rounded-2xl border p-4 ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-600'}`}>
                    <span className="text-lg">{message.type === 'success' ? '✓' : '!'}</span>
                    <p className="text-xs font-bold uppercase tracking-[0.18em]">{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                <div className="space-y-8">
                    <div className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-sm">
                        <div className="mb-8 flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">P</div>
                            <h2 className="text-lg font-black tracking-[-0.03em] text-slate-900">Informacoes pessoais</h2>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="space-y-2">
                                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nome completo</label>
                                <input
                                    required
                                    type="text"
                                    value={profile.full_name}
                                    onChange={(event) => setProfile({ ...profile, full_name: event.target.value })}
                                    className="h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-rose-500/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    placeholder="(00) 00000-0000"
                                    value={profile.phone}
                                    onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                                    className="h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-rose-500/20"
                                />
                            </div>

                            <button
                                disabled={saving}
                                className="h-12 w-full rounded-xl bg-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-rose-600 disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar alteracoes'}
                            </button>
                        </form>
                    </div>

                    <div className="rounded-[40px] bg-slate-900 p-8 text-white">
                        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-rose-500">Protecao de dados</p>
                        <p className="text-xs leading-relaxed text-slate-300">
                            Seus dados sao protegidos e tratados em conformidade com a LGPD. O site nao mantem uma area propria para cartoes salvos.
                        </p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-sm">
                        <div className="mb-8 flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">S</div>
                            <h2 className="text-lg font-black tracking-[-0.03em] text-slate-900">Seguranca</h2>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Alterar senha</p>
                            <input
                                required
                                type="password"
                                placeholder="Nova senha"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                className="h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-rose-500/20"
                            />
                            <input
                                required
                                type="password"
                                placeholder="Confirmar nova senha"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-rose-500/20"
                            />
                            <button
                                disabled={saving}
                                className="h-12 w-full rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 transition-all hover:bg-slate-50 disabled:opacity-50"
                            >
                                Atualizar senha
                            </button>
                        </form>

                        <div className="my-8 h-px bg-slate-50" />

                        <form onSubmit={handleUpdateEmail} className="space-y-4">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Alterar email</p>
                            <div className="space-y-1">
                                <p className="ml-1 text-[9px] font-bold italic text-slate-400">Atual: {profile.email}</p>
                                <input
                                    required
                                    type="email"
                                    placeholder="Novo email"
                                    value={newEmail}
                                    onChange={(event) => setNewEmail(event.target.value)}
                                    className="h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-rose-500/20"
                                />
                            </div>
                            <button
                                disabled={saving}
                                className="h-12 w-full rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 transition-all hover:bg-slate-50 disabled:opacity-50"
                            >
                                Alterar email
                            </button>
                        </form>
                    </div>

                    <div className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-sm">
                        <div className="mb-6 flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">L</div>
                            <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-slate-900">Sua privacidade</h2>
                        </div>

                        <p className="mb-8 text-xs leading-relaxed text-slate-500">
                            Em conformidade com a LGPD, voce tem controle sobre seus dados e pode exportar ou excluir sua conta.
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(profile))}`;
                                    const downloadAnchorNode = document.createElement('a');
                                    downloadAnchorNode.setAttribute('href', dataStr);
                                    downloadAnchorNode.setAttribute('download', 'meus_dados_tcghub.json');
                                    document.body.appendChild(downloadAnchorNode);
                                    downloadAnchorNode.click();
                                    downloadAnchorNode.remove();
                                    setMessage({ type: 'success', text: 'Exportacao de dados iniciada.' });
                                }}
                                className="group flex h-12 w-full items-center justify-between rounded-xl bg-slate-50 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 transition-all hover:bg-slate-100"
                            >
                                Solicitar exportacao de dados
                                <span className="opacity-0 transition-opacity group-hover:opacity-100">↓</span>
                            </button>

                            <button
                                onClick={async () => {
                                    if (!confirm('A exclusao da conta e permanente. Deseja continuar?')) {
                                        return;
                                    }

                                    setSaving(true);
                                    const { data: { user } } = await supabase.auth.getUser();

                                    if (user) {
                                        const { error } = await supabase.rpc('delete_user_account');
                                        if (error) {
                                            setMessage({ type: 'error', text: 'Erro ao excluir conta. Contate o suporte.' });
                                        } else {
                                            await supabase.auth.signOut();
                                            window.location.href = '/';
                                        }
                                    }

                                    setSaving(false);
                                }}
                                className="group flex h-12 w-full items-center justify-between rounded-xl bg-rose-50 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-rose-600 transition-all hover:bg-rose-100"
                            >
                                Excluir minha conta permanentemente
                                <span className="opacity-0 transition-opacity group-hover:opacity-100">X</span>
                            </button>
                        </div>

                        <div className="mt-8 border-t border-slate-50 pt-6 text-center">
                            <Link href="/privacidade" className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 hover:text-rose-600">
                                Ver politica de privacidade completa
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
