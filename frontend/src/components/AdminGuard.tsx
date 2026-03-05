"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['admin@tcghub.com.br', 'contato@tcgmegastore.com.br'];

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            } catch (error) {
                console.error('Auth error:', error);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-44">
                <div className="h-10 w-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-32 text-center animate-fade-up">
                <div className="max-w-md mx-auto space-y-8 bg-white p-12 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-rose-100">🔒</div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Acesso Restrito ao <span className="text-rose-600">Admin</span></h2>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                            Apenas o administrador da TCG Hub pode gerenciar ferramentas globais e geradores de ativos.
                        </p>
                    </div>
                    {!user ? (
                        <a href="/auth/login" className="block">
                            <button className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg hover:bg-rose-600 transition-all transform hover:-translate-y-0.5">
                                Identificar Administrador
                            </button>
                        </a>
                    ) : (
                        <button
                            onClick={() => router.push('/')}
                            className="w-full h-14 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-200 transition-all"
                        >
                            Voltar para Loja
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
