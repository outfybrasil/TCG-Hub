'use client';

import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionCard from '@/components/AuctionCard';

const RuleItem = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
    <div className="flex gap-4 group/rule bg-white/50 backdrop-blur-sm p-6 rounded-[32px] border border-slate-100 hover:border-rose-200 hover:bg-rose-50/50 transition-all duration-300 shadow-sm">
        <div className="h-12 w-12 shrink-0 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover/rule:scale-110 transition-transform">
            {icon}
        </div>
        <div className="space-y-1">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{title}</h4>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-tight">{desc}</p>
        </div>
    </div>
);

function AuctionSkeleton() {
    return (
        <div className="bg-white border border-slate-100 rounded-[30px] overflow-hidden animate-pulse">
            <div className="aspect-square bg-slate-100 rounded-t-[24px]" />
            <div className="p-6 space-y-4">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-10 bg-slate-50 rounded-xl" />
            </div>
        </div>
    );
}

export default function AuctionPage() {
    const { auctions, loading } = useAuctions();
    const [user, setUser] = React.useState<{ id: string; email?: string } | null>(null);
    const [subscribing, setSubscribing] = React.useState(false);

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
    }, []);

    const handleSubscribe = async () => {
        if (!('Notification' in window)) {
            alert('Seu navegador não suporta notificações nativas.');
            return;
        }

        setSubscribing(true);
        try {
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                alert('Permissão para notificações foi negada no navegador.');
                setSubscribing(false);
                return;
            }

            // Permissão concedida! Vamos notificar no navegador para testar.
            new Notification('TCG Hub - Alertas Ativados!', {
                body: 'Você será avisado assim que novos Super Leilões começarem.',
                icon: '/favicon.ico'
            });

            // Ainda salvamos o email opcionalmente para alertas por e-mail no futuro
            let email = user?.email;
            if (!email) {
                const promptedEmail = prompt('Notificação de navegador ativada! Deseja também receber por e-mail? Digite seu e-mail (ou deixe em branco):');
                if (promptedEmail && promptedEmail.includes('@')) {
                    email = promptedEmail;
                }
            }

            if (email) {
                const res = await fetch('/api/leilao/notificacoes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, userId: user?.id })
                });
                const data = await res.json();
                if (!res.ok) console.warn(data.error);
            }

            alert('Notificações de navegador ativadas com sucesso!');
        } catch (error) {
            alert('Erro ao ativar notificações. Tente novamente.');
        } finally {
            setSubscribing(false);
        }
    };

    const active = auctions.filter(a => a.status === 'active' && new Date(a.endsAt) > new Date());
    const ended = auctions.filter(a => a.status === 'ended' || new Date(a.endsAt) <= new Date());

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-up border-t border-slate-50">

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 border-b border-slate-200 pb-12">
                <div className="space-y-6 flex-1">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Leilões ao Vivo via Secure Stream</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                            Leilão Exclusivo <span className="text-rose-600">Loja.</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest max-w-lg">
                            Oportunidades únicas de aquisição para membros da nossa comunidade.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {user?.email === 'admin@tcghub.com.br' && (
                            <Link href="/leilao/criar">
                                <button className="h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg hover:bg-rose-600 transition-all transform hover:-translate-y-1">
                                    Criar Leilão
                                </button>
                            </Link>
                        )}
                        <button
                            onClick={() => document.getElementById('regras')?.scrollIntoView({ behavior: 'smooth' })}
                            className="h-12 px-8 bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                            Regras Gerais
                        </button>
                    </div>
                </div>

                <div className="flex gap-12 pt-8 lg:pt-0">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Leilões Ativos</span>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{loading ? '—' : active.length}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Volume Total</span>
                        <p className="text-2xl font-black text-rose-600 tracking-tighter">
                            {loading ? '—' : `R$ ${(auctions.reduce((s, a) => s + a.currentBid, 0) / 1000).toFixed(1)}K`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Active Auctions */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[...Array(4)].map((_, i) => <AuctionSkeleton key={i} />)}
                </div>
            ) : active.length === 0 ? (
                <div className="text-center py-32 border border-dashed border-slate-200 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum leilão ativo no momento</p>
                    {user?.email === 'admin@tcghub.com.br' && (
                        <Link href="/leilao/criar">
                            <button className="mt-8 h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-rose-600 transition-all">
                                Iniciar o Primeiro Leilão
                            </button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {active.map(a => <AuctionCard key={a.id} auction={a} />)}
                </div>
            )}

            {/* Ended Section */}
            {!loading && ended.length > 0 && (
                <div className="mt-24 space-y-8">
                    <div className="flex items-center gap-6">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap">Leilões Encerrados</h2>
                        <div className="h-[1px] flex-1 bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {ended.map(a => <AuctionCard key={a.id} auction={a} />)}
                    </div>
                </div>
            )}

            {/* CTA Banner */}
            <div className="mt-24 p-12 bg-slate-900 rounded-[50px] relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-rose-500/30" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Premium Auction Service</span>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Receba Alertas de Novos Leilões.</h2>
                    </div>
                    <button
                        onClick={handleSubscribe}
                        disabled={subscribing}
                        className="h-16 px-12 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/50 whitespace-nowrap disabled:opacity-50"
                    >
                        {subscribing ? 'Ativando...' : 'Ativar Notificações'}
                    </button>
                </div>
            </div>

            {/* General Rules Section */}
            <div id="regras" className="mt-24 pt-12 border-t border-slate-100 animate-fade-up">
                <div className="bg-slate-50/50 border border-slate-100 p-10 md:p-16 rounded-[60px] space-y-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                                <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Protocolo de Segurança</span>
                            </div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">Regras <span className="text-rose-600">Gerais.</span></h2>
                        </div>
                        <p className="max-w-md text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            Para garantir a melhor experiência em nossa plataforma, todos os usuários devem seguir as diretrizes abaixo.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <RuleItem
                            icon="⏱️"
                            title="Anti-sniper Ativo"
                            desc="Lances nos últimos 15 segundos adicionam +15s ao cronômetro para garantir lances justos."
                        />
                        <RuleItem
                            icon="🛡️"
                            title="Compromisso Real"
                            desc="Lances são vinculativos. O não pagamento gera banimento imediato da plataforma."
                        />
                        <RuleItem
                            icon="📦"
                            title="Logística de Frete"
                            desc="O custo e modalidade de envio são combinados diretamente entre as partes após o encerramento."
                        />
                        <RuleItem
                            icon="💳"
                            title="Saldo em Créditos"
                            desc="Necessário saldo em conta TCG Hub para cobrir o valor total do lance realizado."
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
