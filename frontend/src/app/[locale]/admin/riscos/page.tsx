'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert, ShieldX } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type RiskListing = {
    id: string; card_name: string; card_set: string | null; price: number;
    reference_price: number | null; price_risk_level: string; price_risk_reason: string | null;
    moderation_status: string; seller_profiles: { display_name?: string; is_verified?: boolean; rating_avg?: number; total_sales?: number } | null;
};

export default function RiskListingsPage() {
    const [listings, setListings] = useState<RiskListing[]>([]);
    const [loading, setLoading] = useState(true);
    const load = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/admin/risk-listings', { headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} });
        const data = await response.json();
        setListings(data.listings || []);
        setLoading(false);
    }, []);
    useEffect(() => { void load(); }, [load]);

    async function decide(listingId: string, action: string) {
        const reason = window.prompt('Motivo da decisão (opcional):') || '';
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await fetch('/api/admin/risk-listings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ listingId, action, reason }) });
        await load();
    }

    return (
        <main className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex items-center gap-3"><ShieldAlert className="text-amber-400" /><div><h1 className="text-3xl font-black text-white">Central antifraude</h1><p className="text-sm text-slate-400">Anúncios fora do padrão e decisões auditáveis.</p></div></div>
            {loading ? <p className="mt-10 text-slate-400">Carregando...</p> : (
                <div className="mt-8 space-y-4">{listings.map((item) => (
                    <article key={item.id} className="surface-card rounded-2xl p-5">
                        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                            <div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${item.price_risk_level === 'high' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>{item.price_risk_level}</span><span className="text-xs text-slate-500">{item.moderation_status}</span></div><h2 className="mt-2 font-black text-white">{item.card_name}</h2><p className="text-xs text-slate-400">{item.card_set || 'Sem coleção'} · vendedor {item.seller_profiles?.display_name || 'não identificado'}</p><p className="mt-2 text-xs text-slate-500">{item.price_risk_reason}</p></div>
                            <div className="flex flex-wrap items-center gap-3"><div className="mr-4"><p className="text-xl font-black text-white">R$ {Number(item.price).toFixed(2)}</p><p className="text-[10px] text-slate-500">referência: {item.reference_price ? `R$ ${Number(item.reference_price).toFixed(2)}` : 'insuficiente'}</p></div><button onClick={() => decide(item.id, 'approved')} className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300" title="Aprovar"><CheckCircle2 /></button><button onClick={() => decide(item.id, 'excluded')} className="rounded-xl bg-amber-500/15 p-3 text-amber-300" title="Excluir do índice"><ShieldAlert /></button><button onClick={() => decide(item.id, 'suspended')} className="rounded-xl bg-rose-500/15 p-3 text-rose-300" title="Suspender"><ShieldX /></button></div>
                        </div>
                    </article>
                ))}{listings.length === 0 && <p className="rounded-2xl border border-emerald-500/20 p-8 text-emerald-300">Nenhum anúncio suspeito pendente.</p>}</div>
            )}
        </main>
    );
}
