'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Heart, Reply, Share2, Flag, Send } from 'lucide-react';

// Mock data - in a real app this would come from Supabase
const MOCK_TOPIC = {
    id: '1',
    category: 'Decklists',
    title: 'Meu deck Miraidon ex pós-banlist — atingindo Top 8 em regional',
    author: 'trainerAsh',
    time: '2h atrás',
    likes: 128,
    views: 1430,
    content: `Fala galera! Depois da última banlist achei que o Miraidon ia perder muita força, mas com alguns ajustes o deck tá andando muito bem.

**Lista principal (60 cartas):**

Pokémon (12):
- 4x Miraidon ex
- 2x Raichu V
- 2x Raichu VMAX  
- 2x Regieleki VMAX
- 1x Flaaffy
- 1x Mareep

Treinos (4):
- 4x Treino Elétrico

[...]

O segredo é manter a consistência nas primeiras rodadas. Prefiro não abrir mão dos 4 Pedras Vivas mesmo com a limitação.

Qualquer dúvida sobre matchups específicos, perguntem aqui!`,
    replies: [
        { id: 'r1', author: 'pokemonPro', text: 'Cara, você já testou colocar 2x Morpeko V? Acho que pode ajudar na consistência.', likes: 12, time: '1h atrás' },
        { id: 'r2', author: 'deckBuilder99', text: 'Muito bom! Qual matchup você acha mais difícil atualmente?', likes: 8, time: '45min atrás' },
        { id: 'r3', author: 'anotherTrainer', text: 'Top 8 impressionante! Vou testar essa lista no próximo regional aqui de SP.', likes: 15, time: '30min atrás' },
    ],
};

const CATEGORY_COLORS: Record<string, string> = {
    'Decklists': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Dúvidas': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Avaliações': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Mercado': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    'Torneios': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export default function TopicPage() {
    const [replyText, setReplyText] = useState('');
    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState(MOCK_TOPIC.likes);

    const handleLike = () => {
        setLiked(prev => !prev);
        setLikes(prev => prev + (liked ? -1 : 1));
    };

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        alert('Funcionalidade de resposta será disponibilizada em breve. Faça login para participar!');
        setReplyText('');
    };

    return (
        <div className="min-h-screen pb-20" style={{ background: '#0c1324' }}>
            <div className="page-frame py-8 space-y-6">
                {/* Back */}
                <Link href="/comunidade" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Comunidade
                </Link>

                {/* Topic Header */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 space-y-5">
                    <div className="flex items-center gap-2">
                        <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${CATEGORY_COLORS[MOCK_TOPIC.category] ?? 'bg-white/10 text-white'}`}>
                            {MOCK_TOPIC.category}
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-white leading-tight">{MOCK_TOPIC.title}</h1>
                    <div className="flex items-center gap-4 text-[11px]" style={{ color: '#8b95b5' }}>
                        <span>por <strong className="text-white">@{MOCK_TOPIC.author}</strong></span>
                        <span>·</span>
                        <span>{MOCK_TOPIC.time}</span>
                        <span>·</span>
                        <span>{MOCK_TOPIC.views} visualizações</span>
                    </div>

                    {/* Content */}
                    <div className="prose prose-invert max-w-none border-t border-white/5 pt-6">
                        {MOCK_TOPIC.content.split('\n').map((line, i) => (
                            <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: line.startsWith('**') ? '#fff' : '#8b95b5' }}>
                                {line.replace(/\*\*/g, '')}
                            </p>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                        <button onClick={handleLike} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${liked ? 'bg-rose-600 text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}>
                            <Heart className="h-4 w-4" /> {likes}
                        </button>
                        <button className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                            <Share2 className="h-4 w-4" /> Compartilhar
                        </button>
                        <button className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-400 transition-all ml-auto">
                            <Flag className="h-4 w-4" /> Reportar
                        </button>
                    </div>
                </div>

                {/* Replies */}
                <div className="space-y-3">
                    <h2 className="text-base font-black text-white">{MOCK_TOPIC.replies.length} Respostas</h2>
                    {MOCK_TOPIC.replies.map(reply => (
                        <div key={reply.id} className="rounded-2xl border border-white/5 bg-white/[0.015] p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center text-xs font-black text-rose-400">
                                        {reply.author[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm font-black text-white">@{reply.author}</span>
                                    <span className="text-[11px]" style={{ color: '#8b95b5' }}>· {reply.time}</span>
                                </div>
                                <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-400 transition-colors">
                                    <Heart className="h-3 w-3" /> {reply.likes}
                                </button>
                            </div>
                            <p className="text-sm" style={{ color: '#8b95b5' }}>{reply.text}</p>
                            <button className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                                <Reply className="h-3 w-3" /> Responder
                            </button>
                        </div>
                    ))}
                </div>

                {/* Reply Form */}
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-6 space-y-4">
                    <h3 className="text-sm font-black text-white">Deixe sua resposta</h3>
                    <form onSubmit={handleReply} className="space-y-3">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Escreva sua resposta aqui..."
                            rows={4}
                            className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                        />
                        <div className="flex justify-end">
                            <button type="submit" className="btn-primary flex items-center gap-2" style={{ height: 44 }}>
                                <Send className="h-4 w-4" /> Responder
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
