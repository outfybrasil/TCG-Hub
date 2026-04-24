"use client";

import React, { useCallback, useEffect, useState } from 'react';

import AdminGuard from '@/components/AdminGuard';
import { DEFAULT_BUSINESS_RULES, type BusinessRules } from '@/lib/business-rules';
import { supabase } from '@/lib/supabase';

interface OriginAddress {
    name: string;
    phone: string;
    email: string;
    company: string;
    address: string;
    complement: string;
    number: string;
    district: string;
    city: string;
    state_abbr: string;
    postal_code: string;
}

export default function AdminSettingsPage() {
    const [token, setToken] = useState('');
    const [businessRules, setBusinessRules] = useState<BusinessRules>(DEFAULT_BUSINESS_RULES);
    const [origin, setOrigin] = useState<OriginAddress>({
        name: '',
        phone: '',
        email: '',
        company: 'TCG Mega Store',
        address: '',
        complement: '',
        number: '',
        district: '',
        city: '',
        state_abbr: '',
        postal_code: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const getAuthHeaders = async (headers: HeadersInit = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;

        return {
            ...headers,
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        };
    };

    const loadSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/settings', {
                headers: await getAuthHeaders(),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao carregar configuracoes.');
            }

            if (data.token) {
                setToken(String(data.token));
            }

            if (data.origin && typeof data.origin === 'object') {
                setOrigin((prev) => ({ ...prev, ...(data.origin as OriginAddress) }));
            }

            if (data.businessRules && typeof data.businessRules === 'object') {
                setBusinessRules((prev) => ({ ...prev, ...(data.businessRules as BusinessRules) }));
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar configuracoes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ token, origin, businessRules }),
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.error || 'Erro ao salvar configuracoes.');
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            alert('Erro ao salvar configuracoes.');
        } finally {
            setSaving(false);
        }
    };

    const updateOrigin = (key: keyof OriginAddress, value: string) => {
        setOrigin((prev) => ({ ...prev, [key]: value }));
    };

    const updateBusinessRules = (key: keyof BusinessRules, value: string) => {
        setBusinessRules((prev) => ({
            ...prev,
            [key]: value === '' ? DEFAULT_BUSINESS_RULES[key] : Number(value),
        }));
    };

    const inputClass = 'w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-none transition-all placeholder:text-slate-600';
    const labelClass = 'text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

    if (loading) {
        return (
            <AdminGuard>
                <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                    <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </AdminGuard>
        );
    }

    return (
        <AdminGuard>
            <div className="min-h-screen bg-slate-900 text-white selection:bg-rose-500/30">
                <div className="max-w-4xl mx-auto px-6 py-20 animate-fade-up">
                    <div className="mb-16 space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.6)]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Painel Administrativo</span>
                        </div>
                        <h1 className="text-5xl font-black uppercase tracking-tighter">
                            Configura<span className="text-rose-600">ções.</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-none">
                            Controle de Variáveis Globais e Integrações
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-6 rounded-[40px] border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-rose-600/20 rounded-xl flex items-center justify-center text-rose-500 font-black">API</div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-tight">Melhor Envio</h2>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Token de integração para geração de etiquetas</p>
                                </div>
                            </div>
                        <div>
                            <label className={labelClass}>Token de API</label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Cole seu token do Melhor Envio aqui"
                                className={inputClass}
                            />
                            <p className="mt-2 text-[8px] font-bold text-slate-300">
                                Obtenha em: melhorenvio.com.br - Configuracoes - Tokens de acesso
                            </p>
                        </div>
                    </div>

                        <div className="space-y-6 rounded-[40px] border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-rose-600/20 rounded-xl flex items-center justify-center text-rose-500 font-black">R$</div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-tight">Regras Comerciais</h2>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Taxa e prazo para estorno de créditos</p>
                                </div>
                            </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className={labelClass}>Taxa de Estorno (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={businessRules.creditRefundFeePercentage}
                                    onChange={(e) => updateBusinessRules('creditRefundFeePercentage', e.target.value)}
                                    placeholder="5"
                                    className={inputClass}
                                />
                                <p className="mt-2 text-[8px] font-bold text-slate-300">
                                    Percentual descontado do valor solicitado antes da devolucao.
                                </p>
                            </div>
                            <div>
                                <label className={labelClass}>Prazo Maximo de Estorno (horas)</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={businessRules.creditRefundProcessingHours}
                                    onChange={(e) => updateBusinessRules('creditRefundProcessingHours', e.target.value)}
                                    placeholder="48"
                                    className={inputClass}
                                />
                                <p className="mt-2 text-[8px] font-bold text-slate-300">
                                    Prazo exibido ao cliente para conclusao do estorno.
                                </p>
                            </div>
                        </div>
                    </div>

                        <div className="space-y-6 rounded-[40px] border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-rose-600/20 rounded-xl flex items-center justify-center text-rose-500 font-black">🏠</div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-tight">Endereço de Origem</h2>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Remetente padrão para todas as etiquetas</p>
                                </div>
                            </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className={labelClass}>Nome do Responsável</label>
                                <input value={origin.name} onChange={(e) => updateOrigin('name', e.target.value)} placeholder="Nome completo" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Empresa</label>
                                <input value={origin.company} onChange={(e) => updateOrigin('company', e.target.value)} placeholder="TCG Mega Store" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>E-mail</label>
                                <input type="email" value={origin.email} onChange={(e) => updateOrigin('email', e.target.value)} placeholder="contato@email.com" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Telefone</label>
                                <input value={origin.phone} onChange={(e) => updateOrigin('phone', e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
                            </div>
                        </div>

                        <div className="h-px bg-white/10" />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Endereço</label>
                                <input value={origin.address} onChange={(e) => updateOrigin('address', e.target.value)} placeholder="Rua / Avenida" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Número</label>
                                <input value={origin.number} onChange={(e) => updateOrigin('number', e.target.value)} placeholder="123" className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label className={labelClass}>Complemento</label>
                                <input value={origin.complement} onChange={(e) => updateOrigin('complement', e.target.value)} placeholder="Sala, Bloco" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Bairro</label>
                                <input value={origin.district} onChange={(e) => updateOrigin('district', e.target.value)} placeholder="Bairro" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>CEP</label>
                                <input value={origin.postal_code} onChange={(e) => updateOrigin('postal_code', e.target.value)} placeholder="00000-000" className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className={labelClass}>Cidade</label>
                                <input value={origin.city} onChange={(e) => updateOrigin('city', e.target.value)} placeholder="São Paulo" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Estado (UF)</label>
                                <input value={origin.state_abbr} onChange={(e) => updateOrigin('state_abbr', e.target.value)} placeholder="SP" maxLength={2} className={inputClass} />
                            </div>
                        </div>

                        <div className="h-px bg-white/10" />
                        
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest max-w-[240px]">
                                As alterações refletem imediatamente em todas as novas etiquetas geradas.
                            </p>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`h-16 rounded-2xl px-12 text-[11px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50 ${saved
                                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                                    : 'bg-rose-600 text-white shadow-rose-600/30 hover:bg-rose-700 hover:-translate-y-1'
                                    }`}
                            >
                                {saving ? 'Salvando...' : saved ? 'Salvo com sucesso' : 'Salvar configurações'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AdminGuard>
    );
}
