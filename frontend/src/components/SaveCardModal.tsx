'use client';

// Note: MercadoPago.js V2 currently implies loading a script dynamically
// For maximum security, the card data is inputted into MP iframes, so our DOM never sees the data.

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SaveCardModalProps {
    onClose: () => void;
    onSuccess: (updatedCards: any[]) => void;
}

export default function SaveCardModal({ onClose, onSuccess }: SaveCardModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [mp, setMp] = useState<any>(null);
    const [cardForm, setCardForm] = useState<any>(null);

    // Initial script load
    useEffect(() => {
        const loadMpInfo = async () => {
            if (!document.getElementById('mp-v2')) {
                const script = document.createElement('script');
                script.id = 'mp-v2';
                script.src = 'https://sdk.mercadopago.com/js/v2';
                script.onload = () => initMp();
                document.body.appendChild(script);
            } else {
                initMp();
            }
        };

        const initMp = () => {
            const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
            if (!publicKey) {
                setError('Chave pública do Mercado Pago não configurada.');
                return;
            }
            // @ts-ignore
            const mpObj = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
            setMp(mpObj);
        };

        loadMpInfo();
    }, []);

    // Initialize CardForm
    useEffect(() => {
        if (!mp) return;

        const initCardForm = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('Usuário não autenticado.');
                return;
            }

            const cf = mp.cardForm({
                amount: '1.00', // Amount irrelevant for tokenization, but required by some versions
                iframe: true,
                form: {
                    id: 'form-checkout',
                    cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número do cartão' },
                    expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/YY' },
                    securityCode: { id: 'form-checkout__securityCode', placeholder: 'Cód. Segurança' },
                    cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular do cartão' },
                    issuer: { id: 'form-checkout__issuer', placeholder: 'Banco emissor' },
                    installments: { id: 'form-checkout__installments', placeholder: 'Parcelas' },
                    identificationType: { id: 'form-checkout__identificationType', placeholder: 'Tipo de documento' },
                    identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: 'Número do documento' },
                    cardholderEmail: { id: 'form-checkout__cardholderEmail', placeholder: 'E-mail' },
                },
                callbacks: {
                    onFormMounted: (error: any) => {
                        if (error) return console.warn('Form Mounted Error: ', error);
                        setLoading(false);
                    },
                    onSubmit: async (event: any) => {
                        event.preventDefault();
                        setSaving(true);
                        setError('');

                        try {
                            const {
                                paymentMethodId: payment_method_id,
                                issuerId: issuer_id,
                                cardholderEmail: email,
                                amount,
                                token,
                                installments,
                                identificationNumber,
                                identificationType,
                            } = cf.getCardFormData();

                            // 1. Get or create MP Customer
                            const custRes = await fetch('/api/pagamento/customer', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.id, email: user.email })
                            });
                            const custData = await custRes.json();
                            if (!custRes.ok) throw new Error(custData.error || 'Erro ao sincronizar com Mercado Pago.');

                            // 2. Send Token to our backend to attach to Customer and save reference
                            const saveRes = await fetch('/api/pagamento/cartao/salvar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    token,
                                    customerId: custData.customerId,
                                    userId: user.id,
                                    cardHolderName: user.email
                                })
                            });

                            const saveData = await saveRes.json();
                            if (!saveRes.ok) throw new Error(saveData.error || 'Erro ao salvar cartão.');

                            // Success - close and refresh
                            cf.unmount();
                            onSuccess([]); // Let parent refetch

                        } catch (err: any) {
                            setError(err.message || 'Erro inesperado ao cadastrar.');
                            setSaving(false);
                        }
                    },
                    onFetching: (resource: any) => {
                        // console.log('Fetching resource: ', resource);
                    }
                }
            });

            setCardForm(cf);
        };

        initCardForm();

        return () => {
            if (cardForm) cardForm.unmount();
        };
    }, [mp]);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-10 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={() => {
                        if (cardForm) cardForm.unmount();
                        onClose();
                    }}
                    className="absolute top-6 right-6 h-8 w-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                    ✕
                </button>

                <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-2">Novo Cartão</h3>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        <span>🔒</span> Ambiente Seguro e Criptografado (PCI-DSS)
                    </p>
                    <p className="text-[9px] text-slate-400 mt-2 font-bold leading-relaxed">
                        Os dados do seu cartão são enviados diretamente para o Mercado Pago e não são armazenados em nossos servidores.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{error}</p>
                    </div>
                )}

                <div className={loading ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 transition-opacity duration-500'}>
                    <form id="form-checkout" className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Número do Cartão</label>
                            <div id="form-checkout__cardNumber" className="h-14 px-4 border border-slate-200 rounded-2xl flex items-center"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Validade</label>
                                <div id="form-checkout__expirationDate" className="h-14 px-4 border border-slate-200 rounded-2xl flex items-center"></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">CVV</label>
                                <div id="form-checkout__securityCode" className="h-14 px-4 border border-slate-200 rounded-2xl flex items-center"></div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Titular do Cartão</label>
                            <input type="text" id="form-checkout__cardholderName" className="w-full h-14 px-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Nome impresso no cartão" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Tipo Doc.</label>
                                <select id="form-checkout__identificationType" className="w-full h-14 px-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 bg-white"></select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Número Doc.</label>
                                <input type="text" id="form-checkout__identificationNumber" className="w-full h-14 px-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="CPF/CNPJ" />
                            </div>
                        </div>

                        {/* Hidden fields required by MP */}
                        <select id="form-checkout__issuer" className="hidden"></select>
                        <select id="form-checkout__installments" className="hidden"></select>
                        <input type="email" id="form-checkout__cardholderEmail" className="hidden" />

                        <button
                            type="submit"
                            id="form-checkout__submit"
                            disabled={saving}
                            className="w-full h-14 mt-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] hover:bg-rose-600 transition-all rounded-2xl disabled:opacity-50"
                        >
                            {saving ? 'Criptografando e Salvando...' : 'Cadastrar Cartão Seguro'}
                        </button>
                    </form>
                </div>

                {loading && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Carregando ambiente seguro...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
