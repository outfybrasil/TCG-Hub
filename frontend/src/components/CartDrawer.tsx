'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

export default function CartDrawer() {
    const { items, removeItem, total, isOpen, setIsOpen } = useCart();
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)} />

            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-black text-slate-900 tracking-tighter">Seu Carrinho</h2>
                    <button onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {items.length === 0 ? (
                        <div className="text-center py-10 space-y-4">
                            <span className="text-4xl">🛒</span>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Carrinho Vazio</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="flex gap-4">
                                <div className="h-20 w-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h4 className="font-bold text-sm text-slate-900 leading-tight">{item.name}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd: {item.quantity}</p>
                                    <p className="font-black text-rose-600">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 p-2" title="Remover">
                                    🗑️
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {items.length > 0 && (
                    <div className="border-t border-slate-100 p-6 bg-slate-50 space-y-6">
                        <div className="flex justify-between items-end">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Estimado</span>
                            <span className="text-3xl font-black text-slate-900">R$ {total.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/pagamento');
                            }}
                            className="w-full h-14 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                        >
                            Finalizar Compra
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
