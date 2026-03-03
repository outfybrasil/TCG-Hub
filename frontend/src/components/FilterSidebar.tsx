"use client";

import React from 'react';

const filters = {
    sets: ["Base Set", "Selva", "Fóssil", "151", "Destinos de Paldea"],
    rarities: ["Comum", "Incomum", "Rara", "Ultra Rara", "Rara Secreta"],
    types: ["Grama", "Fogo", "Água", "Elétrico", "Psíquico", "Luta", "Sombrio", "Metal", "Fada", "Dragão"],
};

export default function FilterSidebar() {
    return (
        <div className="w-72 flex-shrink-0 space-y-12 animate-fade-in hidden lg:block pr-10 border-r border-black/5">
            <div className="space-y-6">
                <h3 className="text-[#1A2B48]/40 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-3">
                    Arquivos
                </h3>
                <div className="space-y-4">
                    {filters.sets.map((set) => (
                        <label key={set} className="flex items-center space-x-3 cursor-pointer group">
                            <div className="h-4 w-4 border border-slate-200 rounded-full group-hover:border-rose-600 transition-colors flex items-center justify-center">
                                <div className="h-1.5 w-1.5 bg-rose-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest group-hover:text-slate-900 transition-colors">{set}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-[#1A2B48]/40 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-3">
                    Condição e Raridade
                </h3>
                <div className="space-y-4">
                    {filters.rarities.map((rarity) => (
                        <label key={rarity} className="flex items-center space-x-3 cursor-pointer group">
                            <div className="h-4 w-4 border border-slate-200 rounded-md group-hover:border-rose-600 transition-colors" />
                            <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest group-hover:text-slate-900 transition-colors">{rarity}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-[#1A2B48]/40 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-3">
                    Elementos Essenciais
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {filters.types.map((type) => (
                        <button key={type} className="px-4 py-2 border border-slate-100 bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-rose-600 hover:text-rose-600 transition-all rounded-lg">
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-10">
                <button className="w-full h-12 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all rounded-xl">
                    Limpar Filtros
                </button>
            </div>
        </div>
    );
}
