'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';

export default function PagamentoPage() {
    const router = useRouter();
    const [method, setMethod] = useState<'pix' | 'cartao'>('pix');
    const [loading, setLoading] = useState(false);
    const [pixData, setPixData] = useState<{ qr_code_base64?: string, ticket_url?: string } | null>(null);
    const [user, setUser] = useState<any>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [useCashback, setUseCashback] = useState<boolean>(false);

    const { items, total, clearCart } = useCart();
    const discount = useCashback ? Math.min(walletBalance, total) : 0;
    const finalAmount = Math.max(0, total - discount);

    useEffect(() => {
        // Initialize MP exactly once
        initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY as string, { locale: 'pt-BR' });

        // Fetch logged in user
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUser({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.email?.split('@')[0]
                });
            }
        });
    }, []);

    const handleGeneratePix = async () => {
        setLoading(true);
        try {
            const req = await fetch('/api/pagamento/pix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionAmount: finalAmount || 0.10, // Pix doesn't accept 0, minimum fallback for testing
                    description: `Compra TCG Mega Store - ${items.length} itens`,
                    payerEmail: user?.email || 'teste@exemplo.com',
                    payerFirstName: user?.name || 'Teste',
                    payerLastName: 'Usuário',
                    docType: 'CPF',
                    docNumber: '19119119100',
                    userId: user?.id,
                    useCashback: useCashback,
                    discountAmount: discount
                }),
            });
            const res = await req.json();
            setPixData({ qr_code_base64: res.qr_code_base64, ticket_url: res.ticket_url });
            if (finalAmount === 0 && res.status === 'approved') {
                // 100% paid with cashback
                alert('Pagamento aprovado usando seu saldo de Cashback!');
                clearCart();
                router.push('/');
            }
        } catch (error) {
            console.error('Erro ao gerar PIX:', error);
            alert('Erro ao gerar PIX');
        } finally {
            setLoading(false);
        }
    };

    const initialization = {
        amount: finalAmount || 0.10, // Must provide some amount to Brick
    };

    const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
        setLoading(true);
        console.log("Submit do Brick", formData);

        try {
            const req = await fetch('/api/pagamento/cartao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionAmount: formData.transaction_amount,
                    token: formData.token,
                    description: `Compra de cartas - ${items.length} itens`,
                    installments: formData.installments,
                    paymentMethodId: formData.payment_method_id,
                    issuerId: formData.issuer_id,
                    payerEmail: formData.payer.email || user?.email,
                    userId: user?.id,
                    useCashback: useCashback,
                    discountAmount: discount
                }),
            });
            const res = await req.json();
            if (res.error) throw new Error(res.error);
            alert(`Pagamento aprovado com sucesso! ID: ${res.id}`);
            clearCart();
            router.push('/');
        } catch (error: any) {
            console.error(error);
            alert('Erro ao processar o cartão: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const onError = async (error: any) => {
        console.error(error);
    };

    const onReady = async () => {
        console.log('MP Brick Ready');
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-20 min-h-screen animate-fade-up">
            <div className="mb-12 text-center space-y-4">
                <span className="inline-block px-4 py-1.5 rounded-full bg-rose-50 text-rose-600 font-black text-[10px] uppercase tracking-widest border border-rose-100">
                    Checkout Seguro
                </span>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-none">
                    Finalizar <span className="text-rose-600">Pagamento.</span>
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                    Escolha o método de pagamento para concluir sua compra na TCG Mega Store.
                </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm">

                {/* Resumo do Carrinho & Carteira */}
                <div className="mb-10 space-y-4">
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter border-b border-slate-100 pb-2">Resumo do Pedido</h3>

                    <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                        <span>Subtotal ({items.length} itens):</span>
                        <span>R$ {total.toFixed(2).replace('.', ',')}</span>
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

                {/* Selector */}
                <div className="flex gap-4 mb-10 bg-slate-50 p-2 rounded-2xl">
                    <button
                        onClick={() => { setMethod('pix'); setPixData(null); }}
                        className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${method === 'pix' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                        Pagar com PIX
                    </button>
                    <button
                        onClick={() => { setMethod('cartao'); setPixData(null); }}
                        className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${method === 'cartao' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                        Cartão de Crédito
                    </button>
                </div>

                {/* Content */}
                <div className="min-h-[400px] flex items-center justify-center">
                    {method === 'pix' ? (
                        <div className="w-full text-center space-y-8">
                            {!pixData ? (
                                <div className="space-y-6">
                                    <div className="text-6xl mb-4">💠</div>
                                    <h3 className="text-xl font-black text-slate-900">Pagamento via PIX</h3>
                                    <p className="text-slate-500 font-medium text-sm mb-8">Aprovação imediata. Escaneie o QR Code ou copie a chave Pix.</p>
                                    <button
                                        onClick={handleGeneratePix}
                                        disabled={loading}
                                        className="h-16 px-12 bg-[#00B1EA] text-white font-black uppercase tracking-widest text-[11px] rounded-[24px] shadow-lg shadow-[#00B1EA]/20 hover:bg-[#0092C2] transition-all transform hover:-translate-y-1 disabled:opacity-50"
                                    >
                                        {loading ? 'Gerando PIX...' : 'Gerar Código PIX'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-fade-in">
                                    <h3 className="text-xl font-black text-green-600">PIX Gerado com Sucesso!</h3>
                                    {pixData.qr_code_base64 && (
                                        <div className="flex justify-center">
                                            <div className="p-4 bg-white border-2 border-slate-100 rounded-3xl shadow-sm inline-block">
                                                <img
                                                    src={`data:image/jpeg;base64,${pixData.qr_code_base64}`}
                                                    alt="QR Code PIX"
                                                    className="w-48 h-48"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-x-4">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Escaneie o QR code com o app do seu banco</p>
                                        <a href={pixData.ticket_url} target="_blank" rel="noreferrer">
                                            <button className="h-12 px-8 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-200 transition-all">
                                                Ver Copia e Cola / Link
                                            </button>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full max-w-lg mx-auto">
                            <Payment
                                initialization={initialization}
                                customization={{
                                    paymentMethods: {
                                        creditCard: 'all',
                                        debitCard: 'all',
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
                                                baseColor: '#e11d48', // rose-600
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
