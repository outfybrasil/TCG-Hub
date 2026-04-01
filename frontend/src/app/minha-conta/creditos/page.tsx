'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { motion } from 'framer-motion';

import { DEFAULT_BUSINESS_RULES, type BusinessRules } from '@/lib/business-rules';
import { supabase } from '@/lib/supabase';

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
    deposit: { label: 'Deposito', color: 'text-emerald-600', sign: '+' },
    bid_lock: { label: 'Lance Bloqueado', color: 'text-amber-600', sign: '-' },
    bid_release: { label: 'Lance Liberado', color: 'text-blue-600', sign: '+' },
    consumed: { label: 'Pregao Arrematado', color: 'text-slate-900', sign: '-' },
    refund: { label: 'Reembolso', color: 'text-emerald-600', sign: '+' },
    withdrawal: { label: 'Estorno Processado', color: 'text-rose-600', sign: '-' },
    fee: { label: 'Taxa de Estorno', color: 'text-amber-600', sign: '-' },
};

let mpInitialized = false;

export default function CreditosPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [credits, setCredits] = useState<CreditData>({ balance: 0, locked: 0 });
    const [cashbackBalance, setCashbackBalance] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [businessRules, setBusinessRules] = useState<BusinessRules>(DEFAULT_BUSINESS_RULES);
    const [loading, setLoading] = useState(true);

    const [step, setStep] = useState<1 | 2>(1);
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
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                router.replace('/auth/login');
                return;
            }

            setUser(authUser);

            const [creditsRes, txRes, profileRes, walletRes, businessRulesRes] = await Promise.all([
                supabase.from('auction_credits').select('balance, locked').eq('user_id', authUser.id).single(),
                supabase.from('credit_transactions').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(10),
                supabase.from('profiles').select('*').eq('id', authUser.id).single(),
                supabase.from('wallets').select('balance').eq('user_id', authUser.id).single(),
                fetch('/api/public/business-rules').then(async (res) => (res.ok ? res.json() : null)).catch(() => null),
            ]);

            if (creditsRes.data) {
                setCredits(creditsRes.data);
            }

            if (txRes.data) {
                setTransactions(txRes.data);
            }

            if (profileRes.data) {
                setProfile(profileRes.data);
            }

            if (walletRes.data) {
                setCashbackBalance(walletRes.data.balance || 0);
            }

            if (businessRulesRes) {
                setBusinessRules({ ...DEFAULT_BUSINESS_RULES, ...businessRulesRes });
            }

            setLoading(false);
        };

        void init();
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
            setDepositError('Valor minimo: R$ 0,01');
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
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }

            setPreferenceId(data.id);
            setStep(2);
        } catch (err: unknown) {
            console.error(err);
            setDepositError(err instanceof Error ? err.message : 'Erro ao gerar checkout.');
        } finally {
            setDepositing(false);
        }
    };

    const handleConvertCashback = async () => {
        if (!user || cashbackBalance <= 0) {
            return;
        }

        setDepositing(true);

        try {
            const { error } = await supabase.rpc('convert_cashback_to_credits', {
                p_user_id: user.id,
                p_amount: cashbackBalance,
            });

            if (error) {
                throw error;
            }

            setCashbackBalance(0);
            setShowConfirmModal(false);

            const [{ data: newCredits }, { data: newTx }] = await Promise.all([
                supabase.from('auction_credits').select('balance, locked').eq('user_id', user.id).single(),
                supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
            ]);

            if (newCredits) {
                setCredits(newCredits);
            }

            if (newTx) {
                setTransactions(newTx);
            }

            alert('Sucesso! Seu cashback foi convertido em creditos.');
        } catch (err) {
            console.error(err);
            alert('Falha na conversao de cashback. Verifique se a migracao SQL foi executada no banco de dados.');
        } finally {
            setDepositing(false);
        }
    };

    const available = credits.balance - credits.locked;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl animate-fade-up px-6 py-16">
            <div className="mb-12 space-y-3">
                <Link href="/minha-conta" className="text-[9px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-rose-600">
                    Voltar para Minha Conta
                </Link>
                <div className="flex items-center gap-4">
                    <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.04em] text-slate-900 sm:text-5xl">
                        Meus <span className="text-rose-600">Creditos.</span>
                    </h1>
                </div>
                <p className="max-w-lg text-xs font-bold uppercase tracking-widest text-slate-400">
                    Seus creditos permitem que voce participe de leiloes e acompanhe toda movimentacao da carteira em um unico lugar.
                </p>
            </div>

            <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-8 text-white shadow-xl shadow-slate-200">
                    <div className="absolute right-0 top-0 -mr-12 -mt-12 h-24 w-24 rounded-bl-full bg-rose-500/10" />
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Disponivel</p>
                    <p className="text-4xl font-black tracking-tighter text-white">R$ {available.toFixed(2).replace('.', ',')}</p>
                    <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-emerald-400">Pronto para lances</p>
                </div>
                <div className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-sm">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Bloqueado</p>
                    <p className="text-3xl font-black tracking-tighter text-amber-500">R$ {credits.locked.toFixed(2).replace('.', ',')}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Em lances ativos</p>
                    </div>
                </div>
                <div className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-sm">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Historico Total</p>
                    <p className="text-3xl font-black tracking-tighter text-slate-900">R$ {credits.balance.toFixed(2).replace('.', ',')}</p>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Acumulado</p>
                </div>
            </div>

            <div className="mb-12 grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
                <div className="relative rounded-[40px] border border-slate-100 bg-white p-10 shadow-sm lg:col-span-3">
                    <div className="mb-8 flex items-center justify-between">
                        <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900">Recarregar Saldo</h2>
                        <div className="flex gap-1">
                            {[1, 2].map((i) => (
                                <div key={i} className={`h-1.5 w-1.5 rounded-full ${step >= i ? 'bg-rose-600' : 'bg-slate-100'}`} />
                            ))}
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quanto deseja adicionar?</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[0.01, 10, 50, 100, 200, 500].map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => setDepositAmount(String(value))}
                                        className={`h-12 rounded-2xl border-2 text-xs font-black transition-all ${depositAmount === String(value)
                                            ? 'border-rose-600 bg-rose-600 text-white shadow-lg shadow-rose-900/20'
                                            : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                                            }`}
                                    >
                                        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: value < 1 ? 2 : 0, maximumFractionDigits: 2 })}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">R$</span>
                                <input
                                    type="number"
                                    placeholder="Outro valor..."
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="h-14 w-full rounded-2xl border-none bg-slate-50 pl-12 pr-5 text-sm font-black text-slate-900 transition-all focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                            <button
                                onClick={handleGeneratePreference}
                                disabled={depositing || !depositAmount || parseFloat(depositAmount) < 0.01}
                                className="h-14 w-full rounded-2xl bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-rose-600 disabled:opacity-50"
                            >
                                {depositing ? 'Gerando checkout...' : 'Continuar para pagamento'}
                            </button>
                        </div>
                    )}

                    {step === 2 && preferenceId && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="mb-2 flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setPreferenceId(null);
                                    }}
                                    className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-600"
                                >
                                    Alterar valor
                                </button>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Checkout Pro</p>
                            </div>

                            <div className="mb-4 flex items-center justify-between rounded-3xl border border-slate-100 bg-slate-50 p-6">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Valor da Recarga</p>
                                    <p className="text-2xl font-black text-slate-900">R$ {parseFloat(depositAmount).toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>

                            <Wallet initialization={{ preferenceId, redirectMode: 'blank' }} />

                            <p className="mx-auto max-w-sm text-center text-[10px] font-bold text-slate-400">
                                Clique acima para abrir o checkout seguro do Mercado Pago em uma nova aba e concluir sua recarga.
                            </p>
                        </div>
                    )}

                    {depositError && (
                        <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-center text-[10px] font-black uppercase tracking-widest text-rose-600">
                            {depositError}
                        </p>
                    )}

                    {cashbackBalance > 0 && (
                        <div className="mt-12 border-t border-slate-50 pt-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] p-6 shadow-sm sm:flex-row sm:p-8"
                            >
                                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-2xl text-white shadow-lg shadow-emerald-500/20">
                                    C$
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">Dica de Fidelidade</p>
                                    <h3 className="text-xl font-black tracking-tight text-slate-900">
                                        R$ {cashbackBalance.toFixed(2).replace('.', ',')} esperando voce!
                                    </h3>
                                    <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                        Converta seu cashback em creditos agora.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowConfirmModal(true)}
                                    className="h-12 w-full rounded-xl bg-emerald-600 px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/10 transition-all active:scale-95 hover:bg-emerald-700 sm:w-auto"
                                >
                                    Converter Agora
                                </button>
                            </motion.div>
                        </div>
                    )}
                </div>

                {showConfirmModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-6 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-lg overflow-hidden rounded-[40px] bg-white p-8 text-center shadow-2xl sm:p-12"
                        >
                            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-3xl text-emerald-600">
                                R$
                            </div>
                            <h2 className="mb-4 text-3xl font-black uppercase tracking-tighter text-slate-900">Confirmar Conversao?</h2>
                            <p className="mb-10 px-4 text-sm font-bold leading-relaxed text-slate-500">
                                Voce esta transformando <span className="font-black text-emerald-600">R$ {cashbackBalance.toFixed(2).replace('.', ',')}</span> de cashback em creditos de site. Esta acao e instantanea e nao pode ser desfeita.
                            </p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="h-14 rounded-2xl bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConvertCashback}
                                    disabled={depositing}
                                    className="h-14 rounded-2xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-900/20 transition-all hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {depositing ? 'Processando...' : 'Confirmar e Converter'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                <div className="space-y-6 lg:col-span-2">
                    <div className="space-y-4 rounded-[40px] bg-slate-900 p-8 text-white">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Regras de Creditos</h3>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-[10px] font-bold text-slate-300">
                                <span className="text-rose-500">*</span>
                                Valor minimo de recarga: R$ 0,01
                            </li>
                            <li className="flex gap-3 text-[10px] font-bold text-slate-300">
                                <span className="text-rose-500">*</span>
                                Saldo bloqueado pode ser liberado apos o fim do leilao
                            </li>
                            <li className="flex gap-3 text-[10px] font-bold text-slate-300">
                                <span className="text-rose-500">*</span>
                                Estornos via suporte com taxa de {businessRules.creditRefundFeePercentage}%
                            </li>
                            <li className="flex gap-3 text-[10px] font-bold text-slate-300">
                                <span className="text-rose-500">*</span>
                                Prazo maximo para concluir o estorno: ate {businessRules.creditRefundProcessingHours}h
                            </li>
                        </ul>
                    </div>

                    <div className="overflow-hidden rounded-[40px] border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-50 px-8 py-6">
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Historico</h2>
                            <Link href="/minha-conta/pedidos" className="text-[8px] font-black uppercase tracking-widest text-rose-600">
                                Ver Todos
                            </Link>
                        </div>
                        <div className="max-h-[300px] divide-y divide-slate-50 overflow-y-auto">
                            {transactions.length === 0 ? (
                                <div className="space-y-3 p-10 text-center">
                                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-200">?</div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nenhuma movimentacao</p>
                                </div>
                            ) : (
                                transactions.map((tx) => {
                                    const meta = typeLabels[tx.type] || { label: tx.type, color: 'text-slate-600', sign: '' };
                                    return (
                                        <div key={tx.id} className="flex items-center justify-between px-8 py-5 transition-colors hover:bg-slate-50">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-900">{meta.label}</p>
                                                <p className="mt-0.5 text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                    {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                {tx.note && (
                                                    <p className="mt-2 max-w-[220px] text-[9px] font-medium leading-4 text-slate-500">
                                                        {tx.note}
                                                    </p>
                                                )}
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

            <div className="rounded-[32px] border border-rose-100 bg-rose-50 p-8 text-center">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-rose-600">Seguranca Garantida</p>
                <p className="mx-auto max-w-xl text-[10px] font-bold leading-relaxed text-rose-900">
                    Todos os pagamentos sao processados via Mercado Pago com criptografia de ponta a ponta. Solicitacoes de estorno seguem taxa administrativa de {businessRules.creditRefundFeePercentage}% e podem levar ate {businessRules.creditRefundProcessingHours}h para conclusao.
                </p>
            </div>
        </div>
    );
}
