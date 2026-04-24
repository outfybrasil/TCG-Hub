'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TcgSet { id: string; name: string; }
interface PokemonCard {
    id: string;
    name: string;
    set_name: string;
    local_id: string;
    image_url: string;
    types?: string[];
}

interface FormData {
    card_id: string;
    card_name: string;
    card_set: string;
    card_number: string;
    image_url: string;
    condition: string;
    language: string;
    finish: string;
    grade: string;
    price: string;
    quantity: string;
    ships_from_state: string;
    free_shipping: boolean;
    notes: string;
}

const INITIAL_FORM: FormData = {
    card_id: '',
    card_name: '',
    card_set: '',
    card_number: '',
    image_url: '',
    condition: 'NM',
    language: 'Português',
    finish: 'Normal',
    grade: '',
    price: '',
    quantity: '1',
    ships_from_state: '',
    free_shipping: false,
    notes: '',
};

const STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const PLATFORM_FEE = 0.08;

export default function NovaCartaPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(INITIAL_FORM);
    const [sets, setSets] = useState<TcgSet[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSet, setSelectedSet] = useState('');
    const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
    const [searching, setSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/auth/login?redirect=/vender/nova-carta');
                return;
            }

            const { data } = await supabase
                .from('pokemon_cards')
                .select('set_id, set_name')
                .order('set_name');

            if (data) {
                const uniqueSets = Array.from(
                    new Map(data.map(item => [item.set_id, { id: item.set_id, name: item.set_name }])).values()
                );
                setSets(uniqueSets);
            }
        };
        init();
    }, [router]);

    const searchCards = async () => {
        if (!searchTerm && !selectedSet) return;
        setSearching(true);

        let query = supabase.from('pokemon_cards').select('*');
        if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%,name_es.ilike.%${searchTerm}%`);
        if (selectedSet) query = query.eq('set_id', selectedSet);

        const { data } = await query.limit(60);
        setSearchResults(data || []);
        setSearching(false);
    };

    const selectCard = (card: PokemonCard) => {
        setForm(prev => ({
            ...prev,
            card_id: card.id,
            card_name: card.name,
            card_set: card.set_name,
            card_number: card.local_id || '',
            image_url: card.image_url,
        }));
        setStep(2);
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.card_name || !form.price || !form.condition) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }
        if (parseFloat(form.price) < 0.5) {
            setError('Preço mínimo é R$ 0,50.');
            return;
        }

        setSubmitting(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/auth/login');
            return;
        }

        const res = await fetch('/api/marketplace/listings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                ...form,
                price: parseFloat(form.price),
                quantity: parseInt(form.quantity),
            }),
        });

        if (res.ok) {
            router.push('/vender?success=1');
        } else {
            const d = await res.json();
            setError(d.error || 'Erro ao publicar. Tente novamente.');
        }
        setSubmitting(false);
    };

    const netReceive = form.price ? parseFloat(form.price) * (1 - PLATFORM_FEE) : 0;

    return (
        <div className="animate-fade-up pb-20 pt-10">
            <section className="page-frame page-hero space-y-6">
                <div className="max-w-2xl space-y-3">
                    <span className="eyebrow">Publicar carta</span>
                    <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
                        Venda sua carta<br />em 2 passos.
                    </h1>
                    <p className="text-sm text-slate-500">
                        Taxa da plataforma: <strong className="text-slate-800">8%</strong> sobre o valor de venda.
                    </p>
                </div>

                {/* Steps indicator */}
                <div className="flex items-center gap-3">
                    {([
                        [1, 'Escolher carta'],
                        [2, 'Detalhes & preço'],
                    ] as [number, string][]).map(([s, label]) => (
                        <React.Fragment key={s}>
                            <div className={`flex items-center gap-2 ${step === s ? 'text-slate-950' : step > s ? 'text-slate-400' : 'text-slate-300'}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                                    step === s ? 'bg-rose-600 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {step > s ? '✓' : s}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                            </div>
                            {s === 1 && <div className="flex-1 h-px bg-slate-100 max-w-12" />}
                        </React.Fragment>
                    ))}
                </div>
            </section>

            <section className="page-frame mt-8">
                {/* Step 1: Buscar carta */}
                {step === 1 && (
                    <div className="surface-card p-8 space-y-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">1. Buscar a carta</h2>
                            <div className="h-px flex-1 bg-slate-100" />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                            <input
                                type="text"
                                placeholder="Nome da carta..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && searchCards()}
                                className="flex-1 h-12 px-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-rose-300 transition-all"
                            />
                            <select
                                value={selectedSet}
                                onChange={e => setSelectedSet(e.target.value)}
                                className="flex-1 h-12 px-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-rose-300 transition-all cursor-pointer appearance-none"
                            >
                                <option value="">Todas as coleções</option>
                                {sets.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={searchCards}
                                disabled={searching}
                                className="h-12 px-10 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all disabled:opacity-50"
                            >
                                {searching ? 'Buscando...' : 'Buscar'}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 max-h-[420px] overflow-y-auto pr-1">
                                {searchResults.map(card => (
                                    <button
                                        key={card.id}
                                        id={`select-card-${card.id}`}
                                        onClick={() => selectCard(card)}
                                        className="group bg-white border border-slate-100 rounded-2xl p-3 hover:border-rose-400 hover:shadow-lg transition-all text-left"
                                    >
                                        <div className="aspect-[3/4] mb-2 overflow-hidden rounded-xl">
                                            <img src={card.image_url} alt={card.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-900 truncate">{card.name}</p>
                                        <p className="text-[8px] font-bold text-slate-400 truncate uppercase mt-0.5">{card.set_name}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Detalhes */}
                {step === 2 && (
                    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                        {/* Form */}
                        <div className="surface-card p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">2. Detalhes & preço</h2>
                                    <div className="h-px flex-1 bg-slate-100 w-8" />
                                </div>
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                    ← Trocar carta
                                </button>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                {/* Condição */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Condição *</label>
                                    <select
                                        value={form.condition}
                                        onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
                                        className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-rose-300 bg-white cursor-pointer"
                                    >
                                        <option value="M">Mint (M)</option>
                                        <option value="NM">Near Mint (NM)</option>
                                        <option value="LP">Lightly Played (LP)</option>
                                        <option value="MP">Moderately Played (MP)</option>
                                        <option value="HP">Heavily Played (HP)</option>
                                        <option value="Dmg">Damaged (Dmg)</option>
                                    </select>
                                </div>

                                {/* Idioma */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Idioma *</label>
                                    <select
                                        value={form.language}
                                        onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                                        className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-rose-300 bg-white cursor-pointer"
                                    >
                                        <option>Português</option>
                                        <option>Inglês</option>
                                        <option>Japonês</option>
                                        <option>Espanhol</option>
                                        <option>Coreano</option>
                                    </select>
                                </div>

                                {/* Finish */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Finish</label>
                                    <select
                                        value={form.finish}
                                        onChange={e => setForm(p => ({ ...p, finish: e.target.value }))}
                                        className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-rose-300 bg-white cursor-pointer"
                                    >
                                        <option>Normal</option>
                                        <option>Foil / Holo</option>
                                        <option>Reverse Holo</option>
                                        <option>Full Art</option>
                                        <option>Alternative Art</option>
                                        <option>Secret Rare</option>
                                    </select>
                                </div>

                                {/* Grade */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Grau (ex: PSA 10)</label>
                                    <input
                                        type="text"
                                        value={form.grade}
                                        onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                                        placeholder="Deixe vazio se não gradada"
                                        className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-rose-300"
                                    />
                                </div>

                                {/* Preço */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preço de venda (R$) *</label>
                                    <input
                                        id="listing-price"
                                        type="number"
                                        step="0.01"
                                        min="0.5"
                                        value={form.price}
                                        onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                                        placeholder="0,00"
                                        className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm font-black text-rose-600 outline-none focus:border-rose-300"
                                    />
                                    {form.price && parseFloat(form.price) > 0 && (
                                        <p className="text-[10px] text-slate-400">
                                            Você recebe: <strong className="text-emerald-600">{netReceive.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                                            {' '}(8% retido pela plataforma)
                                        </p>
                                    )}
                                </div>

                                {/* Quantidade */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quantidade</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={form.quantity}
                                        onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                                        className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-900 outline-none focus:border-rose-300"
                                    />
                                </div>

                                {/* Estado */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Você está em (UF)</label>
                                    <select
                                        value={form.ships_from_state}
                                        onChange={e => setForm(p => ({ ...p, ships_from_state: e.target.value }))}
                                        className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:border-rose-300 bg-white cursor-pointer"
                                    >
                                        <option value="">Selecione...</option>
                                        {STATES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Frete grátis */}
                                <div className="space-y-2 flex items-center">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div
                                            onClick={() => setForm(p => ({ ...p, free_shipping: !p.free_shipping }))}
                                            className={`w-10 h-6 rounded-full relative transition-colors ${form.free_shipping ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.free_shipping ? 'left-4' : 'left-0.5'}`} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Frete grátis</span>
                                    </label>
                                </div>
                            </div>

                            {/* Notas */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas adicionais</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="Ex: Carta comprada originalmente em pack. Sem marcas de uso. Guarda em sleeve."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-rose-300 resize-none"
                                />
                                <p className="text-[10px] text-slate-400 text-right">{form.notes.length}/500</p>
                            </div>

                            {error && (
                                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                                    <p className="text-sm font-bold text-rose-600">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-4 pt-2">
                                <Link
                                    href="/vender"
                                    className="flex-1 h-14 inline-flex items-center justify-center rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </Link>
                                <button
                                    id="btn-publicar"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 h-14 rounded-2xl bg-rose-600 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-60 shadow-xl shadow-rose-500/20"
                                >
                                    {submitting ? 'Publicando...' : 'Publicar carta'}
                                </button>
                            </div>
                        </div>

                        {/* Preview lateral */}
                        <div className="space-y-4">
                            <div className="surface-card p-6 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pré-visualização</p>
                                {form.image_url && (
                                    <img
                                        src={form.image_url}
                                        alt={form.card_name}
                                        className="w-32 mx-auto rounded-xl shadow-lg"
                                    />
                                )}
                                <div className="space-y-2">
                                    <p className="font-black text-slate-900">{form.card_name || '—'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        {form.card_set}{form.card_number ? ` · #${form.card_number}` : ''}
                                    </p>
                                    <div className="pt-2 space-y-1.5">
                                        {[
                                            ['Condição', form.condition],
                                            ['Idioma', form.language],
                                            ['Finish', form.finish],
                                            ['Preço', form.price ? parseFloat(form.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'],
                                            ['Você recebe', netReceive > 0 ? netReceive.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'],
                                        ].map(([label, value]) => (
                                            <div key={label} className="flex justify-between">
                                                <span className="text-[10px] text-slate-400">{label}</span>
                                                <span className="text-[10px] font-black text-slate-800">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Lembre-se</p>
                                <ul className="space-y-1.5 text-xs text-amber-700">
                                    <li>• Descreva a condição com honestidade</li>
                                    <li>• Embale bem antes de enviar</li>
                                    <li>• Responda rápido para boa reputação</li>
                                    <li>• 8% de taxa é retida do seu valor recebido</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
