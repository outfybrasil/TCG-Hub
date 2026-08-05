'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Message {
    id: string;
    user_id: string;
    user_name: string;
    message: string;
    timestamp?: number;
    created_at?: string;
}

export default function LiveChat({ liveId, currentUser, variant = 'panel' }: { liveId: string, currentUser?: { id: string | null, name: string } | null, variant?: 'panel' | 'overlay' }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const processedIds = useRef<Set<string>>(new Set());

    const isAdmin = currentUser?.id === 'admin';
    const isBanned = currentUser?.id ? bannedUsers.has(currentUser.id) : false;

    useEffect(() => {
        fetch(`/api/live/chat?liveId=${encodeURIComponent(liveId)}`, { cache: 'no-store' })
            .then(response => response.ok ? response.json() : { messages: [] })
            .then(result => setMessages((result.messages || []).map((message: Message) => ({ ...message, timestamp: new Date(message.created_at || Date.now()).getTime() }))));

        const chatChannel = supabase.channel(`live_chat_${liveId}`, {
            config: {
                broadcast: { self: true },
            },
        });

        chatChannel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `live_id=eq.${liveId}` }, ({ new: row }) => {
                const msg = { ...(row as unknown as Message), timestamp: new Date(String(row.created_at)).getTime() };
                if (processedIds.current.has(msg.id)) return;
                processedIds.current.add(msg.id);
                setMessages(prev => [...prev.filter(item => item.id !== msg.id), msg].slice(-100));
            })
            .on('broadcast', { event: 'admin_ban' }, (payload) => {
                const bannedId = payload.payload.user_id;
                setBannedUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.add(bannedId);
                    return newSet;
                });
                // Remove as mensagens daquela pessoa da tela
                setMessages(prev => prev.filter(m => m.user_id !== bannedId));
            })
            .on('broadcast', { event: 'report_message' }, (payload) => {
                if (isAdmin) {
                    // Mostra pro admin apenas
                    alert(`🚨 ALERTA: Mensagem de ${payload.payload.user_name} foi denunciada!\n"${payload.payload.message}"`);
                }
            })
            .on('broadcast', { event: 'delete_message' }, (payload) => {
                const targetId = payload.payload.id;
                setMessages(prev => prev.filter(m => m.id !== targetId));
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setChannel(chatChannel);
                }
            });

        return () => {
            supabase.removeChannel(chatChannel);
        };
    }, [liveId, isAdmin]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return () => clearTimeout(timeout);
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.id || !newMessage.trim() || !channel || isBanned) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const text = newMessage.trim();
        setNewMessage('');
        const response = await fetch('/api/live/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ liveId, message: text }) });
        if (!response.ok) { setNewMessage(text); return; }
        const saved = (await response.json()).message;
        const payload = { ...saved, timestamp: new Date(saved.created_at).getTime() } as Message;
        processedIds.current.add(payload.id);
        setMessages(prev => [...prev.filter(item => item.id !== payload.id), payload].slice(-100));
    };

    const handleBan = async (msg: Message) => {
        if (!isAdmin || !channel) return;
        if (!confirm(`Deseja silenciar/banir para sempre o(a) ${msg.user_name}?`)) return;

        await channel.send({
            type: 'broadcast',
            event: 'admin_ban',
            payload: { user_id: msg.user_id }
        });
    };

    const handleDeleteMessage = async (msg: Message) => {
        if (!isAdmin || !channel) return;
        if (!confirm(`Apagar mensagem de ${msg.user_name}?`)) return;

        await channel.send({
            type: 'broadcast',
            event: 'delete_message',
            payload: { id: msg.id }
        });
    };

    const handleReport = async (msg: Message) => {
        if (!channel) return;
        if (!confirm(`Denunciar o comentário: "${msg.message}"?`)) return;

        await channel.send({
            type: 'broadcast',
            event: 'report_message',
            payload: { user_name: msg.user_name, message: msg.message }
        });
        
        alert('Sua denúncia foi enviada para o administrador.');
    };

    return (
        <div className={`flex h-full flex-col overflow-hidden ${variant === 'overlay' ? 'bg-transparent' : 'rounded-3xl border border-slate-800 bg-slate-950/90 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl'}`}>
            {/* Header */}
            <div className={`${variant === 'overlay' ? 'hidden' : 'flex'} bg-slate-900/50 border-b border-slate-800/50 p-4 justify-between items-center shrink-0`}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Chat Ao Vivo
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{messages.length} msg simultâneas</span>
            </div>

            {/* Messages Area */}
            <div className={`flex flex-1 flex-col justify-end overflow-y-auto mask-fade-top scrollbar-hide ${variant === 'overlay' ? 'space-y-1 p-1' : 'space-y-4 p-4'}`}>
                {messages.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 mt-auto mb-4 italic">
                        Bem-vindo(a) ao chat! Nenhuma mensagem recente.
                    </div>
                ) : (
                    (variant === 'overlay' ? messages.slice(-6) : messages).map((msg) => (
                        <div key={msg.id} className={`text-xs group relative transition-colors ${variant === 'overlay' ? 'w-fit max-w-[92%] rounded-xl bg-black/35 px-2.5 py-1 leading-4 text-shadow-sm backdrop-blur-sm' : 'leading-relaxed p-2 -mx-2 rounded-xl hover:bg-slate-900/50'}`}>
                            <span className={`font-black mr-2 ${msg.user_id === 'admin' ? 'text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded' : variant === 'overlay' ? 'text-white' : 'text-rose-400'}`}>
                                {msg.user_name}:
                            </span>
                            <span className={`break-words text-slate-300 ${variant === 'overlay' ? 'line-clamp-2' : ''}`}>{msg.message}</span>

                            {/* Moderação Actions (Hover) */}
                            <div className={`${variant === 'overlay' ? 'hidden' : 'flex'} absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1 bg-slate-900 border border-slate-700/50 p-1 rounded-lg shadow-lg`}>
                                {isAdmin ? (
                                    <>
                                        <button onClick={() => handleDeleteMessage(msg)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors" title="Apagar Mensagem">
                                            🗑️
                                        </button>
                                        {msg.user_id !== 'admin' && (
                                            <button onClick={() => handleBan(msg)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors" title="Banir Usuário">
                                                🚫
                                            </button>
                                        )}
                                    </>
                                ) : currentUser?.id ? (
                                    <button onClick={() => handleReport(msg)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors" title="Denunciar Comentário">
                                        ⚠️
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} className="h-1 shrink-0" />
            </div>

            {/* Input Area */}
            {isBanned ? (
                <div className="p-4 bg-rose-950/50 border-t border-rose-900/50 text-center">
                    <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">🛑 Você foi silenciado nesta live</span>
                </div>
            ) : !currentUser?.id ? (
                <div className={`${variant === 'overlay' ? 'p-1' : 'border-t border-slate-800/80 bg-slate-900/80 p-3'}`}><a href="/auth/login" className="block rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-white backdrop-blur">Entre para comentar</a></div>
            ) : (
                <form onSubmit={sendMessage} className={`flex shrink-0 gap-2 ${variant === 'overlay' ? 'p-1' : 'border-t border-slate-800/80 bg-slate-900/80 p-3'}`}>
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Envie uma mensagem..."
                        disabled={!channel || !currentUser?.id}
                        className={`flex-1 rounded-xl border px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-colors ${variant === 'overlay' ? 'border-white/15 bg-black/40 backdrop-blur-md placeholder:text-white/45' : 'border-slate-800 bg-slate-950 placeholder-slate-600'}`}
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim() || !channel}
                        className={`${variant === 'overlay' ? 'bg-rose-600 px-4' : 'bg-emerald-600 hover:bg-emerald-500 disabled:hover:bg-emerald-600 px-5'} cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all`}
                    >
                        Enviar
                    </button>
                </form>
            )}
        </div>
    );
}
