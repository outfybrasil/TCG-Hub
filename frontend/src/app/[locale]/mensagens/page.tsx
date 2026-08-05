'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { MessageCircleOff, Bell } from 'lucide-react';

export default function MensagensRedirectPage() {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c1324' }}>
            <div className="text-center space-y-6 max-w-sm px-6">
                <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <MessageCircleOff className="h-12 w-12 text-slate-600" />
                    </div>
                </div>

                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        Mensagens descontinuadas
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: '#8b95b5' }}>
                        O chat entre usuários foi removido da plataforma. Use as notificações para acompanhar seus pedidos, leilões e atualizações em tempo real.
                    </p>
                </div>

                <Link
                    href="/notificacoes"
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white hover:bg-rose-700 transition-all"
                >
                    <Bell className="h-4 w-4" />
                    Ver Notificações
                </Link>
            </div>
        </div>
    );
}
