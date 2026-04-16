'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SellerProfile {
    display_name?: string;
    pix_key?: string;
    pix_key_type?: string;
    total_sales?: number;
    total_revenue?: number;
    balance_pending?: number;
    balance_available?: number;
    rating_avg?: number;
    rating_count?: number;
    is_verified?: boolean;
}

interface Listing {
    id: string;
    card_name: string;
    card_set: string;
    image_url?: string;
    price: number;
    quantity: number;
    condition: string;
    language: string;
    status: string;
    views?: number;
    created_at: string;
}

interface Order {
    id: string;
    quantity: number;
    unit_price: number;
    seller_net_amount: number;
    status: string;
    tracking_code?: string;
    created_at: string;
    seller_listings?: {
        card_name?: string;
        image_url?: string;
        condition?: string;
    };
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    active:    { label: 'Ativa', color: 'text-emerald-600 bg-emerald-50' },
    paused:    { label: 'Pausada', color: 'text-amber-600 bg-amber-50' },
    sold:      { label: 'Vendida', color: 'text-slate-400 bg-slate-50' },
    cancelled: { label: 'Cancelada', color: 'text-red-500 bg-red-50' },
    pending:   { label: 'Aguardando pagamento', color: 'text-amber-600 bg-amber-50' },
    paid:      { label: 'Pago — Enviar', color: 'text-blue-600 bg-blue-50' },
    shipped:   { label: 'Enviado', color: 'text-indigo-600 bg-indigo-50' },
    delivered: { label: 'Entregue', color: 'text-emerald-600 bg-emerald-50' },
    disputed:  { label: 'Disputado', color: 'text-rose-600 bg-rose-50' },
};

export default function VenderPage() {
    const router = useRouter();
    const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [tab, setTab] = useState<'listings' | 'orders' | 'balance' | 'config'>('listings');
    const [loading, setLoading] = useState(true);
    const [trackingModal, setTrackingModal] = useState<{ orderId: string; open: boolean } | null>(null);
    const [trackingCode, setTrackingCode] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [withdrawModal, setWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [pixConfig, setPixConfig] = useState({ key: '', type: 'email' });
    const [savingPix, setSavingPix] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const fetchData = useCallback(async (userId: string, token: string) => {
        const headers = { Authorization: `Bearer ${token}` };

        const [listingsRes, ordersRes] = await Promise.all([
            fetch('/api/marketplace/listings?status=all&seller_id=' + userId, { headers }),
            fetch('/api/marketplace/orders?role=seller', { headers }),
        ]);

        if (listingsRes.ok) {
            const d = await listingsRes.json();
            setListings(d.listings || []);
        }

        if (ordersRes.ok) {
            const d = await ordersRes.json();
            setOrders(d.orders || []);
        }

        // Buscar perfil de vendedor
        const { data: prof } = await supabase
            .from('seller_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (prof) {
            setProfile(prof);
            setPixConfig({ key: prof.pix_key || '', type: prof.pix_key_type || 'email' });
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/auth/login?redirect=/vender');
                return;
            }
            setUser({ id: session.user.id, email: session.user.email });
            await fetchData(session.user.id, session.access_token);
            setLoading(false);
        };
        init();
    }, [fetchData, router]);

    const toggleListingStatus = async (listing: Listing) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const newStatus = listing.status === 'active' ? 'paused' : 'active';
        const res = await fetch(`/api/marketplace/listings/${listing.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ status: newStatus }),
        });

        if (res.ok) {
            setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: newStatus } : l));
            showToast(`Listing ${newStatus === 'active' ? 'ativada' : 'pausada'}.`);
        }
    };

    const deleteListing = async (listingId: string) => {
        if (!confirm('Tem certeza que deseja remover esta listagem?')) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`/api/marketplace/listings/${listingId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
            setListings(prev => prev.filter(l => l.id !== listingId));
            showToast('Listagem removida.');
        }
    };

    const shipOrder = async () => {
        if (!trackingModal || !trackingCode.trim()) return;
        setActionLoading(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`/api/marketplace/orders/${trackingModal.orderId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: 'ship', tracking_code: trackingCode }),
        });

        if (res.ok) {
            setOrders(prev => prev.map(o =>
                o.id === trackingModal.orderId ? { ...o, status: 'shipped', tracking_code: trackingCode } : o
            ));
            setTrackingModal(null);
            setTrackingCode('');
            showToast('Código de rastreio registrado!');
        } else {
            const d = await res.json();
            showToast(d.error || 'Erro ao registrar envio.');
        }
        setActionLoading(false);
    };

    const savePix = async () => {
        if (!pixConfig.key || !user) return;
        setSavingPix(true);

        await supabase.from('seller_profiles').upsert({
            user_id: user.id,
            pix_key: pixConfig.key,
            pix_key_type: pixConfig.type,
            display_name: profile?.display_name || user.email?.split('@')[0] || 'Vendedor',
        }, { onConflict: 'user_id' });

        showToast('Chave PIX salva com sucesso!');
        setSavingPix(false);
    };

    const requestWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount < 10) {
            showToast('Valor mínimo de saque é R$ 10,00');
            return;
        }
        if (!profile?.pix_key) {
            showToast('Configure sua chave PIX antes de solicitar saque.');
            setTab('config');
            setWithdrawModal(false);
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !user) return;

        const { error } = await supabase.from('seller_withdrawals').insert({
            seller_id: user.id,
            amount,
            pix_key: profile.pix_key,
            pix_key_type: profile.pix_key_type || 'email',
        });

        if (error) {
            showToast('Erro ao solicitar saque: ' + error.message);
        } else {
            showToast('Solicitação enviada! O admin processará em até 48h.');
            setWithdrawModal(false);
            setWithdrawAmount('');
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-rose-600" />
            </div>
        );
    }

    const pendingOrders = orders.filter(o => o.status === 'paid');
    const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="animate-fade-up pb-20 pt-10">
            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] rounded-2xl bg-slate-950 px-6 py-4 text-sm font-bold text-white shadow-2xl transition-all">
                    {toast}
                </div>
            )}

            {/* Header */}
            <section className="page-frame page-hero space-y-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-2xl space-y-3">
                        <span className="eyebrow">Painel do vendedor</span>
                        <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Suas vendas,<br />seu controle.
                        </h1>
                        <p className="text-base text-slate-400 leading-relaxed">
                            Publique cartas, gerencie pedidos e solicite repasses. Taxa da plataforma: <strong className="text-rose-500">8% por venda</strong>.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/vender/nova-carta"
                            id="btn-nova-carta"
                            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
                        >
                            <span>+</span> Publicar carta
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        ['Minhas listagens', String(listings.filter(l => l.status === 'active').length)],
                        ['Total de vendas', String(profile?.total_sales || 0)],
                        ['Saldo pendente', formatBRL(profile?.balance_pending || 0)],
                        ['Saldo disponível', formatBRL(profile?.balance_available || 0)],
                    ].map(([label, value]) => (
                        <div key={label} className="surface-card p-6 transition-all hover:scale-[1.02] hover:bg-white/10">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
                            <p className="mt-4 text-3xl font-black tracking-tight text-white">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Alerta de pedidos a enviar */}
                {pendingOrders.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-center gap-4">
                        <span className="text-2xl">📦</span>
                        <div>
                            <p className="font-black text-amber-800">
                                {pendingOrders.length} pedido{pendingOrders.length > 1 ? 's' : ''} aguardando envio
                            </p>
                            <p className="text-sm text-amber-600 mt-0.5">
                                Clique em &ldquo;Pedidos&rdquo; para registrar o código de rastreio.
                            </p>
                        </div>
                        <button
                            onClick={() => setTab('orders')}
                            className="ml-auto shrink-0 h-9 px-5 rounded-xl bg-amber-500 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-amber-600"
                        >
                            Ver pedidos
                        </button>
                    </div>
                )}
            </section>

            {/* Tabs */}
            <section className="page-frame mt-8 space-y-6">
                <div className="surface-card flex gap-1 p-1.5">
                    {([
                        ['listings', 'Minhas Listagens'],
                        ['orders', `Pedidos ${pendingOrders.length > 0 ? `(${pendingOrders.length})` : ''}`],
                        ['balance', 'Saldo & Saques'],
                        ['config', 'Configurações'],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            id={`tab-${key}`}
                            onClick={() => setTab(key)}
                            className={`flex-1 h-12 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                tab === key
                                    ? 'bg-white text-slate-950 shadow-lg'
                                    : 'text-slate-400 hover:bg-white/5'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ---- TAB: Listagens ---- */}
                {tab === 'listings' && (
                    <div className="space-y-4">
                        {listings.length === 0 ? (
                            <div className="surface-card flex min-h-64 flex-col items-center justify-center gap-4 p-10 text-center">
                                <span className="text-5xl">🎴</span>
                                <h2 className="text-2xl font-black tracking-tight text-slate-950">Nenhuma listagem ainda</h2>
                                <p className="text-sm text-slate-500">Publique sua primeira carta e comece a vender.</p>
                                <Link
                                    href="/vender/nova-carta"
                                    className="inline-flex h-12 items-center rounded-2xl bg-rose-600 px-8 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-950 transition-all"
                                >
                                    Publicar primeira carta
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            {['Carta', 'Preço', 'Qtd', 'Status', 'Views', 'Ações'].map(h => (
                                                <th key={h} className="py-4 pr-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {listings.map(listing => {
                                            const st = STATUS_LABEL[listing.status] || { label: listing.status, color: 'text-slate-400 bg-slate-50' };
                                            return (
                                                <tr key={listing.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 pr-4">
                                                        <div className="flex items-center gap-3">
                                                            {listing.image_url && (
                                                                <img src={listing.image_url} alt={listing.card_name} className="h-12 w-8 rounded-lg object-contain shadow" />
                                                            )}
                                                            <div>
                                                                <p className="font-black text-sm text-slate-900">{listing.card_name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{listing.card_set} · {listing.condition} · {listing.language}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <p className="font-black text-slate-900">{formatBRL(listing.price)}</p>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <p className="font-black text-slate-700">{listing.quantity}</p>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <span className={`inline-block rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${st.color}`}>
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <p className="text-[11px] font-bold text-slate-400">{listing.views || 0}</p>
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            {listing.status !== 'sold' && listing.status !== 'cancelled' && (
                                                                <button
                                                                    onClick={() => toggleListingStatus(listing)}
                                                                    className="h-8 px-3 rounded-xl bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
                                                                >
                                                                    {listing.status === 'active' ? 'Pausar' : 'Ativar'}
                                                                </button>
                                                            )}
                                                            {listing.status !== 'sold' && (
                                                                <button
                                                                    onClick={() => deleteListing(listing.id)}
                                                                    className="h-8 px-3 rounded-xl bg-slate-100 text-[9px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-50 transition-all"
                                                                >
                                                                    Remover
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ---- TAB: Pedidos ---- */}
                {tab === 'orders' && (
                    <div className="space-y-4">
                        {orders.length === 0 ? (
                            <div className="surface-card flex min-h-48 flex-col items-center justify-center gap-2 p-10 text-center">
                                <span className="text-4xl">📭</span>
                                <p className="font-black text-slate-500">Nenhum pedido ainda</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {orders.map(order => {
                                    const st = STATUS_LABEL[order.status] || { label: order.status, color: 'text-slate-400 bg-slate-50' };
                                    return (
                                        <div key={order.id} className="surface-card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-4">
                                                {order.seller_listings?.image_url && (
                                                    <img src={order.seller_listings.image_url} alt="" className="h-14 w-10 rounded-lg object-contain shadow shrink-0" />
                                                )}
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm">{order.seller_listings?.card_name || 'Carta'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                        {order.quantity}x · {formatBRL(order.unit_price)} · Você recebe: <strong className="text-emerald-600">{formatBRL(order.seller_net_amount)}</strong>
                                                    </p>
                                                    {order.tracking_code && (
                                                        <p className="text-[10px] font-bold text-indigo-500 mt-0.5">Rastreio: {order.tracking_code}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className={`rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest ${st.color}`}>
                                                    {st.label}
                                                </span>
                                                {order.status === 'paid' && (
                                                    <button
                                                        onClick={() => { setTrackingModal({ orderId: order.id, open: true }); setTrackingCode(''); }}
                                                        className="h-9 px-4 rounded-xl bg-rose-600 text-[9px] font-black uppercase tracking-widest text-white hover:bg-slate-950 transition-all"
                                                    >
                                                        Informar envio
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ---- TAB: Saldo ---- */}
                {tab === 'balance' && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="surface-card p-8 space-y-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Saldo disponível para saque</p>
                                <p className="mt-2 text-4xl font-black tracking-tight text-emerald-600">
                                    {formatBRL(profile?.balance_available || 0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Saldo pendente (aguardando entrega)</p>
                                <p className="mt-2 text-2xl font-black tracking-tight text-amber-500">
                                    {formatBRL(profile?.balance_pending || 0)}
                                </p>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                O saldo fica pendente até que o comprador confirme o recebimento. Após confirmação, é liberado para saque via PIX em até 48h úteis.
                            </p>
                            <button
                                id="btn-solicitar-saque"
                                onClick={() => setWithdrawModal(true)}
                                disabled={(profile?.balance_available || 0) < 10}
                                className="h-12 w-full rounded-2xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-40"
                            >
                                Solicitar saque via PIX
                            </button>
                        </div>

                        <div className="surface-card p-8 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Histórico de receitas</p>
                            <div className="space-y-3">
                                {[
                                    ['Total de vendas', String(profile?.total_sales || 0)],
                                    ['Receita bruta total', formatBRL(profile?.total_revenue || 0)],
                                    ['Taxa da plataforma (8%)', formatBRL((profile?.total_revenue || 0) * 0.08)],
                                    ['Avaliação média', profile?.rating_count ? `${(profile.rating_avg || 0).toFixed(1)} ★ (${profile.rating_count} avaliações)` : 'Sem avaliações'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-xs text-slate-500">{label}</span>
                                        <span className="text-xs font-black text-slate-900">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ---- TAB: Configurações ---- */}
                {tab === 'config' && (
                    <div className="surface-card p-8 space-y-8 max-w-lg">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chave PIX para repasses</p>
                            <p className="mt-1 text-xs text-slate-500">Configure sua chave PIX para receber saques da plataforma.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tipo de chave</label>
                                <select
                                    value={pixConfig.type}
                                    onChange={e => setPixConfig(p => ({ ...p, type: e.target.value }))}
                                    className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-rose-300"
                                >
                                    <option value="email">Email</option>
                                    <option value="cpf">CPF</option>
                                    <option value="telefone">Telefone</option>
                                    <option value="aleatoria">Chave aleatória</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Chave PIX</label>
                                <input
                                    type="text"
                                    value={pixConfig.key}
                                    onChange={e => setPixConfig(p => ({ ...p, key: e.target.value }))}
                                    placeholder={pixConfig.type === 'cpf' ? '000.000.000-00' : pixConfig.type === 'email' ? 'seu@email.com' : 'Informe sua chave'}
                                    className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-rose-300"
                                />
                            </div>
                            <button
                                id="btn-salvar-pix"
                                onClick={savePix}
                                disabled={savingPix || !pixConfig.key}
                                className="h-12 w-full rounded-2xl bg-rose-600 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-60"
                            >
                                {savingPix ? 'Salvando...' : 'Salvar chave PIX'}
                            </button>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-5 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Como funciona o repasse</p>
                            <ol className="space-y-2 text-xs text-slate-500 list-decimal list-inside">
                                <li>Comprador paga → valor entra em &ldquo;Saldo Pendente&rdquo;</li>
                                <li>Comprador confirma recebimento → valor vai para &ldquo;Disponível&rdquo;</li>
                                <li>Você solicita saque → admin faz PIX em até 48h úteis</li>
                                <li>Taxa da plataforma: 8% já descontado automaticamente</li>
                            </ol>
                        </div>
                    </div>
                )}
            </section>

            {/* Modal: Informar rastreio */}
            {trackingModal?.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
                    <div className="surface-card w-full max-w-md p-8 space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Informar envio</p>
                            <h3 className="mt-2 text-xl font-black text-slate-950">Código de rastreio</h3>
                        </div>
                        <input
                            type="text"
                            value={trackingCode}
                            onChange={e => setTrackingCode(e.target.value.toUpperCase())}
                            placeholder="Ex: BR123456789BR"
                            className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-rose-300 uppercase"
                        />
                        <p className="text-xs text-slate-400">Informe o código dos Correios/transportadora. O comprador poderá rastrear o envio.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setTrackingModal(null)}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                id="btn-confirmar-envio"
                                onClick={shipOrder}
                                disabled={actionLoading || !trackingCode.trim()}
                                className="flex-1 h-12 rounded-2xl bg-rose-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-950 transition-all disabled:opacity-60"
                            >
                                {actionLoading ? 'Salvando...' : 'Confirmar envio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Saque */}
            {withdrawModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
                    <div className="surface-card w-full max-w-md p-8 space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Solicitar saque</p>
                            <h3 className="mt-2 text-xl font-black text-slate-950">Quanto deseja sacar?</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Disponível: <strong className="text-emerald-600">{formatBRL(profile?.balance_available || 0)}</strong>
                            </p>
                        </div>
                        <input
                            type="number"
                            min="10"
                            max={profile?.balance_available || 0}
                            step="0.01"
                            value={withdrawAmount}
                            onChange={e => setWithdrawAmount(e.target.value)}
                            placeholder="0,00"
                            className="w-full h-14 rounded-2xl border border-slate-200 px-4 text-2xl font-black text-slate-900 outline-none focus:border-rose-300"
                        />
                        <p className="text-xs text-slate-400">Chave PIX: <strong>{profile?.pix_key || 'Não configurada'}</strong></p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setWithdrawModal(false)}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                id="btn-confirmar-saque"
                                onClick={requestWithdraw}
                                className="flex-1 h-12 rounded-2xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-950 transition-all"
                            >
                                Solicitar saque
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
