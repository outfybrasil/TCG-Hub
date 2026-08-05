'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ReportListingButton({ listingId, sellerId }: { listingId: string; sellerId?: string }) {
    const [open, setOpen] = useState(false);
    const [category, setCategory] = useState('price_manipulation');
    const [details, setDetails] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    async function submit() {
        if (details.trim().length < 10) return setMessage('Descreva o problema em pelo menos 10 caracteres.');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setMessage('Entre na sua conta para denunciar.');
        setSaving(true);
        const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ listingId, sellerId, category, details }) });
        const result = await response.json();
        setMessage(response.ok ? 'Denúncia enviada para análise.' : result.error || 'Não foi possível enviar.');
        if (response.ok) setDetails('');
        setSaving(false);
    }

    return <><button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-brand-muted hover:text-rose-300"><Flag className="h-3 w-3" />Denunciar</button>{open && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}><div className="surface-card w-full max-w-md rounded-3xl p-6 text-left" onClick={(event) => event.stopPropagation()}><h3 className="text-xl font-black text-white">Denunciar anúncio</h3><p className="mt-1 text-xs text-brand-muted">A equipe revisará o anúncio e o histórico do vendedor.</p><select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-5 h-11 w-full rounded-xl border border-white/10 bg-[#191f31] px-3 text-sm text-white"><option value="price_manipulation">Manipulação de preço</option><option value="counterfeit">Possível falsificação</option><option value="misleading">Descrição enganosa</option><option value="abuse">Comportamento abusivo</option><option value="non_delivery">Não entrega</option><option value="other">Outro</option></select><textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={5} placeholder="Explique o que aconteceu..." className="mt-3 w-full rounded-xl border border-white/10 bg-[#191f31] p-3 text-sm text-white outline-none" />{message && <p className="mt-2 text-xs text-brand-muted">{message}</p>}<div className="mt-5 flex justify-end gap-2"><button onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-brand-muted">Fechar</button><button onClick={submit} disabled={saving} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{saving ? 'Enviando...' : 'Enviar denúncia'}</button></div></div></div>}</>;
}
