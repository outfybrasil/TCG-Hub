"use client";

interface FilterSidebarProps {
    options: {
        sets: string[];
        rarities: string[];
        types: string[];
    };
    selected: {
        sets: string[];
        rarities: string[];
        types: string[];
    };
    onToggle: (category: string, value: string) => void;
    onClear: () => void;
}

export default function FilterSidebar({ options, selected, onToggle, onClear }: FilterSidebarProps) {
    return (
        <div className="w-full flex-shrink-0 space-y-10 animate-fade-in lg:block">
            {/* Project Header Branding */}
            <div className="pb-4">
                <div className="flex items-center gap-4">
                    <div className="h-6 w-1.5 bg-rose-600 rounded-full"></div>
                    <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-900">Refinar Busca</h2>
                </div>
            </div>

            {/* Arquivos Section */}
            <div className="space-y-4">
                <h3 className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.15em] ml-5">
                    Arquivos
                </h3>
                <div className="flex flex-col gap-2">
                    {options.sets.map((set) => {
                        const isSelected = selected.sets.includes(set);
                        return (
                            <button
                                key={set}
                                onClick={() => onToggle('sets', set)}
                                className={`flex items-center justify-between px-5 py-3 border rounded-2xl transition-all group ${isSelected
                                    ? 'border-rose-600 bg-rose-50 shadow-sm'
                                    : 'border-slate-100 bg-white hover:border-rose-200 hover:shadow-sm'
                                    }`}
                            >
                                <span className={`text-[11px] font-black tracking-wider transition-colors ${isSelected ? 'text-rose-600' : 'text-slate-500 group-hover:text-slate-900'
                                    }`}>{set}</span>
                                <div className={`h-2.5 w-2.5 rounded-full border transition-all ${isSelected
                                    ? 'border-rose-600 bg-rose-600 scale-110'
                                    : 'border-slate-200 group-hover:border-rose-600 group-hover:bg-rose-600'
                                    }`}></div>
                            </button>
                        );
                    })}
                    {options.sets.length === 0 && (
                        <p className="text-[10px] text-slate-400 italic ml-5">Nenhuma edição disponível</p>
                    )}
                </div>
            </div>

            {/* Condição e Raridade Section */}
            <div className="space-y-4">
                <h3 className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.15em] ml-5">
                    Condição e Raridade
                </h3>
                <div className="flex flex-col gap-2">
                    {options.rarities.map((rarity) => {
                        const isSelected = selected.rarities.includes(rarity);
                        return (
                            <button
                                key={rarity}
                                onClick={() => onToggle('rarities', rarity)}
                                className={`flex items-center justify-between px-5 py-3 border rounded-2xl transition-all group ${isSelected
                                    ? 'border-rose-600 bg-rose-50 shadow-sm'
                                    : 'border-slate-100 bg-white hover:border-rose-200 hover:shadow-sm'
                                    }`}
                            >
                                <span className={`text-[11px] font-black tracking-wider transition-colors ${isSelected ? 'text-rose-600' : 'text-slate-500 group-hover:text-slate-900'
                                    }`}>{rarity}</span>
                                <div className={`h-4 w-4 rounded-md border-2 transition-all flex items-center justify-center ${isSelected
                                    ? 'border-rose-600 bg-rose-600'
                                    : 'border-slate-100 group-hover:border-rose-600'
                                    }`}>
                                    {isSelected && <span className="text-[10px] text-white">✓</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Elementos Essenciais Section */}
            <div className="space-y-4">
                <h3 className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.15em] ml-5">
                    Elementos
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {options.types.map((type) => {
                        const isSelected = selected.types.includes(type);
                        return (
                            <button
                                key={type}
                                onClick={() => onToggle('types', type)}
                                className={`h-10 border text-[9px] font-black uppercase tracking-widest transition-all rounded-xl ${isSelected
                                    ? 'border-rose-600 bg-rose-600 text-white shadow-md shadow-rose-600/20'
                                    : 'border-slate-100 bg-white text-slate-500 hover:border-rose-600 hover:text-rose-600 hover:shadow-sm'
                                    }`}
                            >
                                {type}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Clear Filters Button */}
            <div className="pt-4">
                <button
                    onClick={onClear}
                    className="w-full h-12 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-2xl border border-slate-100 border-dashed"
                >
                    Limpar Filtros
                </button>
            </div>
        </div>
    );
}
