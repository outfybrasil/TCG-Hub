'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Send, Search } from 'lucide-react';

interface Message {
    id: string;
    from: string;
    preview: string;
    time: string;
    unread: boolean;
    avatar: string;
}

interface ChatMsg {
    id: string;
    author: 'me' | 'other';
    text: string;
    time: string;
}

const CONVERSATIONS: Message[] = [
    { id: 'c1', from: 'trainerAsh', preview: 'Olá! Ainda tem o Pikachu ex disponível?', time: '5min', unread: true, avatar: 'T' },
    { id: 'c2', from: 'Suporte TCG Hub', preview: 'Seu pedido foi confirmado. Obrigado!', time: '2h', unread: false, avatar: 'S' },
    { id: 'c3', from: 'pokemonPro', preview: 'Quanto você pede pelo Charizard?', time: '1d', unread: false, avatar: 'P' },
];

const MOCK_CHAT: Record<string, ChatMsg[]> = {
    c1: [
        { id: 'm1', author: 'other', text: 'Olá! Ainda tem o Pikachu ex disponível?', time: '5min' },
        { id: 'm2', author: 'me', text: 'Oi! Sim, ainda tem sim. R$ 320,00.', time: '4min' },
        { id: 'm3', author: 'other', text: 'Aceita R$ 300?', time: '3min' },
    ],
    c2: [
        { id: 'm1', author: 'other', text: 'Olá! Seu pedido #TCG-1042 foi confirmado. Obrigado por comprar na TCG Hub!', time: '2h' },
    ],
    c3: [
        { id: 'm1', author: 'other', text: 'Quanto você pede pelo Charizard?', time: '1d' },
    ],
};

export default function MensagensPage() {
    const [activeConv, setActiveConv] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [chats, setChats] = useState(MOCK_CHAT);
    const [convs, setConvs] = useState(CONVERSATIONS);

    const activeConvData = convs.find(c => c.id === activeConv);
    const messages = activeConv ? (chats[activeConv] ?? []) : [];

    const openConv = (id: string) => {
        setActiveConv(id);
        setConvs(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
    };

    const sendMsg = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !activeConv) return;
        const newMsg: ChatMsg = { id: `m${Date.now()}`, author: 'me', text: text.trim(), time: 'Agora' };
        setChats(prev => ({ ...prev, [activeConv]: [...(prev[activeConv] ?? []), newMsg] }));
        setText('');
    };

    const unreadTotal = convs.filter(c => c.unread).length;

    return (
        <div className="min-h-screen" style={{ background: '#0c1324' }}>
            <div className="page-frame py-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-white">Mensagens</h1>
                        {unreadTotal > 0 && <p className="text-xs text-rose-400 font-bold">{unreadTotal} não {unreadTotal === 1 ? 'lida' : 'lidas'}</p>}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]" style={{ height: 'calc(100vh - 200px)' }}>
                    {/* Sidebar — conversations */}
                    <div className="flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                        <div className="p-4 border-b border-white/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input placeholder="Buscar conversa..." className="w-full h-10 rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {convs.map(conv => (
                                <button key={conv.id} onClick={() => openConv(conv.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-4 border-b border-white/5 text-left transition-all hover:bg-white/5 ${activeConv === conv.id ? 'bg-rose-500/10' : ''}`}>
                                    <div className="relative h-10 w-10 shrink-0 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-black text-sm">
                                        {conv.avatar}
                                        {conv.unread && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-rose-500 border-2 border-[#0c1324]" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className={`text-sm font-black ${conv.unread ? 'text-white' : 'text-slate-400'}`}>{conv.from}</p>
                                            <span className="text-[10px]" style={{ color: '#8b95b5' }}>{conv.time}</span>
                                        </div>
                                        <p className="text-xs mt-0.5 truncate" style={{ color: '#8b95b5' }}>{conv.preview}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat Area */}
                    {activeConv ? (
                        <div className="flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                                <div className="h-9 w-9 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-black text-sm">
                                    {activeConvData?.avatar}
                                </div>
                                <p className="font-black text-white">{activeConvData?.from}</p>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.author === 'me' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs rounded-2xl px-4 py-3 ${msg.author === 'me' ? 'bg-rose-600 text-white rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm'}`}>
                                            <p className="text-sm">{msg.text}</p>
                                            <p className={`text-[10px] mt-1 ${msg.author === 'me' ? 'text-rose-200' : 'text-slate-400'}`}>{msg.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            <form onSubmit={sendMsg} className="flex items-center gap-3 px-4 py-4 border-t border-white/5">
                                <input
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    placeholder="Digite uma mensagem..."
                                    className="flex-1 h-11 rounded-full bg-white/5 border border-white/10 px-5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                                />
                                <button type="submit" disabled={!text.trim()}
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white disabled:opacity-40 hover:bg-rose-700 transition-all">
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                                <Send className="h-7 w-7 text-slate-500" />
                            </div>
                            <p className="text-lg font-black text-white">Selecione uma conversa</p>
                            <p className="text-sm" style={{ color: '#8b95b5' }}>Escolha uma conversa ao lado para começar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
