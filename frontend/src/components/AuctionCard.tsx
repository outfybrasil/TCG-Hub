'use client';

import React from 'react';
import Link from 'next/link';
import CountdownTimer from '@/components/CountdownTimer';
import { Auction } from '@/lib/auction.types';

interface AuctionCardProps {
    auction: Auction;
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function AuctionCard({ auction }: AuctionCardProps) {
    const isEnded = auction.status === 'ended' || new Date(auction.endsAt) <= new Date();

    return (
        <Link href={`/leilao/${auction.$id}`} className="group block">
            <div className={`bg-white border rounded-[30px] shadow-sm overflow-hidden transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl ${isEnded ? 'border-slate-100 opacity-60' : 'border-slate-200 hover:border-rose-500/40'}`}>
                {/* Card Image */}
                <div className="relative aspect-square overflow-hidden bg-slate-50 rounded-t-[24px]">
                    <img
                        src={auction.imageUrl}
                        alt={auction.cardName}
                        className="h-full w-full object-contain p-6 group-hover:scale-110 transition-transform duration-500"
                    />
                    {/* Countdown Badge */}
                    <div className="absolute top-4 right-4">
                        <CountdownTimer endsAt={auction.endsAt} size="sm" />
                    </div>
                    {/* Condition Tag */}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-100">
                        <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">{auction.condition}</span>
                    </div>
                </div>

                {/* Card Info */}
                <div className="p-6 space-y-5">
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{auction.cardSet}_</p>
                        <h3 className="text-base font-black tracking-tighter text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors uppercase leading-none">
                            {auction.cardName}
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-y border-slate-50 py-4">
                        <div className="space-y-0.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none block">Lance Atual_</span>
                            <p className="text-sm font-black text-slate-900 tracking-tight leading-tight">{formatBRL(auction.currentBid)}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                            <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest leading-none block">Bids_</span>
                            <p className="text-sm font-black text-slate-900 tracking-tight leading-tight">{auction.bidCount}</p>
                        </div>
                    </div>

                    <div className={`w-full h-11 flex items-center justify-center rounded-xl text-[9px] font-black uppercase tracking-widest transition-all group-hover:shadow-md ${isEnded
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 text-slate-900 group-hover:bg-yellow-400 group-hover:text-slate-900 border border-transparent group-hover:border-yellow-300'
                        }`}>
                        {isEnded ? 'Encerrado' : 'Participar →'}
                    </div>
                </div>
            </div>
        </Link>
    );
}
