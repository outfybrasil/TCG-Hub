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

function FilterSection({
    items,
    title,
    values,
    onToggle,
    category,
}: {
    items: string[];
    title: string;
    values: string[];
    onToggle: (category: string, value: string) => void;
    category: string;
}) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{title}</h3>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">{items.length}</span>
            </div>

            {items.length === 0 ? (
                <p className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-xs font-medium text-slate-400">
                    Nenhuma opcao disponivel agora.
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {items.map((item) => {
                        const selected = values.includes(item);

                        return (
                            <button
                                key={item}
                                onClick={() => onToggle(category, item)}
                                className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${selected
                                    ? 'border border-rose-600 bg-rose-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                                    }`}
                            >
                                {item}
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default function FilterSidebar({ options, selected, onToggle, onClear }: FilterSidebarProps) {
    return (
        <div className="surface-card space-y-8 p-6 animate-fade-in">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Refinar busca</p>
                    <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">Filtros ativos</h2>
                </div>
                <button
                    onClick={onClear}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                >
                    Limpar
                </button>
            </div>

            <FilterSection category="sets" items={options.sets} title="Edicoes" values={selected.sets} onToggle={onToggle} />
            <FilterSection category="rarities" items={options.rarities} title="Raridade e condicao" values={selected.rarities} onToggle={onToggle} />
            <FilterSection category="types" items={options.types} title="Tipos" values={selected.types} onToggle={onToggle} />
        </div>
    );
}
