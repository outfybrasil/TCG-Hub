'use client';

// Note: MercadoPago.js V2 currently implies loading a script dynamically
// For maximum security, the card data is inputted into MP iframes, so our DOM never sees the data.

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CardFormData {
    token?: string;
}

interface MercadoPagoCardForm {
    getCardFormData: () => CardFormData;
    unmount: () => void;
}

interface MercadoPagoInstance {
    cardForm: (config: {
        amount: string;
        iframe: boolean;
        form: Record<string, unknown>;
        callbacks: {
            onFormMounted: (error: unknown) => void;
            onSubmit: (event: { preventDefault: () => void }) => Promise<void>;
            onFetching: (_resource: unknown) => void;
        };
    }) => MercadoPagoCardForm;
}

declare global {
    interface Window {
        MercadoPago?: new (publicKey: string, options: { locale: string }) => MercadoPagoInstance;
    }
}

interface SaveCardModalProps {
    onClose: () => void;
    onSuccess: (updatedCards: unknown[]) => void;
}

export default function SaveCardModal({ onClose, onSuccess }: SaveCardModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [mp, setMp] = useState<MercadoPagoInstance | null>(null);
    const [cardForm, setCardForm] = useState<MercadoPagoCardForm | null>(null);

    useEffect(() => {
        const initMp = () => {
            const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
            if (!publicKey) {
                setError('Chave pÃºblica do Mercado Pago nÃ£o configurada.');
                return;
            }

            const MercadoPagoCtor = window.MercadoPago;
            if (!MercadoPagoCtor) {
                setError('SDK do Mercado Pago nÃ£o carregada.');
                return;
            }

            const mpObj = new MercadoPagoCtor(publicKey, { locale: 'pt-BR' });
            setMp(mpObj);
        };

        if (!document.getElementById('mp-v2')) {
            const script = document.createElement('script');
            script.id = 'mp-v2';
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.onload = initMp;
            document.body.appendChild(script);
            return;
        }

        initMp();
    }, []);

    const getAuthHeaders = async (headers: HeadersInit = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        return {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    useEffect(() => {
        if (!mp) return;

        let mountedForm: MercadoPagoCardForm | null = null;

        const initCardForm = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('UsuÃ¡rio nÃ£o autenticado.');
                return;
            }

            const cf = mp.cardForm({
                amount: '1.00',
                iframe: true,
                form: {
                    id: 'form-checkout',
                    cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'NÃºmero do cartÃ£o' },
                    expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/YY' },
                    securityCode: { id: 'form-checkout__securityCode', placeholder: 'CÃ³d. SeguranÃ§a' },
                    cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular do cartÃ£o' },
                    issuer: { id: 'form-checkout__issuer', placeholder: 'Banco emissor' },
                    installments: { id: 'form-checkout__installments', placeholder: 'Parcelas' },
                    identificationType: { id: 'form-checkout__identificationType', placeholder: 'Tipo de documento' },
                    identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: 'NÃºmero do documento' },
                    cardholderEmail: { id: 'form-checkout__cardholderEmail', placeholder: 'E-mail' },
                },
                callbacks: {
                    onFormMounted: (mountError: unknown) => {
                        if (mountError) {
                            console.warn('Form Mounted Error:', mountError);
                            return;
                        }

                        setLoading(false);
                    },
                    onSubmit: async (event: { preventDefault: () => void }) => {
                        event.preventDefault();
                        setSaving(true);
                        setError('');

                        try {
                            const { token } = cf.getCardFormData();

                            const custRes = await fetch('/api/pagamento/customer', {
                                method: 'POST',
                                headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({}),
                            });
                            const custData = await custRes.json();
                            if (!custRes.ok) {
                                throw new Error(custData.error || 'Erro ao sincronizar com Mercado Pago.');
                            }

                            const saveRes = await fetch('/api/pagamento/cartao/salvar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    token,
                                    customerId: custData.customerId,
                                    userId: user.id,
                                    cardHolderName: user.email,
                                }),
                            });

                            const saveData = await saveRes.json();
                            if (!saveRes.ok) {
                                throw new Error(saveData.error || 'Erro ao salvar cartÃ£o.');
                            }

                            cf.unmount();
                            onSuccess([]);
                        } catch (submitError: unknown) {
                            setError(submitError instanceof Error ? submitError.message : 'Erro inesperado ao cadastrar.');
                            setSaving(false);
                        }
                    },
                    onFetching: () => {
                        // SDK hook intentionally ignored.
                    },
                },
            });

            mountedForm = cf;
            setCardForm(cf);
        };

        void initCardForm();

        return () => {
            mountedForm?.unmount();
        };
    }, [mp, onSuccess]);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-10 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={() => {
                        cardForm?.unmount();
                        onClose();
                    }}
                    className="absolute top-6 right-6 h-8 w-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                    âœ•
                </button>

                <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-2">Novo CartÃ£o</h3>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        <span>ðŸ”’</span> Ambiente Seguro e Criptografado (PCI-DSS)
                    </p>
                    <p className="text-[9px] text-slate-400 mt-2 font-bold leading-relaxed">
                        Os dados do seu cartÃ£o sÃ£o enviados diretamente para o Mercado Pago e nÃ£o sÃ£o armazenados em nossos servidores.
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
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">NÃºmero do CartÃ£o</label>
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
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Titular do CartÃ£o</label>
                            <input type="text" id="form-checkout__cardholderName" className="w-full h-14 px-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Nome impresso no cartÃ£o" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Tipo Doc.</label>
                                <select id="form-checkout__identificationType" className="w-full h-14 px-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 bg-white"></select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">NÃºmero Doc.</label>
                                <input type="text" id="form-checkout__identificationNumber" className="w-full h-14 px-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="CPF/CNPJ" />
                            </div>
                        </div>

                        <select id="form-checkout__issuer" className="hidden"></select>
                        <select id="form-checkout__installments" className="hidden"></select>
                        <input type="email" id="form-checkout__cardholderEmail" className="hidden" />

                        <button
                            type="submit"
                            id="form-checkout__submit"
                            disabled={saving}
                            className="w-full h-14 mt-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] hover:bg-rose-600 transition-all rounded-2xl disabled:opacity-50"
                        >
                            {saving ? 'Criptografando e Salvando...' : 'Cadastrar CartÃ£o Seguro'}
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
