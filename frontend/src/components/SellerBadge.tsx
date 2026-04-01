'use client';

import React from 'react';

interface SellerBadgeProps {
    displayName: string;
    ratingAvg?: number;
    ratingCount?: number;
    totalSales?: number;
    isVerified?: boolean;
    shipsFromState?: string;
    size?: 'sm' | 'md';
}

function StarRating({ value }: { value: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    className={`w-3 h-3 ${star <= Math.round(value) ? 'text-amber-400' : 'text-slate-200'}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

export default function SellerBadge({
    displayName,
    ratingAvg = 0,
    ratingCount = 0,
    totalSales = 0,
    isVerified = false,
    shipsFromState,
    size = 'md',
}: SellerBadgeProps) {
    const isSmall = size === 'sm';

    return (
        <div className={`flex items-center gap-${isSmall ? '2' : '3'}`}>
            <div className={`${isSmall ? 'w-8 h-8 rounded-xl text-xs' : 'w-10 h-10 rounded-2xl text-sm'} bg-slate-900 text-white font-black flex items-center justify-center shrink-0 uppercase`}>
                {displayName?.slice(0, 2) || 'VD'}
            </div>

            <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className={`font-black text-slate-900 truncate ${isSmall ? 'text-xs' : 'text-sm'}`}>
                        {displayName || 'Vendedor'}
                    </span>
                    {isVerified && (
                        <span className="inline-flex items-center justify-center w-4 h-4 bg-emerald-500 rounded-full shrink-0" title="Vendedor verificado">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                    {ratingCount > 0 ? (
                        <>
                            <StarRating value={ratingAvg} />
                            <span className="text-[10px] font-bold text-slate-400">
                                {ratingAvg.toFixed(1)} ({ratingCount})
                            </span>
                        </>
                    ) : (
                        <span className="text-[10px] font-bold text-slate-400">Novo vendedor</span>
                    )}

                    {totalSales > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">· {totalSales} vendas</span>
                    )}

                    {shipsFromState && (
                        <span className="text-[10px] font-bold text-slate-400">· {shipsFromState}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
