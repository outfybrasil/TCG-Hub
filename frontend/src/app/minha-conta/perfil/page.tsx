'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState({
        nickname: '',
        bio: '',
    });

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.push('/auth/login');
                return;
            }
            setUser(authUser);

            // Fetch Profile
            const { data: profData } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', authUser.id)
                .single();

            if (profData) {
                setProfile({
                    nickname: profData.nickname || '',
                    bio: profData.bio || '',
                });
            } else {
                // If the user profile does not exist yet for some reason (no achievement unlocked), prefill
                setProfile(p => ({ ...p, nickname: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '' }));
            }
            setLoading(false);
        }
        loadData();
    }, [router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('user_profiles').upsert({
                user_id: user.id,
                nickname: profile.nickname,
                bio: profile.bio,
                updated_at: new Date().toISOString()
            });

            if (error) {
                if (error.code === '23505') alert('Esse apelido (nickname) já está em uso.');
                else { console.error(error); alert('Erro ao salvar perfil.'); }
                setSaving(false);
                return;
            }

            alert('Perfil salvo com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro inesperado.');
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Carregando painel de perfil...</div>;

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-8">
                Configurar Perfil Público
            </h1>
            
            <form onSubmit={handleSave} className="space-y-8">
                {/* Info Box */}
                <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[32px] shadow-sm space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-4">
                        Informações Básicas
                    </h2>
                    
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Seu Apelido Único (Nickname)</label>
                        <input
                            type="text"
                            required
                            maxLength={30}
                            value={profile.nickname}
                            onChange={(e) => setProfile({ ...profile, nickname: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                            placeholder="Ex: MestrePokemon_99"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Biografia (Sobre você)</label>
                        <textarea
                            maxLength={160}
                            value={profile.bio}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            placeholder="Conte um pouco sobre suas coleções favoritas..."
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 items-center justify-end border-t border-slate-200 pt-8">
                    {profile.nickname && (
                        <button 
                            type="button" 
                            onClick={() => router.push(`/perfil/${user?.id}`)} 
                            className="px-6 py-3 text-xs font-black uppercase tracking-widest border border-slate-300 text-slate-500 bg-white hover:bg-slate-50 rounded-xl"
                        >
                            Ver meu Perfil
                        </button>
                    )}
                    <button type="submit" disabled={saving} className="px-8 py-3 text-xs font-black uppercase tracking-widest bg-rose-600 text-white rounded-xl shadow-lg hover:bg-rose-700 disabled:opacity-50">
                        {saving ? 'Gravando...' : 'Salvar Perfil'}
                    </button>
                </div>
            </form>
        </div>
    );
}
