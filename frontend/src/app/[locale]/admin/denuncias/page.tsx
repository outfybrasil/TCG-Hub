'use client';

import { useCallback, useEffect, useState } from 'react';
import { Flag, CheckCircle2, Search, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Report = {
    id: string; category: string; details: string; status: string; resolution: string | null; created_at: string;
    seller_listings: { card_name?: string; card_set?: string; price?: number } | null;
    seller_profiles: { display_name?: string; is_verified?: boolean; rating_avg?: number; total_sales?: number } | null;
};

const labels: Record<string, string> = { counterfeit: 'Possível falsificação', misleading: 'Descrição enganosa', price_manipulation: 'Manipulação de preço', abuse: 'Abuso', non_delivery: 'Não entrega', other: 'Outro' };

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setLoading(false);
        const response = await fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await response.json();
        setReports(data.reports || []);
        setLoading(false);
    }, []);
    useEffect(() => { void load(); }, [load]);

    async function decide(id: string, status: 'reviewing' | 'resolved' | 'dismissed') {
        const resolution = status === 'reviewing' ? '' : window.prompt('Registre a conclusão desta análise:') || '';
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await fetch('/api/admin/reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ id, status, resolution }) });
        await load();
    }

    return <main className="mx-auto max-w-7xl px-6 py-12"><div className="flex items-center gap-3"><Flag className="text-rose-400" /><div><h1 className="text-3xl font-black text-white">Denúncias</h1><p className="text-sm text-slate-400">Relatos da comunidade e decisões registradas.</p></div></div>{loading ? <p className="mt-10 text-slate-400">Carregando...</p> : <div className="mt-8 space-y-4">{reports.map((report) => <article key={report.id} className="surface-card rounded-2xl p-5"><div className="flex flex-col justify-between gap-5 lg:flex-row"><div className="max-w-3xl"><div className="flex gap-2"><span className="rounded-full bg-rose-500/15 px-2 py-1 text-[9px] font-black uppercase text-rose-300">{labels[report.category] || report.category}</span><span className="rounded-full bg-white/5 px-2 py-1 text-[9px] uppercase text-slate-400">{report.status}</span></div><h2 className="mt-3 font-black text-white">{report.seller_listings?.card_name || 'Relato sobre vendedor'}</h2><p className="text-xs text-slate-400">{report.seller_listings?.card_set || 'Sem coleção'} · {report.seller_profiles?.display_name || 'Vendedor não identificado'}</p><p className="mt-3 text-sm leading-6 text-slate-300">{report.details}</p>{report.resolution && <p className="mt-3 text-xs text-emerald-300">Conclusão: {report.resolution}</p>}</div><div className="flex items-center gap-2"><button onClick={() => decide(report.id, 'reviewing')} className="rounded-xl bg-blue-500/15 p-3 text-blue-300" title="Em análise"><Search /></button><button onClick={() => decide(report.id, 'resolved')} className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300" title="Resolver"><CheckCircle2 /></button><button onClick={() => decide(report.id, 'dismissed')} className="rounded-xl bg-slate-500/15 p-3 text-slate-300" title="Descartar"><XCircle /></button></div></div></article>)}{reports.length === 0 && <p className="rounded-2xl border border-emerald-500/20 p-8 text-emerald-300">Nenhuma denúncia registrada.</p>}</div>}</main>;
}
