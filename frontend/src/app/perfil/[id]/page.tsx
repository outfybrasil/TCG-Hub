'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function PublicProfilePage({ params }: { params: { id: string } }) {
    const [profile, setProfile] = useState<any>(null);
    const [achievements, setAchievements] = useState<any[]>([]);
    const [showcase, setShowcase] = useState<any[]>([]);
    const [album, setAlbum] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfileData() {
            setLoading(true);
            try {
                // 1. Fetch Profile
                const { data: profData, error: profErr } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', params.id)
                    .single();

                if (profErr || !profData) {
                    setLoading(false);
                    return;
                }
                setProfile(profData);

                // 2. Fetch Achievements
                const { data: achData } = await supabase
                    .from('user_achievements')
                    .select(`
                        unlocked_at,
                        achievements ( id, name, description, icon )
                    `)
                    .eq('user_id', params.id)
                    .order('unlocked_at', { ascending: false });
                
                if (achData) setAchievements(achData.map(a => ({ ...a.achievements, unlocked_at: a.unlocked_at })));

                // 3. Fetch Showcase
                const favIds = [profData.favorite_card_1, profData.favorite_card_2, profData.favorite_card_3].filter(Boolean);
                if (favIds.length > 0) {
                    const { data: favData } = await supabase
                        .from('virtual_inventory')
                        .select('*')
                        .in('id', favIds);
                    if (favData) setShowcase(favData);
                }

                // 4. Fetch the rest of the album
                const { data: albumData } = await supabase
                    .from('virtual_inventory')
                    .select('*')
                    .eq('user_id', params.id)
                    .order('created_at', { ascending: false })
                    .limit(20); // Top 20 for preview
                
                if (albumData) setAlbum(albumData);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchProfileData();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white flex-col">
                <span className="text-6xl mb-4">👻</span>
                <h1 className="text-2xl font-black uppercase tracking-widest text-slate-500">Perfil não encontrado</h1>
            </div>
        );
    }

    const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    
    // Calcula valor total do showcase e do album resumido
    const totalAlbumValue = album.reduce((acc, curr) => acc + (curr.market_value || 0), 0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden pb-24">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-rose-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Banner Cover */}
            <div className="h-64 md:h-80 w-full bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 relative">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-slate-950 to-transparent"></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-24 md:-mt-32 animate-fade-up">
                {/* Profile Header Block */}
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-end mb-16">
                    {/* Avatar */}
                    <div className="relative group shrink-0">
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-[32px] md:rounded-[40px] bg-slate-800 border-4 border-slate-950 shadow-2xl overflow-hidden flex items-center justify-center shrink-0 relative z-10">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.nickname} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-6xl text-slate-600 font-black uppercase">{profile.nickname?.substring(0, 2)}</span>
                            )}
                        </div>
                        {/* Glow Behind Avatar based on level */}
                        <div className="absolute inset-0 bg-rose-500 rounded-[32px] md:rounded-[40px] blur-xl opacity-50 scale-105 z-0" />
                        <div className="absolute -bottom-3 -right-3 z-20 bg-emerald-500 text-slate-950 font-black text-sm md:text-xl px-4 py-2 rounded-2xl border-4 border-slate-950 shadow-lg">
                            Nv. {profile.level}
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 space-y-2">
                        <div className="inline-flex py-1 px-3 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-500/30">
                            {profile.title || 'Mestre Colecionador'}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase break-all">
                            {profile.nickname}
                        </h1>
                        <p className="text-slate-400 font-medium max-w-xl">
                            {profile.bio || 'Membro do TCG Hub, sempre em busca de boas oportunidades.'}
                        </p>
                    </div>

                    <div className="shrink-0 w-full md:w-auto bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-center">
                        <div className="text-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Membro TCG Hub</span>
                            <span className="text-2xl font-black text-white px-8">🏅</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1">
                    {/* Linha Única: Badges & Info */}
                    <div className="space-y-8">
                        {/* Conquistas Box */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
                                Conquistas
                                <span className="text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg">{achievements.length}</span>
                            </h3>
                            
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                {achievements.length > 0 ? achievements.map((ach) => (
                                    <div 
                                        key={ach.id} 
                                        className="aspect-square bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-2xl hover:bg-slate-800 hover:border-slate-700 transition-colors cursor-help group relative"
                                    >
                                        <span>{ach.icon || '🏅'}</span>
                                        {/* Tooltip Hover */}
                                        <div className="absolute w-48 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-xl -top-2 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                            <div className="text-xs font-black text-white uppercase mb-1">{ach.name}</div>
                                            <div className="text-[10px] text-slate-400 font-medium leading-tight">{ach.description}</div>
                                            
                                            {/* Tooltip arrow */}
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-4 text-center py-8">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">Nenhuma conquista ainda</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
