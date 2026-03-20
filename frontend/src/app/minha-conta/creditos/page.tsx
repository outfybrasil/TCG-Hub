'use client';

import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { motion } from 'framer-motion';

interface CreditData {
    balance: number;
    locked: number;
}

interface Transaction {
    id: string;
    type: string;
    amount: number;
    created_at: string;
    note: string | null;
    auction_id: string | null;
}

interface Profile {
    document_number?: string;
    document_type?: string;
    full_name?: string;
}

const typeLabels: Record<string, { label: string; color: string; sign: string }> = {
    deposit: { label: 'Depósito', color: 'text-emerald-600', sign: '+' },
    bid_lock: { label: 'Lance Bloqueado', color: 'text-amber-600', sign: '-' },
    bid_release: { label: 'Lance Liberado', color: 'text-blue-600', sign: '+' },
    consumed: { label: 'Pregão Arrematado', color: 'text-slate-900', sign: '-' },
    refund: { label: 'Reembolso', color: 'text-emerald-600', sign: '+' },
};

let mpInitialized = false;

export default function CreditosPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [credits, setCredits] = useState<CreditData>({ balance: 0, locked: 0 });
    const [cashbackBalance, setCashbackBalance] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Recharge Flow State
    const [step, setStep] = useState<1 | 2>(1); // 1: Amount, 2: Checkout Pro Ready
    const [depositAmount, setDepositAmount] = useState('');
    const [depositing, setDepositing] = useState(false);
    const [depositError, setDepositError] = useState('');
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        if (!mpInitialized) {
            mpInitialized = true;
            initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY as string, { locale: 'pt-BR' });
        }

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace('/auth/login'); return; }
            setUser(user);

            const [creditsRes, txRes, profileRes, walletRes] = await Promise.all([
                supabase.from('auction_credits').select('balance, locked').eq('user_id', user.id).single(),
                supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('wallets').select('balance').eq('user_id', user.id).single()
            ]);

            if (creditsRes.data) setCredits(creditsRes.data);
            if (txRes.data) setTransactions(txRes.data);
            if (profileRes.data) {
                setProfile(profileRes.data);
            }
            if (walletRes.data) setCashbackBalance(walletRes.data.balance || 0);
            setLoading(false);
        };
        init();
    }, [router]);

    const getAuthHeaders = async (headers: HeadersInit = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        return {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    const handleGeneratePreference = async () => {
        if (!user) {
            setDepositError('Usuario nao autenticado.');
            return;
        }

        if (!depositAmount || parseFloat(depositAmount) < 0.01) {
            setDepositError('Valor mínimo: R$ 0,01');
            return;
        }

        setDepositing(true);
        setDepositError('');

        try {
            const res = await fetch('/api/creditos/preference', {
                method: 'POST',
                headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    amount: parseFloat(depositAmount),
                    payerFirstName: profile?.full_name?.split(' ')[0] || user.user_metadata?.name?.split(' ')[0] || 'Cliente',
                    payerLastName: profile?.full_name?.split(' ').slice(1).join(' ') || user.user_metadata?.name?.split(' ').slice(1).join(' ') || 'TCG',
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setPreferenceId(data.id);
            setStep(2);
        } catch (err: unknown) {
            console.error(err);
            setDepositError(err instanceof Error ? err.message : 'Erro ao gerar Checkout.');
        } finally {
            setDepositing(false);
        }
    };

    const handleConvertCashback = async () => {
        if (!user || cashbackBalance <= 0) return;
        
        setDepositing(true);
        try {
            console.log('Iniciando RPC de conversão...');
            const { data, error } = await supabase.rpc('convert_cashback_to_credits', {
                p_user_id: user.id,
                p_amount: cashbackBalance
            });

            if (error) throw error;

            setCashbackBalance(0);
            setShowConfirmModal(false);
            
            // Refresh credits
            const { data: newCredits } = await supabase.from('auction_credits').select('balance, locked').eq('user_id', user.id).single();
            if (newCredits) setCredits(newCredits);

            // Refresh transactions
            const { data: newTx } = await supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
            if (newTx) setTransactions(newTx);

            alert('Sucesso! Seu cashback foi convertido em créditos.');
        } catch (err) {
            console.error(err);
            alert('Falha na conversão de cashback. Verifique se a migração SQL foi executada no banco de dados.');
        } finally {
            setDepositing(false);
        }
    };

    const available = credits.balance - credits.locked;

    if (loading) return (
        <div className="flex items-center justify-center py-44">
            <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-up">
            {/* Header */}
            <div className="mb-12 space-y-3">
                <Link href="/minha-conta" className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
                    ← Minha Conta
                </Link>
                <div className="flex items-center gap-4">
                    <h1 className="text-4xl font-black tracking-[-0.04em] text-slate-900 uppercase leading-none sm:text-5xl">
                        Meus <span className="text-rose-600">Créditos.</span>
                    </h1>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-lg">
                    Seus créditos permitem que você realize lances exclusivos em nossos leilões.
                </p>
            </div>

            {/* Balance Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl shadow-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-12 -mt-12" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Disponível</p>
                    <p className="text-4xl font-black text-white tracking-tighter">R$ {available.toFixed(2).replace('.', ',')}</p>
                    <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mt-2">✓ Pronto para lances</p>
                </div>
                <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bloqueado</p>
                    <p className="text-3xl font-black text-amber-500 tracking-tighter">R$ {credits.locked.toFixed(2).replace('.', ',')}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Em lances ativos</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Histórico Total</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">R$ {credits.balance.toFixed(2).replace('.', ',')}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2">Acumulado</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12 items-start">
                {/* Recharge Card */}
                <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[40px] p-10 shadow-sm relative">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-black tracking-tighter text-slate-900 uppercase">Recarregar Saldo</h2>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-1.5 w-1.5 rounded-full ${step >= i ? 'bg-rose-600' : 'bg-slate-100'}`} />
                            ))}
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quanto deseja adicionar?</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[0.01, 10, 50, 100, 200, 500].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setDepositAmount(String(v))}
                                        className={`h-12 text-xs font-black rounded-2xl border-2 transition-all ${depositAmount === String(v) ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-900/20' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'}`}
                                    >
                                        R$ {v.toLocaleString('pt-BR', { minimumFractionDigits: v < 1 ? 2 : 0, maximumFractionDigits: 2 })}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">R$</span>
                                <input
                                    type="number"
                                    placeholder="Outro valor..."
                                    value={depositAmount}
                                    onChange={e => setDepositAmount(e.target.value)}
                                    className="w-full h-14 pl-12 pr-5 bg-slate-50 border-none rounded-2xl text-slate-900 font-black text-sm focus:ring-2 focus:ring-rose-500 transition-all"
                                />
                            </div>
                            <button
                                onClick={handleGeneratePreference}
                                disabled={depositing || !depositAmount || parseFloat(depositAmount) < 0.01}
                                className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all shadow-xl disabled:opacity-50"
                            >
                                {depositing ? 'Gerando Checkout...' : 'Continuar para Pagamento'}
                            </button>
                        </div>
                    )}

                    {step === 2 && preferenceId && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={() => { setStep(1); setPreferenceId(null); }} className="text-[10px] font-black text-slate-400 uppercase hover:text-rose-600">← Alterar Valor</button>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checkout Pro</p>
                            </div>

                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl mb-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor da Recarga</p>
                                    <p className="text-2xl font-black text-slate-900">R$ {parseFloat(depositAmount).toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>

                            <Wallet initialization={{ preferenceId, redirectMode: 'blank' }} />

                            <p className="text-center text-[10px] text-slate-400 font-bold max-w-sm mx-auto">
                                Clique acima para abrir o checkout seguro do Mercado Pago em uma nova aba e concluir sua recarga.
                            </p>
                        </div>
                    )}



                    {depositError && (
                        <p className="mt-4 p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-2xl text-center border border-rose-100">
                            ⚠ {depositError}
                        </p>
                    )}


                    {/* Converter Cashback Section */}
                    {cashbackBalance > 0 && (
                        <div className="mt-12 pt-8 border-t border-slate-50">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] border border-emerald-100 rounded-[32px] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                                
                                <div className="shrink-0 w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
                                    🎁
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Dica de Fidelidade</p>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                                        R$ {cashbackBalance.toFixed(2).replace('.', ',')} esperando você!
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                        Converta seu cashback em créditos agora.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setShowConfirmModal(true)}
                                    className="w-full sm:w-auto px-8 h-12 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 active:scale-95"
                                >
                                    Converter Agora
                                </button>
                            </motion.div>
                        </div>
                    )}
                </div>

                {/* Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white rounded-[40px] p-8 sm:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden text-center"
                        >
                            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                            
                            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 animate-bounce">
                                💰
                            </div>

                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-4">
                                Confirmar Conversão?
                            </h2>
                            
                            <p className="text-sm text-slate-500 font-bold mb-10 leading-relaxed px-4">
                                Você está transformando <span className="text-emerald-600 font-black">R$ {cashbackBalance.toFixed(2).replace('.', ',')}</span> de saldo Cashback em Créditos de Site. Esta ação é instantânea e não pode ser desfeita.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setShowConfirmModal(false)}
                                    className="h-14 bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-100 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConvertCashback}
                                    disabled={depositing}
                                    className="h-14 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50"
                                >
                                    {depositing ? 'Processando...' : 'Confirmar e Converter'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Info & History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] text-white space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Regras de Créditos</h3>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-[10px] font-bold text-slate-300">
                                <span className="text-rose-500">●</span>
                                Valor mínimo de recarga: R$ 0,01
                            </li>
                            <li className="flex gap-3 text-[10px] font-bold text-slate-300">
                                <span className="text-rose-500">●</span>
                                Saldo bloqueado pode ser liberado após o fim do leilão
                            </li>
                            <li className="flex gap-3 text-[10px] font-bold text-slate-300">
                                <span className="text-rose-500">●</span>
                                Reembolsos integrais via suporte
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-sm">
                        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Histórico</h2>
                            <Link href="/minha-conta/pedidos" className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Ver Todos</Link>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                            {transactions.length === 0 ? (
                                <div className="p-10 text-center space-y-3">
                                    <div className="h-8 w-8 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-slate-200">?</div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nenhuma movimentação</p>
                                </div>
                            ) : (
                                transactions.map(tx => {
                                    const meta = typeLabels[tx.type] || { label: tx.type, color: 'text-slate-600', sign: '' };
                                    return (
                                        <div key={tx.id} className="flex justify-between items-center px-8 py-5 hover:bg-slate-50 transition-colors">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-900">{meta.label}</p>
                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                                    {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <p className={`text-xs font-black ${meta.color}`}>
                                                {meta.sign} R$ {tx.amount.toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 bg-rose-50 border border-rose-100 rounded-[32px] text-center">
                <p className="text-[9px] font-black text-rose-600 uppercase tracking-[0.2em] mb-2">Segurança Garantida</p>
                <p className="text-[10px] text-rose-900 font-bold max-w-xl mx-auto leading-relaxed">
                    Todos os pagamentos são processados via Mercado Pago com criptografia de ponta a ponta.
                    Seus créditos são seguros e podem ser sacados a qualquer momento caso não utilize.
                </p>
            </div>
        </div>
    );
}
