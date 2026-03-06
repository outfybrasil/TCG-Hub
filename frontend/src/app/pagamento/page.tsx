'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

// Module-level singleton to prevent double-init in React 18 Strict Mode
let mpInitialized = false;

export default function PagamentoPage() {

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [useCashback, setUseCashback] = useState<boolean>(false);
    const [shippingCost, setShippingCost] = useState<number>(0);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [dataReady, setDataReady] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const brickKeyRef = useRef(0);

    const { items, total, clearCart } = useCart();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Shipping Logic
    const calculateShipping = (uf: string, subtotal: number) => {
        const state = uf.toUpperCase();
        if (state === 'SP' || state === 'PR') {
            return subtotal >= 200 ? 0 : 15;
        }
        if (['RJ', 'MG', 'ES', 'SC', 'RS'].includes(state)) {
            return 15;
        }
        return 30;
    };

    const discount = useCashback ? Math.min(walletBalance, total + shippingCost) : 0;
    const finalAmount = Math.max(0, total + shippingCost - discount);

    useEffect(() => {
        // Initialize MP exactly once (guard against React 18 Strict Mode double-invoke)
        if (!mpInitialized) {
            const pk = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
            console.log("MP Public Key status:", pk ? `Loaded (${pk.substring(0, 10)}...)` : "MISSING");
            if (!pk) {
                console.error("ERRO CRÍTICO: Chave Pública do Mercado Pago está ausente. Reinicie o servidor Next.js se você acabou de editar o .env!");
            } else {
                mpInitialized = true;
                initMercadoPago(pk, { locale: 'pt-BR' });
            }
        }

        let cancelled = false;

        const bootstrap = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (cancelled || !authUser) return;

            setUser({
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.name || authUser.email?.split('@')[0]
            });

            const [walletRes, addressRes] = await Promise.all([
                supabase.from('wallets').select('balance').eq('user_id', authUser.id).maybeSingle(),
                supabase.from('user_addresses').select('*').eq('user_id', authUser.id).order('is_default', { ascending: false })
            ]);

            if (cancelled) return;

            if (!walletRes.error && walletRes.data) {
                setWalletBalance(walletRes.data.balance);
            }

            if (!addressRes.error && addressRes.data) {
                setAddresses(addressRes.data);
                const defaultAddr = addressRes.data.find((a: any) => a.is_default) || addressRes.data[0];
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                    setShippingCost(calculateShipping(defaultAddr.state, total));
                }
            }

            // All data loaded — safe to render the Brick once
            setDataReady(true);
        };

        bootstrap();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Preference state for Wallet Checkout Pro
    const [preferenceId, setPreferenceId] = useState<string | null>(null);

    useEffect(() => {
        if (!dataReady || !isMounted || !user) return;

        const generatePreference = async () => {
            try {
                setPreferenceId(null);
                const req = await fetch('/api/pagamento/preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        useCashback,
                        discountAmount: discount,
                        totalAmount: total,
                        shippingAddress: addresses.find(a => a.id === selectedAddressId),
                        items: items.map((i) => ({ id: i.id, title: i.name, unit_price: i.price, quantity: i.quantity })),
                        payer: { email: user.email }
                    }),
                });
                const res = await req.json();

                if (res.isCashbackOnly) {
                    setPreferenceId('cashback-only');
                    return;
                }

                if (res.id) {
                    setPreferenceId(res.id);
                } else {
                    console.error("Falha ao gerar preference:", res.error);
                }
            } catch (err) {
                console.error("Erro ao gerar API preference:", err);
            }
        };

        const timeout = setTimeout(() => {
            generatePreference();
        }, 500);

        return () => clearTimeout(timeout);
    }, [dataReady, isMounted, total, useCashback, discount, selectedAddressId, items, user, addresses]);

    if (!isMounted) return null;

    return (
        <div className="max-w-4xl mx-auto px-6 py-20 min-h-screen animate-fade-up">
            <div className="mb-12 text-center space-y-4">
                <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest border border-blue-100">
                    Checkout Seguro Mercado Pago
                </span>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-none">
                    Finalizar <span className="text-blue-600">Pagamento.</span>
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                    Utilizamos a tecnologia do Mercado Livre / Mercado Pago para todas as opções.
                </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm">

                {/* Endereço de Entrega */}
                <div className="mb-10 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xl font-black text-slate-900 tracking-tighter">Endereço de Entrega</h3>
                        <Link href="/minha-conta/enderecos" className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline">
                            Gerenciar Endereços
                        </Link>
                    </div>

                    {addresses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {addresses.map(addr => (
                                <div
                                    key={addr.id}
                                    onClick={() => {
                                        setSelectedAddressId(addr.id);
                                        setShippingCost(calculateShipping(addr.state, total));
                                    }}
                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedAddressId === addr.id
                                        ? 'border-rose-500 bg-rose-50/50'
                                        : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{addr.label}</span>
                                        {selectedAddressId === addr.id && (
                                            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                        )}
                                    </div>
                                    <p className="text-xs font-bold text-slate-900">{addr.street}, {addr.number}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Nenhum endereço cadastrado</p>
                            <Link href="/minha-conta/enderecos">
                                <button className="h-10 px-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all">
                                    Adicionar Endereço
                                </button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Resumo do Carrinho & Carteira */}
                <div className="mb-10 space-y-4">
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter border-b border-slate-100 pb-2">Resumo do Pedido</h3>

                    <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                        <span>Subtotal ({items.length} itens):</span>
                        <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                        <span>Frete:</span>
                        <span className={shippingCost === 0 ? "text-emerald-600 font-bold" : ""}>
                            {shippingCost === 0 ? 'Grátis' : `R$ ${shippingCost.toFixed(2).replace('.', ',')}`}
                        </span>
                    </div>

                    {walletBalance > 0 && (
                        <label className="flex items-center justify-between bg-rose-50 border border-rose-100 p-4 rounded-2xl cursor-pointer">
                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={useCashback}
                                    onChange={(e) => setUseCashback(e.target.checked)}
                                    className="w-5 h-5 accent-rose-600 cursor-pointer"
                                />
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-rose-600">Usar Saldo da Carteira</p>
                                    <p className="text-xs text-rose-700/70 font-medium">Você tem R$ {walletBalance.toFixed(2).replace('.', ',')} disponíveis para abater.</p>
                                </div>
                            </div>
                            <span className="font-black text-rose-600">- R$ {discount.toFixed(2).replace('.', ',')}</span>
                        </label>
                    )}

                    <div className="flex justify-between items-end border-t border-slate-100 pt-4 mt-4 !mt-6">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</span>
                        <span className="text-3xl font-black text-slate-900">R$ {finalAmount.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="w-full">
                    {preferenceId === 'cashback-only' || (finalAmount === 0 && useCashback && walletBalance >= total) ? (
                        <div className="text-center py-12 p-8 border-2 border-dashed border-rose-200 bg-rose-50 rounded-3xl">
                            <div className="text-4xl mb-4">🎉</div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 mb-2">Checkout 100% via Cashback!</h3>
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        // Mock do checkout com cashback total (API lida retornando isCashbackOnly)
                                        const req = await fetch('/api/pagamento/preference', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                totalAmount: 0,
                                                useCashback: true,
                                                discountAmount: discount,
                                                userId: user?.id,
                                                payer: { email: user?.email },
                                                items: items.map((i) => ({ id: i.id, title: i.name, unit_price: i.price, quantity: i.quantity })),
                                                shippingAddress: addresses.find(a => a.id === selectedAddressId),
                                            }),
                                        });
                                        const res = await req.json();
                                        alert('Pedido concluído com sucesso usando saldo de CashBack!');
                                        clearCart();
                                        router.push('/minha-conta/pedidos?status=success');
                                    } catch (e) { console.error(e); alert('Erro no fechamento do pedido.'); }
                                    finally { setLoading(false); }
                                }}
                                disabled={loading}
                                className="mt-6 h-14 px-10 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl hover:bg-rose-700 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Processando...' : 'Finalizar Pedido Grátis'}
                            </button>
                        </div>
                    ) : !dataReady || !preferenceId ? (
                        <div className="w-full py-16 text-center">
                            <div className="text-blue-600 font-bold tracking-widest uppercase text-xs animate-pulse">
                                Gerando checkout seguro...
                            </div>
                        </div>
                    ) : (
                        <div className="w-full mx-auto relative flex justify-center mt-8">
                            {loading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-[30px]">
                                    <div className="text-blue-600 font-bold tracking-widest uppercase text-xs animate-pulse">
                                        Processando...
                                    </div>
                                </div>
                            )}
                            <Wallet
                                initialization={{ preferenceId, redirectMode: 'blank' }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
