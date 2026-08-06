"use client";

interface FilterSidebarProps {
  options: {
    sets: string[];
    rarities: string[];
    languages: string[];
    conditions: string[];
    grades: string[];
    finishes: string[];
  };
  selected: {
    sets: string[];
    rarities: string[];
    languages: string[];
    conditions: string[];
    grades: string[];
    finishes: string[];
  };
  priceRange: { min: string; max: string };
  availableOnly: boolean;
  onPriceChange: (field: 'min' | 'max', value: string) => void;
  onAvailabilityChange: (value: boolean) => void;
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
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3
          className="text-[10px] font-black uppercase tracking-[0.24em]"
          style={{ color: '#8b95b5' }}
        >
          {title}
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-black"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: '#8b95b5',
          }}
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p
          className="rounded-xl px-4 py-3 text-xs font-medium"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.08)',
            color: '#8b95b5',
          }}
        >
          Nenhuma opção disponível ainda.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const isSelected = values.includes(item);
            return (
              <button
                key={item}
                onClick={() => onToggle(category, item)}
                className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                style={
                  isSelected
                    ? {
                        background: '#e11d48',
                        color: '#fff',
                        border: '1px solid #e11d48',
                        boxShadow: '0 0 12px rgba(225,29,72,0.3)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        color: '#8b95b5',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }
                }
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(225,29,72,0.4)';
                    (e.currentTarget as HTMLElement).style.color = '#ffb3b6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLElement).style.color = '#8b95b5';
                  }
                }}
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

export default function FilterSidebar({
  options,
  selected,
  priceRange,
  availableOnly,
  onPriceChange,
  onAvailabilityChange,
  onToggle,
  onClear,
}: FilterSidebarProps) {
  return (
    <div
      className="space-y-6 p-5"
      style={{
        background: '#191f31',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1rem',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-4 border-b pb-4"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-[0.24em]"
            style={{ color: '#8b95b5' }}
          >
            Refinar busca
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-white">
            Filtros
          </h2>
        </div>
        <button
          onClick={onClear}
          className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all"
          style={{
            background: 'rgba(225,29,72,0.1)',
            color: '#ffb3b6',
            border: '1px solid rgba(225,29,72,0.2)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(225,29,72,0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(225,29,72,0.1)';
          }}
        >
          Limpar
        </button>
      </div>

      <FilterSection
        category="sets"
        items={options.sets}
        title="Edições / Set"
        values={selected.sets}
        onToggle={onToggle}
      />
      <FilterSection
        category="rarities"
        items={options.rarities}
        title="Raridade e Condição"
        values={selected.rarities}
        onToggle={onToggle}
      />
      <FilterSection category="languages" items={options.languages} title="Idioma" values={selected.languages} onToggle={onToggle} />
      <FilterSection category="conditions" items={options.conditions} title="Condição" values={selected.conditions} onToggle={onToggle} />
      <FilterSection category="grades" items={options.grades} title="Graduação" values={selected.grades} onToggle={onToggle} />
      <FilterSection category="finishes" items={options.finishes} title="Acabamento" values={selected.finishes} onToggle={onToggle} />

      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8b95b5]">Faixa de preço</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-[10px] font-bold text-[#8b95b5]">Mínimo
            <input type="number" min="0" step="0.01" inputMode="decimal" value={priceRange.min} onChange={(event) => onPriceChange('min', event.target.value)} className="input-dark h-11! w-full px-3! text-base" placeholder="R$ 0" />
          </label>
          <label className="space-y-1 text-[10px] font-bold text-[#8b95b5]">Máximo
            <input type="number" min="0" step="0.01" inputMode="decimal" value={priceRange.max} onChange={(event) => onPriceChange('max', event.target.value)} className="input-dark h-11! w-full px-3! text-base" placeholder="Sem limite" />
          </label>
        </div>
      </section>

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-white/5 px-3 text-sm font-bold text-white">
        Somente disponíveis
        <input type="checkbox" checked={availableOnly} onChange={(event) => onAvailabilityChange(event.target.checked)} className="h-5 w-5 accent-rose-600" />
      </label>
    </div>
  );
}
