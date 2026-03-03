'use client';

import React from 'react';
import { useCountdown } from '@/hooks/useCountdown';

const pad = (n: number) => String(n).padStart(2, '0');

interface CountdownTimerProps {
    endsAt: string;
    size?: 'sm' | 'lg';
}

export default function CountdownTimer({ endsAt, size = 'sm' }: CountdownTimerProps) {
    const { days, hours, minutes, seconds, expired } = useCountdown(endsAt);

    if (expired) {
        if (size === 'lg') {
            return (
                <div className="flex items-center gap-3 py-4">
                    <div className="h-2 w-2 rounded-full bg-rose-600" />
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em]">
                        Pregão Encerrado
                    </span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl">
                <span className="h-1.5 w-1.5 bg-rose-500 rounded-full" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Encerrado</span>
            </div>
        );
    }

    if (size === 'lg') {
        const segments = days > 0
            ? [{ label: 'Dias', value: pad(days) }, { label: 'Horas', value: pad(hours) }, { label: 'Min', value: pad(minutes) }, { label: 'Seg', value: pad(seconds) }]
            : [{ label: 'Horas', value: pad(hours) }, { label: 'Min', value: pad(minutes) }, { label: 'Seg', value: pad(seconds) }];

        return (
            <div className="flex items-end gap-3">
                {segments.map((seg, i) => (
                    <React.Fragment key={seg.label}>
                        <div className="text-center">
                            <div className="bg-slate-900 px-5 py-4 min-w-[72px] flex items-center justify-center border-b-4 border-rose-600">
                                <span className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">
                                    {seg.value}
                                </span>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] block mt-2">
                                {seg.label}
                            </span>
                        </div>
                        {i < segments.length - 1 && (
                            <span className="text-3xl font-black text-slate-300 mb-5 leading-none">:</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    // Small badge version
    const display = days > 0
        ? `${pad(days)}d ${pad(hours)}h`
        : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

    const isUrgent = !expired && days === 0 && hours === 0;

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border ${isUrgent ? 'border-rose-500/40' : 'border-white/10'}`}>
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isUrgent ? 'bg-yellow-400' : 'bg-rose-500'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isUrgent ? 'text-yellow-400' : 'text-white'}`}>
                {display}
            </span>
        </div>
    );
}
