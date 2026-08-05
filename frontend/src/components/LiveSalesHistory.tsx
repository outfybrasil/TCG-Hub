'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Gavel } from 'lucide-react';

type Sale = { id: string; lot_number?: number | null; item_name: string; item_image?: string | null; winner_name?: string | null; final_bid: number; created_at: string };

export default function LiveSalesHistory({ liveId, compact = false }: { liveId: string; compact?: boolean }) {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const load = useCallback(async () => {
        try {
            const response = await fetch(`/api/live/history?liveId=${encodeURIComponent(liveId)}&limit=${compact ? 8 : 30}`, { cache: 'no-store' });
            if (response.ok) setSales((await response.json()).history || []);
        } finally { setLoading(false); }
    }, [compact, liveId]);

    useEffect(() => { load(); const timer = window.setInterval(load, 8_000); return () => window.clearInterval(timer); }, [load]);

    if (loading) return <p className="p-5 text-center text-xs text-slate-500">Carregando arremates...</p>;
    if (!sales.length) return <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center"><Gavel className="mx-auto h-6 w-6 text-slate-600" /><p className="mt-2 text-xs text-slate-500">Nenhum lote finalizado nesta live.</p></div>;

    return <div className="space-y-2">{sales.map((sale) => {
        const sold = !!sale.winner_name && Number(sale.final_bid) > 0;
        return <div key={sale.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3">
            <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30">{sale.item_image ? <img src={sale.item_image} alt="" className="h-full w-full object-contain" /> : <Gavel className="h-4 w-4 text-slate-600" />}</div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase tracking-widest text-rose-400">Lote {sale.lot_number || '—'}</span>{sold && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}</div><p className="truncate text-xs font-black text-white">{sale.item_name}</p><p className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-500"><Clock3 className="h-3 w-3" />{exactTime(sale.created_at)} · {sold ? sale.winner_name : 'Sem arremate'}</p></div>
            <div className="text-right"><p className={`text-sm font-black ${sold ? 'text-amber-300' : 'text-slate-600'}`}>{sold ? money(sale.final_bid) : '—'}</p><p className="text-[8px] font-black uppercase tracking-widest text-slate-600">{sold ? 'Vendido' : 'Encerrado'}</p></div>
        </div>;
    })}</div>;
}

function money(value: number) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function exactTime(value: string) { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)); }
