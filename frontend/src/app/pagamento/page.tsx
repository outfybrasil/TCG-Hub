'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
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
    const [brickKey, setBrickKey] = useState(0); // forces brick remount when amount changes

    const { items, total, clearCart } = useCart();

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
            mpInitialized = true;
            initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY as string, { locale: 'pt-BR' });
        }

        const fetchData = async (userId: string) => {
            // Fetch Wallet
            const walletReq = supabase.from('wallets').select('balance').eq('user_id', userId).single();
            // Fetch Addresses
            const addressReq = supabase.from('user_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false });

            const [walletRes, addressRes] = await Promise.all([walletReq, addressReq]);

            if (!walletRes.error && walletRes.data) {
                setWalletBalance(walletRes.data.balance);
            }

            if (!addressRes.error && addressRes.data) {
                setAddresses(addressRes.data);
                const defaultAddr = addressRes.data.find(a => a.is_default) || addressRes.data[0];
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                    setShippingCost(calculateShipping(defaultAddr.state, total));
                }
            }
        };

        // Fetch logged in user
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUser({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.email?.split('@')[0]
                });
                fetchData(user.id);
            }
        });
    }, [total]);

    const initialization = {
        amount: finalAmount || 0.10, // Must provide some amount to Brick
        payer: {
            email: user?.email || '',
        }
    };

    const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; ticketUrl: string } | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onSubmit = async (formData: any) => {
        setLoading(true);
        console.log("Submit do Brick", formData);

        try {
            // Using the card/general checkout endpoint that handles the tokenized/brick data
            const req = await fetch('/api/pagamento/cartao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionAmount: formData.transaction_amount || finalAmount,
                    token: (formData as unknown as Record<string, unknown>).token,
                    description: `Compra de cartas - ${items.length} itens`,
                    installments: (formData as unknown as Record<string, unknown>).installments,
                    paymentMethodId: (formData as unknown as Record<string, unknown>).payment_method_id,
                    issuerId: (formData as unknown as Record<string, unknown>).issuer_id,
                    payerEmail: (formData as unknown as { payer?: { email?: string }; transaction_amount?: number }).payer?.email || user?.email || 'teste@exemplo.com',
                    payer: (formData as unknown as Record<string, unknown>).payer,
                    userId: user?.id,
                    useCashback: useCashback,
                    discountAmount: discount,
                    totalAmount: total,
                    shippingAddress: addresses.find(a => a.id === selectedAddressId),
                    items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, imageUrl: i.imageUrl }))
                }),
            });
            const res = await req.json();
            if (res.error) throw new Error(res.error);

            if (res.qr_code) {
                setPixData({
                    qrCode: res.qr_code,
                    qrCodeBase64: res.qr_code_base64,
                    ticketUrl: res.ticket_url
                });
                return;
            }

            alert(`Pedido finalizado com sucesso! (Mercado Pago ID: ${res.id})`);
            clearCart();
            router.push('/');
        } catch (error) {
            console.error(error);
            alert('Erro ao processar o pagamento: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onError = async (error: any) => {
        console.error(error);
    };

    const onReady = async () => {
        console.log('MP Brick Ready');
    };

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
                    {pixData ? (
                        <div className="text-center py-12 p-8 border-2 border-blue-100 bg-blue-50/30 rounded-3xl animate-fade-up">
                            <div className="text-4xl mb-4">💠</div>
                            <h3 className="text-2xl font-black tracking-tight text-slate-900 mb-2">Escaneie o QR Code</h3>
                            <p className="text-slate-500 text-sm font-medium mb-8">
                                Acesse seu banco, selecione Pix e escaneie o código abaixo para pagar.
                            </p>

                            <div className="max-w-[240px] mx-auto bg-white p-4 rounded-3xl shadow-xl border border-blue-50 mb-8 overflow-hidden">
                                <img
                                    src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`}
                                    alt="QR Code PIX"
                                    className="w-full h-auto rounded-xl"
                                />
                            </div>

                            <div className="space-y-4 max-w-sm mx-auto">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pix Copia e Cola</p>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            readOnly
                                            value={pixData.qrCode}
                                            className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-600 outline-none"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(pixData.qrCode);
                                                alert('Código Pix copiado!');
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 bg-slate-900 text-white font-black uppercase text-[9px] rounded-lg hover:bg-blue-600 transition-all"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push('/')}
                                    className="w-full h-14 border border-blue-200 text-blue-700 font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-white transition-all"
                                >
                                    Já paguei / Voltar para a Loja
                                </button>
                            </div>
                        </div>
                    ) : finalAmount === 0 && useCashback && walletBalance >= total ? (
                        <div className="text-center py-12 p-8 border-2 border-dashed border-rose-200 bg-rose-50 rounded-3xl">
                            <div className="text-4xl mb-4">🎉</div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 mb-2">Checkout 100% via Cashback!</h3>
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        // Mock do checkout com cashback total (A API cartao precisa lidar com isso se token for undefined, ou fazemos mock manual)
                                        const req = await fetch('/api/pagamento/cartao', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                transactionAmount: 0.10, // dummy
                                                token: 'wallet_checkout', // flag symbolica
                                                description: `Checkout 100% Wallet - ${items.length} itens`,
                                                payerEmail: user?.email || 'teste@exemplo.com',
                                                useCashback: true,
                                                discountAmount: discount
                                            }),
                                        });
                                        const res = await req.json();
                                        alert('Pedido concluído com sucesso usando saldo de CashBack!');
                                        clearCart();
                                        router.push('/');
                                    } catch (e) { console.error(e); alert('Erro no fechamento do pedido.'); }
                                    finally { setLoading(false); }
                                }}
                                disabled={loading}
                                className="mt-6 h-14 px-10 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl hover:bg-rose-700 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Processando...' : 'Finalizar Pedido Grátis'}
                            </button>
                        </div>
                    ) : (
                        <div className="w-full mx-auto relative">
                            {loading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-[30px]">
                                    <div className="text-blue-600 font-bold tracking-widest uppercase text-xs animate-pulse">
                                        Processando...
                                    </div>
                                </div>
                            )}
                            <Payment
                                key={`${finalAmount}-${useCashback}`}
                                initialization={initialization}
                                customization={{
                                    paymentMethods: {
                                        creditCard: 'all',
                                        ticket: 'all',
                                        bankTransfer: 'all',
                                        mercadoPago: 'all'
                                    },
                                    visual: {
                                        style: {
                                            theme: 'default',
                                            customVariables: {
                                                textPrimaryColor: '#0f172a',
                                                textSecondaryColor: '#64748b',
                                                baseColor: '#2563eb', // blue-600 for MP
                                            }
                                        }
                                    }
                                }}
                                onSubmit={onSubmit}
                                onReady={onReady}
                                onError={onError}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
