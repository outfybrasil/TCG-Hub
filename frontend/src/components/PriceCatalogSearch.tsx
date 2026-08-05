'use client';

import Image from 'next/image';
import { Search, ShieldCheck, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/routing';
import { supabase } from '@/lib/supabase';

type CatalogCard = {
    id: string;
    name: string;
    local_id: string | null;
    set_name: string | null;
    image_url: string | null;
};

export default function PriceCatalogSearch() {
    const [query, setQuery] = useState('');
    const [cards, setCards] = useState<CatalogCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('Pesquise pelo nome ou número da carta.');

    useEffect(() => {
        const term = query.trim();
        if (term.length < 2) {
            setCards([]);
            setMessage('Digite pelo menos 2 caracteres para pesquisar.');
            return;
        }

        const timer = window.setTimeout(async () => {
            setLoading(true);
            const safeTerm = term.replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
            const { data, error } = await supabase
                .from('pokemon_cards')
                .select('id, name, local_id, set_name, image_url')
                .or(`name.ilike.%${safeTerm}%,local_id.ilike.%${safeTerm}%`)
                .order('name')
                .limit(24);

            if (error) {
                setCards([]);
                setMessage('Não foi possível consultar o catálogo agora.');
            } else {
                const results = (data || []) as CatalogCard[];
                setCards(results);
                setMessage(results.length ? `${results.length} resultado(s) encontrado(s).` : 'Nenhuma carta encontrada.');
            }
            setLoading(false);
        }, 300);

        return () => window.clearTimeout(timer);
    }, [query]);

    return (
        <section className="space-y-6" aria-label="Consulta de preços de cartas">
            <label className="surface-card flex items-center gap-4 rounded-2xl px-5 py-4 focus-within:border-emerald-400/40">
                <Search className="h-5 w-5 shrink-0 text-emerald-400" />
                <span className="sr-only">Nome ou número da carta</span>
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ex.: Charizard, Pikachu ou 199/165"
                    className="w-full bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-500"
                    maxLength={80}
                    autoComplete="off"
                />
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />}
            </label>

            <p className="text-sm text-slate-400" aria-live="polite">{message}</p>

            {cards.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map((card) => (
                        <Link key={card.id} href={`/edicoes/card/${card.id}`} className="surface-card group flex min-h-36 items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-1 hover:border-emerald-400/30">
                            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
                                {card.image_url ? <Image src={card.image_url} alt={card.name} fill sizes="80px" className="object-contain p-1" /> : <div className="flex h-full items-center justify-center text-slate-600"><ShieldCheck /></div>}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-base font-black text-white group-hover:text-emerald-300">{card.name}</p>
                                <p className="mt-1 text-xs text-slate-400">{card.set_name || 'Coleção não informada'}</p>
                                <p className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400"><TrendingUp className="h-3.5 w-3.5" /> Consultar índice</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
