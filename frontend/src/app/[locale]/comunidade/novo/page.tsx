'use client';

import React, { useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { ArrowLeft, Send } from 'lucide-react';

const CATEGORIES = ['Decklists', 'Dúvidas', 'Avaliações', 'Mercado', 'Torneios', 'Geral'];

export default function NovoTopicoPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !category || !content.trim()) return;
        setSubmitting(true);
        // Simulate submission — in production this would insert into Supabase
        await new Promise(r => setTimeout(r, 800));
        alert('Tópico enviado para moderação! Em breve estará disponível na comunidade.');
        router.push('/comunidade');
    };

    return (
        <div className="min-h-screen pb-20" style={{ background: '#0c1324' }}>
            <div className="page-frame py-8 max-w-3xl space-y-6">
                <Link href="/comunidade" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Voltar para Comunidade
                </Link>

                <div>
                    <div className="eyebrow mb-4">Fórum</div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Criar novo tópico</h1>
                    <p className="mt-2 text-sm" style={{ color: '#8b95b5' }}>Compartilhe sua dúvida, decklist ou análise com a comunidade.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>Categoria *</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                                <button key={cat} type="button" onClick={() => setCategory(cat)}
                                    className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                                        category === cat
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                                    }`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>Título *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Meu deck Charizard ex para o regional de SP"
                            maxLength={120}
                            className="input-dark"
                        />
                        <span className="text-[10px]" style={{ color: '#8b95b5' }}>{title.length}/120 caracteres</span>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>Conteúdo *</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Descreva sua dúvida, estratégia ou análise em detalhes..."
                            rows={10}
                            className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-y"
                        />
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <button type="submit" disabled={submitting || !title || !category || !content}
                            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed" style={{ height: 52 }}>
                            {submitting ? (
                                <><div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Enviando...</>
                            ) : (
                                <><Send className="h-4 w-4" /> Publicar Tópico</>
                            )}
                        </button>
                        <Link href="/comunidade" className="btn-ghost" style={{ height: 52 }}>Cancelar</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
