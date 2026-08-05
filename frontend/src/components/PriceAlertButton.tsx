'use client';

import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
    cardId: string;
    currentPrice: number | null;
    condition?: string;
    finish?: string;
    language?: string;
};

export default function PriceAlertButton({ cardId, currentPrice, condition = '', finish = '', language = '' }: Props) {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    async function saveAlert() {
        const suggestion = currentPrice ? (currentPrice * 0.9).toFixed(2).replace('.', ',') : '';
        const answer = window.prompt('Avise-me quando o índice chegar a qual valor?', suggestion);
        if (answer === null) return;
        const targetPrice = Number(answer.replace(',', '.'));
        if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
            setMessage('Informe um preço válido.');
            return;
        }
        setSaving(true);
        setMessage('');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setMessage('Entre na sua conta para criar alertas.');
            setSaving(false);
            return;
        }
        const response = await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ cardId, targetPrice, condition, finish, language }),
        });
        const result = await response.json();
        setMessage(response.ok ? `Alerta criado para ${targetPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.` : result.error || 'Não foi possível criar o alerta.');
        setSaving(false);
    }

    return <div className="mt-4 lg:text-right"><button onClick={saveAlert} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-[10px] font-black uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"><BellRing className="h-4 w-4" />{saving ? 'Salvando...' : 'Criar alerta de preço'}</button>{message && <p className="mt-2 text-xs text-brand-muted">{message}</p>}</div>;
}
