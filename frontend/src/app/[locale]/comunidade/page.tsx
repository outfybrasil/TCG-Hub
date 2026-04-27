'use client';

import React, { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { MessageCircle, Users, Trophy, Newspaper, ChevronRight, Heart, Reply } from 'lucide-react';

const FORUM_TOPICS = [
    { id: 1, category: 'Decklists', title: 'Meu deck Miraidon ex pós-banlist — atingindo Top 8 em regional', replies: 42, likes: 128, author: 'trainerAsh', time: '2h atrás', hot: true },
    { id: 2, category: 'Dúvidas', title: 'Como funciona o sistema de créditos para leilão?', replies: 7, likes: 15, author: 'novato2025', time: '4h atrás', hot: false },
    { id: 3, category: 'Avaliações', title: 'Comprei 3 ETBs do Destino de Paldea — review completo', replies: 19, likes: 67, author: 'openingPacks', time: '6h atrás', hot: false },
    { id: 4, category: 'Mercado', title: 'Valorização das ex Ilustração Rara — vale guardar?', replies: 31, likes: 94, author: 'investidorTCG', time: '1d atrás', hot: true },
    { id: 5, category: 'Torneios', title: '[REGIONAL SP] Resultados e análise do meta — Abril 2025', replies: 55, likes: 203, author: 'refereeTCG', time: '1d atrás', hot: true },
    { id: 6, category: 'Decklists', title: 'Charizard ex Standard — guia completo para iniciantes', replies: 28, likes: 87, author: 'deckmaster', time: '2d atrás', hot: false },
];

const CATEGORY_COLORS: Record<string, string> = {
    'Decklists': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Dúvidas': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Avaliações': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Mercado': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    'Torneios': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const STATS = [
    { label: 'Membros', value: '12.4K', icon: Users },
    { label: 'Tópicos', value: '3.8K', icon: MessageCircle },
    { label: 'Torneios', value: '47', icon: Trophy },
];

export default function ComunidadePage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'forum' | 'noticias' | 'torneios'>('forum');

    return (
        <div className="min-h-screen pb-20" style={{ background: '#0c1324' }}>
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-white/5 py-16">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/3 top-0 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />
                    <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-rose-600/10 blur-3xl" />
                </div>
                <div className="page-frame relative">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-4">
                            <div className="eyebrow">Hub Social</div>
                            <h1 className="font-black text-white" style={{ fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.03em', lineHeight: 0.9 }}>
                                Comunidade<br /><span style={{ color: '#e11d48' }}>TCG Hub</span>
                            </h1>
                            <p className="max-w-xl text-sm" style={{ color: '#8b95b5' }}>
                                Fórum, notícias, torneios e discussões sobre o universo Pokémon TCG. Conecte-se com outros treinadores.
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {STATS.map(({ label, value, icon: Icon }) => (
                                <div key={label} className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                                    <Icon className="h-5 w-5 text-rose-500" />
                                    <span className="text-2xl font-black text-white">{value}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Tabs */}
            <section className="page-frame pt-8">
                <div className="flex gap-1 rounded-2xl border border-white/5 bg-white/[0.02] p-1 w-fit">
                    {(['forum', 'noticias', 'torneios'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all capitalize ${
                                activeTab === tab ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}>
                            {tab === 'forum' ? 'Fórum' : tab === 'noticias' ? 'Notícias' : 'Torneios'}
                        </button>
                    ))}
                </div>
            </section>

            {/* Content */}
            <section className="page-frame mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
                {/* Main */}
                <div className="space-y-3">
                    {activeTab === 'forum' && (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-black text-white">Tópicos em destaque</h2>
                                <Link href="/comunidade/novo" className="btn-primary" style={{ height: 40, fontSize: 10 }}>+ Novo Tópico</Link>
                            </div>
                            {FORUM_TOPICS.map(topic => (
                                <div key={topic.id} onClick={() => router.push(`/comunidade/${topic.id}`)} className="group flex gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:border-rose-500/20 hover:bg-rose-500/[0.03] cursor-pointer">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${CATEGORY_COLORS[topic.category] || 'bg-white/10 text-white'}`}>
                                                {topic.category}
                                            </span>
                                            {topic.hot && (
                                                <span className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300">🔥 Hot</span>
                                            )}
                                        </div>
                                        <h3 className="font-black text-white text-sm group-hover:text-rose-400 transition-colors leading-snug">{topic.title}</h3>
                                        <p className="mt-2 text-[11px]" style={{ color: '#8b95b5' }}>
                                            por <span className="text-white font-bold">@{topic.author}</span> · {topic.time}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-3 shrink-0">
                                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-rose-500 transition-colors" />
                                        <div className="flex gap-3">
                                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                                <Reply className="h-3 w-3" /> {topic.replies}
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                                <Heart className="h-3 w-3" /> {topic.likes}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {activeTab === 'noticias' && (
                        <div className="flex flex-col items-center gap-4 py-20 text-center">
                            <Newspaper className="h-12 w-12 text-white/10" />
                            <h3 className="text-xl font-black text-white">Notícias em breve</h3>
                            <p className="max-w-sm text-sm" style={{ color: '#8b95b5' }}>Estamos preparando artigos e novidades sobre o meta competitivo e novos lançamentos.</p>
                        </div>
                    )}

                    {activeTab === 'torneios' && (
                        <div className="flex flex-col items-center gap-4 py-20 text-center">
                            <Trophy className="h-12 w-12 text-white/10" />
                            <h3 className="text-xl font-black text-white">Próximos Torneios</h3>
                            <p className="max-w-sm text-sm" style={{ color: '#8b95b5' }}>Organize ou participe de torneios na TCG Hub. Funcionalidade chegando em breve.</p>
                            <Link href="/suporte" className="btn-primary" style={{ height: 44 }}>Quero organizar um torneio</Link>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <aside className="space-y-5">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>Categorias</h3>
                        {Object.entries(CATEGORY_COLORS).map(([cat, cls]) => (
                            <button key={cat} className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-black transition-all hover:opacity-80 ${cls}`}>
                                <span>{cat}</span>
                                <ChevronRight className="h-3 w-3" />
                            </button>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-rose-400">Entre na Comunidade</h3>
                        <p className="text-xs" style={{ color: '#8b95b5' }}>Crie sua conta para participar dos fóruns, discussões e torneios.</p>
                        <Link href="/auth/register" className="btn-primary w-full text-center" style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            Criar conta grátis
                        </Link>
                    </div>
                </aside>
            </section>
        </div>
    );
}
