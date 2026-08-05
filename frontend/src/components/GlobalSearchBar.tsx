'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/i18n/routing';

interface SearchResult {
    id: string;
    name: string;
    official_name?: string;
    set?: string;
    official_set_name?: string;
    official_image_url?: string;
    image_url?: string;
    price?: number;
    number?: string;
    local_id?: string;
}

export default function GlobalSearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const requestSequence = useRef(0);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced search against Supabase
    useEffect(() => {
        if (query.trim().length < 2) {
            return;
        }

        const sequence = ++requestSequence.current;
        const timeout = setTimeout(async () => {
            setLoading(true);
            const term = `%${query.trim()}%`;

            const { data } = await supabase
                .from('enriched_inventory')
                .select('id, name, official_name, set, official_set_name, official_image_url, image_url, price, number, local_id')
                .or(`name.ilike.${term},official_name.ilike.${term},set.ilike.${term},official_set_name.ilike.${term},number.ilike.${term},local_id.ilike.${term}`)
                .limit(8);

            if (sequence === requestSequence.current) {
                setResults(data ?? []);
                setOpen(true);
                setLoading(false);
            }
        }, 280);

        return () => clearTimeout(timeout);
    }, [query]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setOpen(false);
            router.push(`/marketplace?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const goToCard = (id: string) => {
        setOpen(false);
        setQuery('');
        router.push(`/marketplace?q=${encodeURIComponent(id)}`);
    };

    const clear = () => {
        setQuery('');
        setResults([]);
        setOpen(false);
        inputRef.current?.focus();
    };

    const displayName = (r: SearchResult) => r.official_name ?? r.name ?? 'Carta';
    const displaySet = (r: SearchResult) => r.official_set_name ?? r.set ?? '';
    const displayNum = (r: SearchResult) => r.local_id ?? r.number ?? '';
    const displayImg = (r: SearchResult) => r.official_image_url ?? r.image_url ?? '';
    const formatBRL = (v?: number) => v != null ? `R$ ${v.toFixed(2).replace('.', ',')}` : '';

    const highlight = (value: string) => {
        const needle = query.trim();
        if (!needle) return value;
        const regex = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return value.split(regex).map((part, index) =>
            part.toLocaleLowerCase() === needle.toLocaleLowerCase()
                ? <mark key={index} className="bg-rose-500/30 text-rose-300 rounded px-0.5 not-italic">{part}</mark>
                : <React.Fragment key={index}>{part}</React.Fragment>
        );
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    autoComplete="off"
                    placeholder="Busque por cartas, coleções, produtos..."
                    value={query}
                    onChange={(e) => {
                        const value = e.target.value;
                        setQuery(value);
                        if (value.trim().length < 2) {
                            requestSequence.current += 1;
                            setResults([]);
                            setOpen(false);
                            setLoading(false);
                        }
                    }}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-full pl-12 pr-32 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
                />
                {query && (
                    <button type="button" onClick={clear} className="absolute inset-y-0 right-20 flex items-center pr-2 text-slate-400 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                )}
                <button
                    type="submit"
                    className="absolute inset-y-1 right-1 px-5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-colors"
                >
                    Buscar
                </button>
            </form>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (results.length > 0 || loading) && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+8px)] left-0 right-0 z-[200] overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
                        style={{ background: '#151c2f' }}
                    >
                        {loading && results.length === 0 && (
                            <div className="flex items-center gap-3 px-5 py-4">
                                <div className="h-4 w-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                                <span className="text-sm text-slate-400">Buscando...</span>
                            </div>
                        )}

                        {results.map((r) => (
                            <button
                                key={r.id}
                                onMouseDown={(e) => { e.preventDefault(); goToCard(r.id); }}
                                className="w-full flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/5 text-left border-b border-white/5 last:border-0"
                            >
                                {/* Thumbnail */}
                                <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5 flex items-center justify-center">
                                    {displayImg(r) ? (
                                        <img src={displayImg(r)} alt={displayName(r)} className="h-full w-full object-contain" loading="lazy" />
                                    ) : (
                                        <Search className="h-4 w-4 text-slate-600" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-white leading-tight truncate">{highlight(displayName(r))}</p>
                                    <p className="text-[11px] mt-0.5" style={{ color: '#8b95b5' }}>
                                        <span>{highlight(displaySet(r))}</span>
                                        {displayNum(r) && (
                                            <> · <span className="text-rose-400 font-bold">{highlight(displayNum(r))}</span></>
                                        )}
                                    </p>
                                </div>

                                {/* Price */}
                                {r.price != null && (
                                    <span className="shrink-0 text-sm font-black" style={{ color: '#f59e0b' }}>
                                        {formatBRL(r.price)}
                                    </span>
                                )}
                            </button>
                        ))}

                        {/* "See all results" footer */}
                        <button
                            onMouseDown={(e) => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }}
                            className="w-full flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 transition-colors border-t border-white/5"
                        >
                            <Search className="h-3.5 w-3.5" />
                            Ver todos os resultados para &quot;{query}&quot;
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
