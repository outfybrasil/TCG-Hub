"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminGuard from '@/components/AdminGuard';

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
    const [origin, setOrigin] = useState<OriginAddress>({
        name: '', phone: '', email: '', company: 'TCG Mega Store',
        address: '', complement: '', number: '', district: '',
        city: '', state_abbr: '', postal_code: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const { data: tokenData } = await supabase
            .from('admin_settings').select('value').eq('key', 'melhor_envio_token').single();
        const { data: originData } = await supabase
            .from('admin_settings').select('value').eq('key', 'origin_address').single();

        if (tokenData?.value) setToken(String(tokenData.value).replace(/"/g, ''));
        if (originData?.value && typeof originData.value === 'object') {
            setOrigin(prev => ({ ...prev, ...(originData.value as OriginAddress) }));
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await Promise.all([
                supabase.from('admin_settings').update({ value: JSON.stringify(token), updated_at: new Date().toISOString() }).eq('key', 'melhor_envio_token'),
                supabase.from('admin_settings').update({ value: origin, updated_at: new Date().toISOString() }).eq('key', 'origin_address'),
            ]);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    const updateOrigin = (key: keyof OriginAddress, value: string) => {
        setOrigin(prev => ({ ...prev, [key]: value }));
    };

    const inputClass = "w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none transition-all placeholder:text-slate-300";
    const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";

    if (loading) return (
        <AdminGuard>
            <div className="max-w-4xl mx-auto px-6 py-12 animate-pulse text-center text-slate-400">
                Carregando configurações...
            </div>
        </AdminGuard>
    );

    return (
        <AdminGuard>
            <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-up">
                <div className="mb-12 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Painel Administrativo</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">
                        Configura<span className="text-rose-600">ções.</span>
                    </h1>
                </div>

                <div className="space-y-8">
                    {/* Melhor Envio Token */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">📦</span>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Melhor Envio</h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Token de integração para geração de etiquetas</p>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Token de API</label>
                            <input
                                type="password"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                placeholder="Cole seu token do Melhor Envio aqui"
                                className={inputClass}
                            />
                            <p className="text-[8px] font-bold text-slate-300 mt-2">
                                Obtenha em: melhorenvio.com.br → Configurações → Tokens de acesso
                            </p>
                        </div>
                    </div>

                    {/* Origin Address */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🏠</span>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Endereço de Origem</h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Remetente padrão para todas as etiquetas</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Nome do Responsável</label>
                                <input value={origin.name} onChange={e => updateOrigin('name', e.target.value)} placeholder="Nome completo" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Empresa</label>
                                <input value={origin.company} onChange={e => updateOrigin('company', e.target.value)} placeholder="TCG Mega Store" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>E-mail</label>
                                <input type="email" value={origin.email} onChange={e => updateOrigin('email', e.target.value)} placeholder="contato@email.com" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Telefone</label>
                                <input value={origin.phone} onChange={e => updateOrigin('phone', e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
                            </div>
                        </div>

                        <div className="h-[1px] bg-slate-100" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Endereço</label>
                                <input value={origin.address} onChange={e => updateOrigin('address', e.target.value)} placeholder="Rua / Avenida" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Número</label>
                                <input value={origin.number} onChange={e => updateOrigin('number', e.target.value)} placeholder="123" className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Complemento</label>
                                <input value={origin.complement} onChange={e => updateOrigin('complement', e.target.value)} placeholder="Sala, Bloco" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Bairro</label>
                                <input value={origin.district} onChange={e => updateOrigin('district', e.target.value)} placeholder="Bairro" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>CEP</label>
                                <input value={origin.postal_code} onChange={e => updateOrigin('postal_code', e.target.value)} placeholder="00000-000" className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Cidade</label>
                                <input value={origin.city} onChange={e => updateOrigin('city', e.target.value)} placeholder="São Paulo" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Estado (UF)</label>
                                <input value={origin.state_abbr} onChange={e => updateOrigin('state_abbr', e.target.value)} placeholder="SP" maxLength={2} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`h-14 px-10 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 ${saved
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                                    : 'bg-slate-900 text-white hover:bg-rose-600 shadow-slate-900/20'
                                }`}
                        >
                            {saving ? 'Salvando...' : saved ? '✓ Salvo com Sucesso' : 'Salvar Configurações'}
                        </button>
                    </div>
                </div>
            </div>
        </AdminGuard>
    );
}
