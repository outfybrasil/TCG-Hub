'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuction } from '@/hooks/useAuction';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import Link from 'next/link';

const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

let mpInitialized = false;

export default function AuctionCheckoutPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { auction, loading: auctionLoading } = useAuction(id);
    const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [shippingCost, setShippingCost] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [finishing, setFinishing] = useState(false);

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

    useEffect(() => {
        if (!mpInitialized) {
            mpInitialized = true;
            initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY as string, { locale: 'pt-BR' });
        }

        const fetchData = async (userId: string) => {
            const { data: addressData } = await supabase
                .from('user_addresses')
                .select('*')
                .eq('user_id', userId)
                .order('is_default', { ascending: false });

            if (addressData) {
                setAddresses(addressData);
                const defaultAddr = addressData.find(a => a.is_default) || addressData[0];
                if (defaultAddr && auction) {
                    setSelectedAddressId(defaultAddr.id);
                    setShippingCost(calculateShipping(defaultAddr.state, auction.currentBid));
                }
            }
        };

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUser({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.email?.split('@')[0]
                });
                fetchData(user.id);
            } else {
                router.push('/auth/login');
            }
        });
    }, [auction, router]);

    const handleFinalize = async (mpData?: any) => {
        if (!auction || !user || !selectedAddressId) return;
        setFinishing(true);

        try {
            const selectedAddress = addresses.find(a => a.id === selectedAddressId);
            const res = await fetch('/api/leilao/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId: id,
                    userId: user.id,
                    amount: auction.currentBid,
                    shippingAddress: selectedAddress,
                    shippingCost: shippingCost,
                    paymentMethod: mpData?.payment_method_id || 'credits',
                    mpPaymentId: mpData?.id
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert('Leilão finalizado com sucesso! Sua carta será preparada para envio.');
            router.push(`/leilao/${id}`);
        } catch (err: any) {
            alert(err.message || 'Erro ao finalizar leilão.');
        } finally {
            setFinishing(false);
        }
    };

    if (auctionLoading || !auction) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Amount to be paid via MP (Shipping + any other balance if bid wasn't fully covered, but here we assume bid is covered by credits)
    const amountToPay = shippingCost;

    return (
        <div className="max-w-4xl mx-auto px-6 py-20 min-h-screen animate-fade-up">
            <div className="mb-12 text-center space-y-4">
                <span className="inline-block px-4 py-1.5 rounded-full bg-rose-50 text-rose-600 font-black text-[10px] uppercase tracking-widest border border-rose-100">
                    Finalização de Leilão
                </span>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-none">
                    Parabéns, <span className="text-rose-600">Vencedor!</span>
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                    Configure o envio para receber sua carta: <strong>{auction.cardName}</strong>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left: Address Selection */}
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-xl font-black text-slate-900 tracking-tighter">Endereço de Entrega</h3>
                            <Link href="/minha-conta/enderecos" className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline">
                                Gerenciar
                            </Link>
                        </div>

                        {addresses.length > 0 ? (
                            <div className="space-y-4">
                                {addresses.map(addr => (
                                    <div
                                        key={addr.id}
                                        onClick={() => {
                                            setSelectedAddressId(addr.id);
                                            setShippingCost(calculateShipping(addr.state, auction.currentBid));
                                        }}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedAddressId === addr.id
                                            ? 'border-rose-500 bg-rose-50/50'
                                            : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{addr.label}</span>
                                            {selectedAddressId === addr.id && (
                                                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-slate-900">{addr.street}, {addr.number}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Nenhum endereço encontrado</p>
                                <Link href="/minha-conta/enderecos">
                                    <button className="h-12 px-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all">
                                        Cadastrar Endereço
                                    </button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Payment Brick for Shipping */}
                    {amountToPay > 0 && selectedAddressId && (
                        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
                            <h3 className="text-xl font-black text-slate-900 tracking-tighter border-b border-slate-100 pb-4 mb-6">Pagamento do Frete</h3>
                            <Payment
                                initialization={{
                                    amount: amountToPay,
                                    payer: { email: user?.email || '' }
                                }}
                                customization={{
                                    paymentMethods: { creditCard: 'all', ticket: 'all', bankTransfer: 'all', mercadoPago: 'all' },
                                    visual: { style: { theme: 'default', customVariables: { baseColor: '#e11d48' } } }
                                }}
                                onSubmit={async (formData: any) => {
                                    setLoading(true);
                                    try {
                                        const mpReq = await fetch('/api/pagamento/cartao', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                transactionAmount: amountToPay,
                                                token: formData.token,
                                                description: `Frete Leilão - ${auction.cardName}`,
                                                installments: formData.installments,
                                                paymentMethodId: formData.payment_method_id,
                                                issuerId: formData.issuer_id,
                                                payerEmail: user?.email,
                                                userId: user?.id,
                                            })
                                        });
                                        const mpRes = await mpReq.json();
                                        if (mpRes.error) throw new Error(mpRes.error);

                                        // Once shipping is paid, finalize the auction credit consumption
                                        await handleFinalize(mpRes);
                                    } catch (e: any) {
                                        alert(e.message || 'Erro no pagamento do frete');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Right: Summary */}
                <div className="space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6 sticky top-8">
                        <img src={auction.imageUrl} alt={auction.cardName} className="w-full aspect-[3/4] object-contain rounded-2xl mb-4" />

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resumo Financeiro</h4>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Lance Vencedor:</span>
                                <span className="font-black">{formatBRL(auction.currentBid)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Status Créditos:</span>
                                <span className="text-emerald-400 font-bold uppercase tracking-widest text-[8px]">Já Bloqueados</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-t border-white/5 pt-4">
                                <span className="text-slate-400">Frete:</span>
                                <span className="font-black text-rose-500">{shippingCost === 0 ? 'Grátis' : formatBRL(shippingCost)}</span>
                            </div>
                            <div className="flex justify-between items-end pt-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total a Pagar Agora</span>
                                <span className="text-2xl font-black text-yellow-400">{formatBRL(amountToPay)}</span>
                            </div>
                        </div>

                        {(amountToPay === 0 || !selectedAddressId) && (
                            <button
                                onClick={() => handleFinalize()}
                                disabled={!selectedAddressId || finishing}
                                className="w-full h-14 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all disabled:opacity-50"
                            >
                                {finishing ? 'Processando...' : 'Finalizar e Confirmar Entrega'}
                            </button>
                        )}

                        <p className="text-[8px] text-slate-500 font-medium text-center uppercase tracking-widest">
                            Checkout Seguro via Mercado Pago & TCG Hub
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
