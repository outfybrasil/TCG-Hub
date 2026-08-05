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
    items?: Array<{
        name: string;
        price: number;
        image_url: string;
        is_live?: boolean;
        live_id?: string;
        lot_number?: number;
        item_type?: string;
    }>;
    live_auctions?: {
        current_item_name: string;
        current_item_image: string;
    };
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
    // Tenta pegar o item da estrutura antiga (items json) ou da nova estrutura (live_auctions join)
    const item = arremate.items?.[0] || {
        name: arremate.live_auctions?.current_item_name || 'Item de Leilão',
        image_url: arremate.live_auctions?.current_item_image || '',
        price: arremate.total_amount || 0
    };
    
    const date = new Date(arremate.created_at);
    const amount = arremate.total_amount || (arremate as any).amount || 0; // fallback for amount
    
    return (
        <div className="bg-slate-900 border border-white/5 p-6 rounded-[32px] shadow-sm hover:shadow-rose-900/10 hover:-translate-y-1 hover:border-white/10 transition-all duration-300 group">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Imagem do Item */}
                <div className="h-32 w-24 bg-black/50 rounded-2xl overflow-hidden flex-shrink-0 border border-white/5">
                    {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-500 text-xs font-black uppercase tracking-widest">
                            S/ Img
                        </div>
                    )}
                </div>

                {/* Detalhes */}
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Item Arrematado</p>
                                <h3 className="text-xl font-black text-white tracking-tighter leading-tight group-hover:text-rose-500 transition-colors">
                                    {item.name}
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Final</p>
                                <p className="text-xl font-black text-white">
                                    R$ {amount.toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Data e Hora</p>
                                <p className="text-[11px] font-bold text-slate-400">
                                    {date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                            </div>
                            {item.lot_number && <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Lote da live</p><p className="text-[11px] font-bold text-slate-400">#{item.lot_number}</p></div>}
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                    arremate.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                    arremate.status === 'shipped' ? 'bg-blue-500/10 text-blue-500' :
                                    arremate.status === 'delivered' ? 'bg-white/10 text-slate-400' :
                                    'bg-amber-500/10 text-amber-500'
                                }`}>
                                    {statusLabels[arremate.status] || arremate.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                        <p className="text-[10px] text-slate-500 font-bold">
                            #{arremate.order_number || arremate.id.split('-')[0].toUpperCase()}
                        </p>
                        <div className="flex items-center gap-4">{item.live_id && <Link href={`/live/${item.live_id}`} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">Ver live</Link>}<Link href={`/minha-conta/pedidos/${arremate.id}`} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:translate-x-1 transition-transform">Ver Pedido →</Link></div>
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

            const { data, error } = await supabase
                .from('purchases')
                .select(`
                    *,
                    live_auctions (
                        current_item_name,
                        current_item_image
                    )
                `)
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
                <div className="h-10 w-10 border-2 border-white/10 border-t-rose-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-up">
            <div className="mb-12 space-y-3">
                <Link href="/minha-conta" className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors">
                    ← Minha Conta
                </Link>
                <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">
                    Histórico de <span className="text-rose-600">Arremates.</span>
                </h1>
                <p className="text-slate-400 text-sm max-w-xl font-medium">
                    Aqui você acompanha todos os itens que ganhou nas lives, os valores pagos com seus créditos e o status de entrega.
                </p>
            </div>

            {arremates.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-white/10 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Nenhum item arrematado ainda.</p>
                    <Link href="/lives">
                        <button className="h-12 px-8 bg-rose-600 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/20">
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
