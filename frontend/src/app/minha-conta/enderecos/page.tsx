'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Address {
    id: string;
    label: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    is_default: boolean;
}

export default function EnderecosPage() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);

    // Form State
    const [label, setLabel] = useState('Principal');
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('user_addresses')
                .select('*')
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (!error) setAddresses(data || []);
        }
        setLoading(false);
    };

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setCep(value);
        if (value.length === 8) {
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
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const payload = {
                user_id: user.id,
                label,
                cep,
                street,
                number,
                complement,
                neighborhood,
                city,
                state,
                is_default: isDefault
            };

            if (editingAddress) {
                await supabase.from('user_addresses').update(payload).eq('id', editingAddress.id);
            } else {
                await supabase.from('user_addresses').insert(payload);
            }

            setShowForm(false);
            setEditingAddress(null);
            resetForm();
            fetchAddresses();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setLabel('Principal');
        setCep('');
        setStreet('');
        setNumber('');
        setComplement('');
        setNeighborhood('');
        setCity('');
        setState('');
        setIsDefault(false);
    };

    const startEdit = (addr: Address) => {
        setEditingAddress(addr);
        setLabel(addr.label);
        setCep(addr.cep);
        setStreet(addr.street);
        setNumber(addr.number);
        setComplement(addr.complement || '');
        setNeighborhood(addr.neighborhood);
        setCity(addr.city);
        setState(addr.state);
        setIsDefault(addr.is_default);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Deseja excluir este endereço?')) {
            await supabase.from('user_addresses').delete().eq('id', id);
            fetchAddresses();
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-16 min-h-screen animate-fade-up">
            <div className="mb-12 flex items-center justify-between">
                <div className="space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/5 text-slate-400 font-black text-[9px] uppercase tracking-widest border border-white/10">
                        Minha Conta
                    </span>
                    <h1 className="text-4xl font-black tracking-tighter text-white">
                        Meus <span className="text-rose-600">Endereços.</span>
                    </h1>
                    <p className="text-slate-500 text-sm">Gerencie seus locais de entrega.</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="h-12 px-6 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/20"
                    >
                        + Novo Endereço
                    </button>
                )}
            </div>

            {showForm ? (
                <div className="bg-slate-900 border border-white/5 p-8 rounded-[40px] shadow-sm animate-fade-in">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Local (ex: Casa, Trabalho)</label>
                                <input required type="text" value={label} onChange={e => setLabel(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CEP</label>
                                <input required type="text" maxLength={8} value={cep} onChange={handleCepChange} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                            <input required type="text" value={street} onChange={e => setStreet(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Número</label>
                                <input required type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" />
                            </div>
                            <div className="space-y-2 col-span-1 md:col-span-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Complemento</label>
                                <input type="text" value={complement} onChange={e => setComplement(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bairro</label>
                                <input required type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                                <input required type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado (UF)</label>
                                <input required type="text" maxLength={2} value={state} onChange={e => setState(e.target.value.toUpperCase())} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="rounded border-white/10 bg-white/5 text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900" />
                            <label htmlFor="isDefault" className="text-xs font-bold text-slate-400">Definir como endereço principal</label>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-white/5 mt-6">
                            <button type="submit" disabled={saving} className="flex-1 h-14 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[20px] shadow-xl shadow-rose-900/20 hover:bg-rose-500 transition-all">
                                {saving ? 'Salvando...' : 'Salvar Endereço'}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-8 border border-white/10 bg-white/5 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-[20px] hover:bg-white/10 hover:text-white transition-all">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-20 text-slate-500 animate-pulse font-bold text-sm uppercase">Buscando endereços...</div>
                    ) : addresses.length === 0 ? (
                        <div className="text-center py-20 bg-slate-900 rounded-[40px] border border-dashed border-white/10">
                            <div className="text-4xl mb-4">📍</div>
                            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Nenhum endereço cadastrado.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {addresses.map((addr) => (
                                <div key={addr.id} className="bg-slate-900 border border-white/5 p-8 rounded-[40px] shadow-sm hover:shadow-rose-900/10 hover:border-white/10 hover:-translate-y-1 transition-all duration-300 relative group">
                                    {addr.is_default && (
                                        <span className="absolute top-6 right-6 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                                            Principal
                                        </span>
                                    )}
                                    <h3 className="text-xl font-black text-white mb-2">{addr.label}</h3>
                                    <div className="space-y-1 text-slate-400 text-sm font-medium">
                                        <p>{addr.street}, {addr.number}</p>
                                        {addr.complement && <p>{addr.complement}</p>}
                                        <p>{addr.neighborhood}</p>
                                        <p>{addr.city} - {addr.state}</p>
                                        <p className="text-[10px] font-black tracking-widest text-slate-500 mt-2">{addr.cep}</p>
                                    </div>
                                    <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
                                        <button onClick={() => startEdit(addr)} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors">Editar</button>
                                        <button onClick={() => handleDelete(addr.id)} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors">Excluir</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
