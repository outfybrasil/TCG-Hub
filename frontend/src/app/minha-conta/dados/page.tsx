'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import SaveCardModal from '@/components/SaveCardModal';


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
        email: ''
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Security states
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');

    // Saved Cards States
    const [savedCards, setSavedCards] = useState<any[]>([]);
    const [showCardModal, setShowCardModal] = useState(false);


    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
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
                email: user.email || ''
            });

            const { data: cardsData } = await supabase
                .from('saved_cards')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (cardsData) {
                setSavedCards(cardsData);
            }
        }
        setLoading(false);
    };

    const handleDeleteCard = async (cardId: string) => {
        if (!confirm('Deseja realmente remover este cartão?')) return;
        setLoading(true);
        try {
            await fetch(`/api/pagamento/cartao/deletar?id=${cardId}`, { method: 'DELETE' });
            setSavedCards(prev => prev.filter(c => c.id !== cardId));
            setMessage({ type: 'success', text: 'Cartão removido.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro ao remover cartão.' });
        }
        setLoading(false);
    };


    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                full_name: profile.full_name,
                phone: profile.phone,
                updated_at: new Date().toISOString()
            });

            if (error) throw error;

            // Update auth metadata too for fast greeting updates
            await supabase.auth.updateUser({
                data: { name: profile.full_name }
            });

            setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Erro ao atualizar dados.' });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        setSaving(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setNewPassword('');
            setConfirmPassword('');
        }
        setSaving(false);
    };

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Um link de confirmação foi enviado para o novo e-mail.' });
            setNewEmail('');
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="max-w-4xl mx-auto px-6 py-32 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">
            Carregando seus dados...
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-6 py-16 min-h-screen animate-fade-up">
            <div className="mb-12 space-y-3">
                <Link href="/minha-conta" className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline flex items-center gap-2">
                    ← Voltar para Painel
                </Link>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900">
                    Dados da <span className="text-rose-600">Conta.</span>
                </h1>
                <p className="text-slate-400 text-sm">Atualize suas informações pessoais e segurança.</p>
            </div>

            {message && (
                <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                    <span className="text-lg">{message.type === 'success' ? '✓' : '⚠'}</span>
                    <p className="text-xs font-bold uppercase tracking-widest">{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Personal Info */}
                <div className="space-y-8">
                    <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">👤</div>
                            <h2 className="text-lg font-black tracking-tight text-slate-900">Informações Pessoais</h2>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                <input
                                    required
                                    type="text"
                                    value={profile.full_name}
                                    onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-rose-500/20 outline-none font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    placeholder="(00) 00000-0000"
                                    value={profile.phone}
                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-rose-500/20 outline-none font-medium"
                                />
                            </div>
                            <button
                                disabled={saving}
                                className="w-full h-12 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-rose-600 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[40px] text-white">
                        <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4">Proteção de Dados</p>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium">
                            Seus dados são protegidos por criptografia AES-256 e tratados em total conformidade com a LGPD. Você tem o direito de acessar, exportar ou excluir seus dados a qualquer momento.
                        </p>
                    </div>

                    {/* Saved Cards */}
                    <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">💳</div>
                                <h2 className="text-lg font-black tracking-tight text-slate-900">Cartões Salvos</h2>
                            </div>
                            <button
                                onClick={() => setShowCardModal(true)}
                                className="h-10 px-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-600 transition-all"
                            >
                                + Adicionar
                            </button>
                        </div>

                        {savedCards.length === 0 ? (
                            <p className="text-sm font-medium text-slate-400">Nenhum cartão salvo para pagamentos rápidos.</p>
                        ) : (
                            <div className="space-y-4">
                                {savedCards.map(card => (
                                    <div key={card.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-8 bg-white border border-slate-200 rounded flex items-center justify-center font-black text-[10px] text-slate-900 uppercase">
                                                {card.card_brand}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 tracking-wider">**** **** **** {card.last_four_digits}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Vence em {card.expiration_month}/{card.expiration_year}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteCard(card.id)} className="text-slate-400 hover:text-rose-600 transition-colors" title="Remover Cartão">
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-6 flex items-center gap-2">
                            <span>🔒</span> Ambente PCI-Compliant
                        </p>
                    </div>
                </div>

                {/* Security Info */}
                <div className="space-y-8">
                    {/* Password Change */}
                    <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">🔒</div>
                            <h2 className="text-lg font-black tracking-tight text-slate-900">Segurança</h2>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alterar Senha</p>
                            <input
                                required
                                type="password"
                                placeholder="Nova Senha"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-rose-500/20 outline-none font-medium"
                            />
                            <input
                                required
                                type="password"
                                placeholder="Confirmar Nova Senha"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-rose-500/20 outline-none font-medium"
                            />
                            <button
                                disabled={saving}
                                className="w-full h-12 border border-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                                Atualizar Senha
                            </button>
                        </form>

                        <div className="h-[1px] bg-slate-50 my-8"></div>

                        {/* Email Change */}
                        <form onSubmit={handleUpdateEmail} className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alterar E-mail</p>
                            <div className="space-y-1">
                                <p className="text-[9px] text-slate-400 font-bold ml-1 italic">Atual: {profile.email}</p>
                                <input
                                    required
                                    type="email"
                                    placeholder="Novo E-mail"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-rose-500/20 outline-none font-medium"
                                />
                            </div>
                            <button
                                disabled={saving}
                                className="w-full h-12 border border-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                                Alterar E-mail
                            </button>
                        </form>
                    </div>

                    {/* LGPD Section */}
                    <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">⚖️</div>
                            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">Sua Privacidade (LGPD)</h2>
                        </div>

                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8">
                            Em conformidade com a Lei Geral de Proteção de Dados, você tem total controle sobre suas informações.
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile));
                                    const downloadAnchorNode = document.createElement('a');
                                    downloadAnchorNode.setAttribute("href", dataStr);
                                    downloadAnchorNode.setAttribute("download", "meus_dados_tcghub.json");
                                    document.body.appendChild(downloadAnchorNode);
                                    downloadAnchorNode.click();
                                    downloadAnchorNode.remove();
                                    setMessage({ type: 'success', text: 'Exportação de dados iniciada!' });
                                }}
                                className="w-full h-12 flex items-center justify-between px-6 bg-slate-50 text-slate-600 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-100 transition-all group"
                            >
                                Solicitar Exportação de Dados
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">↓</span>
                            </button>

                            <button
                                onClick={async () => {
                                    if (confirm('ATENÇÃO: A exclusão da conta é permanente e você perderá todo o seu histórico e saldo de cashback. Deseja continuar?')) {
                                        setSaving(true);
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (user) {
                                            // RPC call for clean deletion
                                            const { error } = await supabase.rpc('delete_user_account');
                                            if (error) {
                                                setMessage({ type: 'error', text: 'Erro ao excluir conta. Contate o suporte.' });
                                            } else {
                                                await supabase.auth.signOut();
                                                window.location.href = '/';
                                            }
                                        }
                                        setSaving(false);
                                    }
                                }}
                                className="w-full h-12 flex items-center justify-between px-6 bg-rose-50 text-rose-600 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-100 transition-all group"
                            >
                                Excluir Minha Conta Permanentemente
                                <span className="text-xl opacity-0 group-hover:opacity-100 transition-opacity">🗑️</span>
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                            <Link href="/privacidade" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600">
                                Ver Política de Privacidade Completa
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {showCardModal && (
                <SaveCardModal
                    onClose={() => setShowCardModal(false)}
                    onSuccess={() => {
                        setShowCardModal(false);
                        setMessage({ type: 'success', text: 'Cartão cadastrado com sucesso e protegido de forma segura!' });
                        fetchProfile();
                    }}
                />
            )}
        </div>
    );
}
