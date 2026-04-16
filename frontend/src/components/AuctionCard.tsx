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
    const [currentImageUrl, setCurrentImageUrl] = React.useState(auction.imageUrl);
    const [imageError, setImageError] = React.useState(false);

    React.useEffect(() => {
        setCurrentImageUrl(auction.imageUrl);
        setImageError(false);
    }, [auction.imageUrl]);

    const isEnded = auction.status === 'ended' || new Date(auction.endsAt) <= new Date();

    return (
        <Link href={`/leilao/${auction.id}`} className="group block">
            <div className={`bg-[#191f31]/60 backdrop-blur-xl border rounded-[30px] shadow-sm overflow-hidden transition-all duration-300 transform hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] ${isEnded ? 'border-white/5 opacity-60' : 'border-white/5 hover:border-rose-500/40'}`}>
                {/* Card Image */}
                <div className="relative aspect-square overflow-hidden bg-black/20 rounded-t-[24px] border-b border-white/5">
                    <img
                        src={currentImageUrl}
                        alt={auction.cardName}
                        onError={() => {
                            if (!imageError && currentImageUrl) {
                                setImageError(true);
                                if (!currentImageUrl.includes('/pt/')) {
                                    const ptUrl = currentImageUrl.replace(/\/(ja|en)\//, '/pt/');
                                    setCurrentImageUrl(ptUrl);
                                }
                            }
                        }}
                        className="h-full w-full object-contain p-6 group-hover:scale-110 transition-transform duration-500"
                    />
                    {/* Countdown Badge */}
                    <div className="absolute top-4 right-4">
                        <CountdownTimer endsAt={auction.endsAt} size="sm" />
                    </div>
                    {/* Condition Tag */}
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">{auction.condition}</span>
                    </div>
                </div>

                {/* Card Info */}
                <div className="p-6 space-y-5">
                    <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{auction.cardSet}_</p>
                        <h3 className="text-base font-black tracking-tighter text-white line-clamp-1 group-hover:text-rose-600 transition-colors uppercase leading-none">
                            {auction.cardName}
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-y border-white/5 py-4">
                        <div className="space-y-0.5">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none block">Lance Atual_</span>
                            <p className="text-sm font-black text-white tracking-tight leading-tight">{formatBRL(auction.currentBid)}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                            <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest leading-none block">Bids_</span>
                            <p className="text-sm font-black text-white tracking-tight leading-tight">{auction.bidCount}</p>
                        </div>
                    </div>

                    <div className={`w-full h-11 flex items-center justify-center rounded-xl text-[9px] font-black uppercase tracking-widest transition-all group-hover:shadow-lg ${isEnded
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-white/10 text-white group-hover:bg-rose-600 group-hover:text-white border border-white/5 group-hover:border-rose-500/50'
                        }`}>
                        {isEnded ? 'Encerrado' : 'Participar →'}
                    </div>
                </div>
            </div>
        </Link>
    );
}
