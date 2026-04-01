'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ListingCard from '@/components/ListingCard';
import type { Listing } from '@/types/marketplace';

interface CheckoutModal {
    listing: Listing;
    open: boolean;
}

const CONDITIONS = ['M', 'NM', 'LP', 'MP', 'HP', 'Dmg'];

const CONDITION_BADGE: Record<string, string> = {
    M: 'bg-emerald-500',
    NM: 'bg-emerald-400',
    LP: 'bg-amber-400',
    MP: 'bg-orange-400',
    HP: 'bg-rose-500',
    Dmg: 'bg-red-700',
};

export default function CardOfertasPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkoutModal, setCheckoutModal] = useState<CheckoutModal | null>(null);
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating'>('price_asc');
    const [filterCondition, setFilterCondition] = useState('');
    const [filterLanguage, setFilterLanguage] = useState('');
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');

    useEffect(() => {
        const fetchListings = async () => {
            setLoading(true);
            const decoded = decodeURIComponent(id);

            // 1. O `id` da URL é o UUID da tabela `enriched_inventory`. 
            // Precisamos descobrir qual é o `card_id` (ex: base1-1) e o `nome` real dessa carta
            const { data: enrichedData } = await supabase
                .from('enriched_inventory')
                .select('card_id, name, official_name')
                .eq('id', decoded)
                .single();

            const actualCardId = enrichedData?.card_id || decoded;
            const actualCardName = enrichedData?.official_name || enrichedData?.name || decoded;

            let query = supabase
                .from('seller_listings')
                .select(`
                    *,
                    seller_profiles (
                        display_name,
                        rating_avg,
                        rating_count,
                        total_sales,
                        is_verified,
                        ships_from_state
                    )
                `)
                .eq('status', 'active')
                .gt('quantity', 0);

            // Tenta buscar pelo pokemon_card ID real primeiro
            const { data: byId } = await supabase
                .from('seller_listings')
                .select('id')
                .eq('card_id', actualCardId)
                .eq('status', 'active')
                .limit(1);

            if (byId && byId.length > 0) {
                query = query.eq('card_id', actualCardId);
            } else {
                // Se não achar por ID, usa o nome da carta
                query = query.ilike('card_name', `%${actualCardName}%`);
            }

            const { data, error } = await query.order('price', { ascending: true });
            if (!error && data) setListings(data as Listing[]);
            setLoading(false);
        };

        fetchListings();

        const channel = supabase
            .channel('ofertas-' + id)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_listings' }, () => {
                fetchListings();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id]);

    const handleBuy = (listing: Listing) => {
        setCheckoutError('');
        setCheckoutModal({ listing, open: true });
    };

    const handleCheckout = async (listing: Listing) => {
        setCheckoutLoading(true);
        setCheckoutError('');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/auth/login?redirect=/marketplace/card/' + id + '/ofertas');
            return;
        }

        try {
            const res = await fetch('/api/marketplace/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ listing_id: listing.id, quantity: 1 }),
            });

            const data = await res.json();
            if (!res.ok) { setCheckoutError(data.error || 'Erro ao processar checkout.'); return; }
            if (data.init_point) window.location.href = data.init_point;
        } catch {
            setCheckoutError('Erro de conexão. Tente novamente.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const filtered = listings
        .filter(l => !filterCondition || l.condition === filterCondition)
        .filter(l => !filterLanguage || l.language === filterLanguage)
        .sort((a, b) => {
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            if (sortBy === 'rating') return (b.seller_profiles?.rating_avg ?? 0) - (a.seller_profiles?.rating_avg ?? 0);
            return 0;
        });

    const cardInfo = listings[0] || null;
    const lowestPrice = filtered.length > 0 ? Math.min(...filtered.map(l => l.price)) : null;
    const languages = Array.from(new Set(listings.map(l => l.language)));

    return (
        <div className="animate-fade-up pb-20 pt-10">
            {/* Hero */}
            <section className="page-frame page-hero">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    <div className="shrink-0">
                        {cardInfo?.image_url ? (
                            <div className="relative w-48 mx-auto lg:mx-0">
                                <img src={cardInfo.image_url} alt={cardInfo.card_name} className="w-full rounded-2xl shadow-2xl shadow-slate-900/20" />
                                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                            </div>
                        ) : (
                            <div className="w-48 h-64 mx-auto lg:mx-0 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <span className="text-slate-300 text-5xl">🃏</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.back()}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors"
                            >
                                ← Voltar
                            </button>
                        </div>
                        <span className="eyebrow">Ofertas da comunidade</span>
                        <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                            {cardInfo?.card_name || decodeURIComponent(id)}
                        </h1>
                        {cardInfo && (
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                {cardInfo.card_set}{cardInfo.card_number ? ` · #${cardInfo.card_number}` : ''}
                            </p>
                        )}

                        <div className="grid grid-cols-3 gap-4 pt-4">
                            {[
                                ['Ofertas', loading ? '...' : String(filtered.length)],
                                ['A partir de', lowestPrice != null ? lowestPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'],
                                ['Vendedores', loading ? '...' : String(new Set(listings.map(l => l.seller_profiles?.display_name)).size)],
                            ].map(([label, value]) => (
                                <div key={label} className="surface-card p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-slate-950">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Filtros + Listagens */}
            <section className="page-frame mt-8 space-y-6">
                <div className="surface-card flex flex-wrap items-center gap-3 p-5">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mr-2">Filtrar:</span>
                    <div className="flex flex-wrap gap-2">
                        {CONDITIONS.map(c => (
                            <button
                                key={c}
                                id={`filter-condition-${c}`}
                                onClick={() => setFilterCondition(filterCondition === c ? '' : c)}
                                className={`h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterCondition === c ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    {languages.length > 1 && (
                        <>
                            <div className="h-5 w-px bg-slate-100" />
                            {languages.map(lang => (
                                <button
                                    key={lang}
                                    id={`filter-lang-${lang}`}
                                    onClick={() => setFilterLanguage(filterLanguage === lang ? '' : lang)}
                                    className={`h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterLanguage === lang ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ordenar:</span>
                        <select
                            id="sort-listings"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as typeof sortBy)}
                            className="h-8 rounded-xl border border-slate-100 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
                        >
                            <option value="price_asc">Menor preço</option>
                            <option value="price_desc">Maior preço</option>
                            <option value="rating">Melhor avaliação</option>
                        </select>
                    </div>
                </div>

                {/* Condition guide */}
                <div className="surface-card p-4 flex flex-wrap items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Condição:</span>
                    {CONDITIONS.map(c => (
                        <span key={c} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${CONDITION_BADGE[c] || 'bg-slate-300'}`} />
                            <span className="text-[10px] font-bold text-slate-500">{c}</span>
                        </span>
                    ))}
                    <span className="text-[9px] text-slate-300 ml-2">M=Mint · NM=Near Mint · LP=Lightly · MP=Moderately · HP=Heavily · Dmg=Damaged</span>
                </div>

                {/* Listings Data Table */}
                {loading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div>
                ) : filtered.length === 0 ? (
                    <div className="surface-card flex min-h-64 flex-col items-center justify-center gap-4 p-10 text-center">
                        <span className="text-5xl">🎴</span>
                        <h2 className="text-2xl font-black tracking-tight text-slate-950">
                            {listings.length === 0 ? 'Seja o primeiro a vender esta carta!' : 'Tente remover os filtros'}
                        </h2>
                        {listings.length === 0 && (
                            <a href="/vender/nova-carta" className="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-600 px-8 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950">
                                Publicar minha carta
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="surface-card overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                {filtered.length} oferta{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
                            </p>
                            <a href="/vender/nova-carta" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-slate-950 transition-colors flex items-center gap-1.5">
                                <span className="text-lg leading-none">+</span> Vender minha cópia
                            </a>
                        </div>
                        
                        {/* Table Header Row (Desktop) */}
                        <div className="hidden sm:flex items-center px-4 py-3 bg-white border-b border-slate-200">
                            <div className="flex-[2] text-[9px] font-black uppercase tracking-widest text-slate-400 pl-14">
                                Vendedor
                            </div>
                            <div className="flex-1 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">
                                Qualidade / Idioma
                            </div>
                            <div className="flex-1 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">
                                Extras
                            </div>
                            <div className="flex-1 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-4">
                                Preço Unitário
                            </div>
                            <div className="flex-[1.5] text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-4">
                                Unidades e Compra
                            </div>
                        </div>

                        {/* List rendering */}
                        <div className="divide-y divide-slate-50">
                            {filtered.map(listing => (
                                <ListingCard key={listing.id} listing={listing} onBuy={handleBuy} />
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Checkout Modal */}
            {checkoutModal?.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
                    <div className="surface-card w-full max-w-md p-8 space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Confirmar compra</p>
                            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{checkoutModal.listing.card_name}</h3>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-5 space-y-3">
                            {[
                                ['Condição', checkoutModal.listing.condition],
                                ['Idioma', checkoutModal.listing.language],
                                ['Preço', checkoutModal.listing.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
                                ['Taxa plataforma (8%)', (checkoutModal.listing.price * 0.08).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
                            ].map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500">{label}</span>
                                    <span className="text-[11px] font-black text-slate-900">{value}</span>
                                </div>
                            ))}
                            <div className="h-px bg-slate-200" />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">Total</span>
                                <span className="text-lg font-black text-slate-950">
                                    {checkoutModal.listing.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            A taxa de 8% é descontada do valor recebido pelo vendedor. Pagamento via Mercado Pago.
                        </p>
                        {checkoutError && (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
                                <p className="text-xs font-bold text-rose-600">{checkoutError}</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                id="checkout-cancel"
                                onClick={() => setCheckoutModal(null)}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                id="checkout-confirm"
                                onClick={() => handleCheckout(checkoutModal.listing)}
                                disabled={checkoutLoading}
                                className="flex-1 h-12 rounded-2xl bg-rose-600 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-60"
                            >
                                {checkoutLoading ? 'Processando...' : 'Pagar via Mercado Pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
