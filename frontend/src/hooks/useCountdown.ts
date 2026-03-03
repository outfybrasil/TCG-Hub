'use client';

import { useState, useEffect } from 'react';

interface CountdownResult {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
}

export function useCountdown(endsAt: string): CountdownResult {
    const getTimeLeft = (): CountdownResult => {
        const diff = new Date(endsAt).getTime() - Date.now();
        if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        return { days, hours, minutes, seconds, expired: false };
    };

    const [timeLeft, setTimeLeft] = useState<CountdownResult>(getTimeLeft);

    useEffect(() => {
        const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
        return () => clearInterval(interval);
    }, [endsAt]);

    return timeLeft;
}
