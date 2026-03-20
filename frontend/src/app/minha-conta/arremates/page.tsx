'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Arremate {
    id: string;
    order_number: string;
    created_at: string;
    total_amount: number;
    status: string;
    items: Array<{
        name: string;
        price: number;
        image_url: string;
        is_live?: boolean;
    }>;
}

const statusLabels: Record<string, string> = {
    pending: 'Aguardando Pagamento',
    approved: 'Arremate Confirmado',
    shipped: 'Enviado',
    delivered: 'Entregue',
    refunded: 'Reembolsado',
    canceled: 'Cancelado',
    rejected: 'Recusado'
};

function ArremateCard({ arremate }: { arremate: Arremate }) {
    const item = arremate.items[0]; // Normalmente leilão live é 1 item por "pedido"
    const date = new Date(arremate.created_at);
    
    return (
        <div className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all group">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Imagem do Item */}
                <div className="h-32 w-24 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                    {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300 text-xs font-black uppercase tracking-widest">
                            No Image
                        </div>
                    )}
                </div>

                {/* Detalhes */}
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Item Arrematado</p>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-tight group-hover:text-rose-600 transition-colors">
                                    {item.name}
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Final</p>
                                <p className="text-xl font-black text-slate-900">
                                    R$ {arremate.total_amount.toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data e Hora</p>
                                <p className="text-[11px] font-bold text-slate-600">
                                    {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                    arremate.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                    arremate.status === 'shipped' ? 'bg-blue-50 text-blue-600' :
                                    arremate.status === 'delivered' ? 'bg-slate-100 text-slate-600' :
                                    'bg-amber-50 text-amber-600'
                                }`}>
                                    {statusLabels[arremate.status] || arremate.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                        <p className="text-[10px] text-slate-400 font-bold">
                            #{arremate.order_number || arremate.id.split('-')[0].toUpperCase()}
                        </p>
                        <Link href={`/minha-conta/pedidos/${arremate.id}`} className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:translate-x-1 transition-transform">
                            Ver Detalhes do Pedido →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MeusArrematesPage() {
    const [arremates, setArremates] = useState<Arremate[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadArremates = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/auth/login');
                return;
            }

            // Filtramos por payment_method = 'live_credits' que é o padrão dos arremates de live
            const { data, error } = await supabase
                .from('purchases')
                .select('*')
                .eq('user_id', user.id)
                .eq('payment_method', 'live_credits')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar arremates:', error);
            } else {
                setArremates(data || []);
            }
            setLoading(false);
        };

        loadArremates();
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-up">
            <div className="mb-12 space-y-3">
                <Link href="/minha-conta" className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
                    ← Minha Conta
                </Link>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
                    Histórico de <span className="text-rose-600">Arremates.</span>
                </h1>
                <p className="text-slate-500 text-sm max-w-xl font-medium">
                    Aqui você acompanha todos os itens que ganhou nas lives, os valores pagos com seus créditos e o status de entrega.
                </p>
            </div>

            {arremates.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-slate-200 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Nenhum item arrematado ainda.</p>
                    <Link href="/lives">
                        <button className="h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-600 transition-all">
                            Ver Lives ao Vivo
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6">
                    {arremates.map(a => (
                        <ArremateCard key={a.id} arremate={a} />
                    ))}
                </div>
            )}
        </div>
    );
}
