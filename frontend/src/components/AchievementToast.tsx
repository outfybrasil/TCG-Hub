'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AchievementUnlockData = {
    id: string;
    name: string;
    description: string;
    icon: string;
};

export default function AchievementToast() {
    const [achievements, setAchievements] = useState<AchievementUnlockData[]>([]);

    useEffect(() => {
        const handleAchievementMessage = (event: MessageEvent) => {
            if (event.data?.type === 'ACHIEVEMENT_UNLOCKED') {
                const badge = event.data.payload as AchievementUnlockData;
                setAchievements(prev => [...prev, badge]);
                
                // Remove out after 5 seconds
                setTimeout(() => {
                    setAchievements(prev => prev.filter(a => a.id !== badge.id));
                }, 5000);
            }
        };

        window.addEventListener('message', handleAchievementMessage);
        return () => window.removeEventListener('message', handleAchievementMessage);
    }, []);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {achievements.map((ach) => (
                    <motion.div
                        key={ach.id}
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 50 }}
                        className="bg-slate-900 border-2 border-slate-800 shadow-[0_0_40px_rgba(225,29,72,0.2)] rounded-3xl p-4 flex items-center gap-4 w-80 pointer-events-auto"
                    >
                        <div className="w-16 h-16 shrink-0 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl border border-slate-700 shadow-inner relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/20 via-transparent to-yellow-500/20 mix-blend-color-dodge animate-[shimmer_2s_infinite]" />
                            {ach.icon}
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1 animate-pulse">
                                Conquista Desbloqueada!
                            </p>
                            <h4 className="text-white font-black text-sm leading-tight mb-1">{ach.name}</h4>
                            <p className="text-slate-400 text-xs leading-tight">{ach.description}</p>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
