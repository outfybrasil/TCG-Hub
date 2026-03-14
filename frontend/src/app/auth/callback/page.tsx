'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                if (session.user?.email === 'admin@tcghub.com.br') {
                    router.push('/admin/vendas');
                } else {
                    router.push('/membro');
                }
            }
        });

        // Fallback: check session immediately
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('[AuthCallback] Session check error:', error);
                    router.push('/auth/login?error=session_check_failed');
                    return;
                }

                if (session) {
                    if (session.user?.email === 'admin@tcghub.com.br') {
                        router.push('/admin/vendas');
                    } else {
                        router.push('/membro');
                    }
                }
            } catch (err) {
                console.error('[AuthCallback] Unexpected error:', err);
                router.push('/auth/login?error=unexpected');
            }
        };

        void checkSession();

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center space-y-4">
                <div className="h-12 w-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Finalizando autenticação...</p>
            </div>
        </div>
    );
}
