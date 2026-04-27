'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Search, X, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EDITIONS, type SetTuple, type YearData } from './_data';


/* ─── Parent-child grouping ────────────────────────────────
   Detects sets sharing a common prefix before " - " or ": "
   Groups them under a virtual parent node.
──────────────────────────────────────────────────────────── */
interface TreeNode {
  name: string;
  code: string;
  alias?: string;
  children: SetTuple[];
}

function buildTree(sets: SetTuple[]): TreeNode[] {
  // Count how many sets share each prefix
  const prefixCount = new Map<string, number>();
  sets.forEach(([name]) => {
    const sep = name.includes(': ') ? ': ' : name.includes(' - ') ? ' - ' : null;
    if (sep) {
      const prefix = name.split(sep)[0];
      prefixCount.set(prefix, (prefixCount.get(prefix) ?? 0) + 1);
    }
  });

  const usedAsChild = new Set<string>();
  const nodes: TreeNode[] = [];

  sets.forEach(([name, code]) => {
    const sep = name.includes(': ') ? ': ' : name.includes(' - ') ? ' - ' : null;
    const prefix = sep ? name.split(sep)[0] : null;

    // This set IS a child if its prefix appears 2+ times
    if (prefix && (prefixCount.get(prefix) ?? 0) >= 2) {
      usedAsChild.add(name);
    }
  });

  sets.forEach(([name, code, alias]) => {
    if (usedAsChild.has(name)) return; // skip — will be attached to parent

    // Gather children
    const sep = name.includes(': ') ? ': ' : name.includes(' - ') ? ' - ' : null;
    // This is a standalone set — check if other sets use its name as prefix
    const children: SetTuple[] = sets.filter(([cName]) => {
      if (!usedAsChild.has(cName)) return false;
      const cSep = cName.includes(': ') ? ': ' : ' - ';
      return cName.split(cSep)[0] === name || cName.split(cSep)[0] === name;
    });

    // If this set itself is a "prefix-only" virtual parent (shared prefix with no standalone entry)
    if (children.length === 0) {
      // Check if we need a virtual parent
      const sep2 = name.includes(': ') ? ': ' : name.includes(' - ') ? ' - ' : null;
      if (sep2) {
        const prefix2 = name.split(sep2)[0];
        if ((prefixCount.get(prefix2) ?? 0) >= 2) {
          // This IS a child, skip
          return;
        }
      }
    }

    nodes.push({ name, code, alias, children });
  });

  // Virtual parents: prefixes that have NO standalone entry but group 2+ children
  const coveredPrefixes = new Set(nodes.map(n => n.name));
  prefixCount.forEach((count, prefix) => {
    if (count >= 2 && !coveredPrefixes.has(prefix)) {
      const children = sets.filter(([n]) => {
        const s = n.includes(': ') ? ': ' : ' - ';
        return n.includes(s) && n.split(s)[0] === prefix && usedAsChild.has(n);
      });
      if (children.length >= 2) {
        // Find insertion point (position of first child in original list)
        const firstIdx = sets.findIndex(([n]) => n === children[0][0]);
        nodes.splice(
          nodes.findIndex((_, i) => {
            const orig = sets.findIndex(([n]) => n === nodes[i]?.name);
            return orig > firstIdx;
          }) - 1 || nodes.length,
          0,
          { name: prefix, code: '', children }
        );
      }
    }
  });

  return nodes;
}

/* ─── Subgroup Modal ──────────────────────────────────────────
   Opens when a parent set (with children) is clicked.
   Lists sub-sets so the user can pick one.
──────────────────────────────────────────────────────────── */
function SubgroupModal({
  parentName, parentCode, parentAlias, children, onClose, onSelect,
}: {
  parentName: string;
  parentCode?: string;
  parentAlias?: string;
  children: SetTuple[];
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(8,12,24,0.85)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-white/10 p-5"
          style={{ background: '#131b30', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.7)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: '#8b95b5' }}>Subgrupos</p>
              <h3 className="text-base font-black text-white leading-snug">{parentName}</h3>
            </div>
            <button onClick={onClose}
              className="mt-0.5 rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Sub-set list */}
          <div className="space-y-1">
            {/* View All Option */}
            <button
              onClick={() => {
                const allCodes = [parentCode, ...children.map(c => c[1])].filter(Boolean).join(',');
                onSelect(allCodes);
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all bg-rose-600/10 hover:bg-rose-600/20 mb-2 border border-rose-500/20"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600/20">
                <Sparkles className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <span className="flex-1 text-sm font-black text-rose-500 transition-colors">
                Ver Tudo desta Coleção
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-rose-500" />
            </button>

            {/* Parent set option (if it has a code) */}
            {parentCode && (
              <button
                onClick={() => onSelect(parentCode)}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all bg-white/5 hover:bg-white/[0.08] mb-1 border border-white/5"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                  <img src={`https://assets.tcgdex.net/univ/${parentCode.toLowerCase()}/symbol.png`} alt=""
                    loading="lazy" className="h-5 w-5 object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                </div>
                <span className="flex-1 text-sm font-bold text-rose-400 group-hover:text-rose-300 transition-colors">
                  Ver Coleção Principal
                </span>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {parentAlias || parentCode}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              </button>
            )}

            {children.map(([name, code, alias]) => {
              const subLabel = name.split(/: | - /).slice(1).join(' - ') || name;
              return (
                <button key={code}
                  onClick={() => onSelect(code)}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/[0.06]">
                  {/* Symbol */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    <img src={`https://assets.tcgdex.net/univ/${code.toLowerCase()}/symbol.png`} alt=""
                      loading="lazy" className="h-5 w-5 object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                    {subLabel}
                  </span>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 group-hover:text-rose-300 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {alias || code}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-rose-500 transition-colors" />
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Set Row ──────────────────────────────────────────────── */
function SetRow({ name, code, alias, isChild, hasChildren, onNameClick, onExpandClick }: {
  name: string; code: string; alias?: string; isChild?: boolean; hasChildren?: boolean; 
  onNameClick: () => void; onExpandClick?: () => void;
}) {
  return (
    <div className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-[6px] transition-all hover:bg-white/[0.05] ${isChild ? 'pl-6' : ''}`}>
      {isChild && <span className="shrink-0 text-[11px] text-slate-600">└</span>}

      {/* Main Clickable Area (Name + Symbol) */}
      <button 
        onClick={onNameClick}
        className="flex flex-1 items-center gap-2.5 text-left overflow-hidden"
      >
        {/* Symbol image */}
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <img src={`https://assets.tcgdex.net/univ/${code.toLowerCase()}/symbol.png`} alt=""
            loading="lazy" className="h-4 w-4 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
        </div>

        {/* Name */}
        <span className={`truncate text-[13px] transition-colors group-hover:text-white ${isChild ? 'text-slate-500' : 'font-semibold text-slate-300'}`}>
          {name}
        </span>
      </button>

      {/* Right Side: Code badge or Expand button */}
      {code && !hasChildren && (
        <button 
          onClick={onNameClick}
          className="shrink-0 rounded px-1.5 py-[3px] text-[9px] font-black uppercase tracking-wider text-slate-500 transition-colors group-hover:text-rose-300"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {alias || code}
        </button>
      )}
      
      {hasChildren && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onExpandClick?.();
          }}
          className="shrink-0 flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 transition-all hover:bg-rose-600/20 hover:text-rose-400"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <ChevronDown className="h-2.5 w-2.5" /> ver subgrupos
        </button>
      )}
    </div>
  );
}

/* ─── Year Card ─────────────────────────────────────────────── */
function YearCard({ data, defaultOpen }: { data: YearData; defaultOpen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [modal, setModal] = useState<{ parentName: string; parentCode?: string; parentAlias?: string; children: SetTuple[] } | null>(null);
  const tree = useMemo(() => buildTree(data.sets), [data.sets]);


  return (
    <>
      <div className="group overflow-hidden rounded-2xl border border-white/5 transition-all hover:border-white/10"
        style={{ background: 'rgba(30,41,59,0.2)' }}>
        <button onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition-all hover:bg-white/[0.02]">
          <h2 className="text-4xl font-black italic tracking-tighter text-rose-600 transition-all group-hover:scale-105 group-hover:text-rose-500">
            {data.year}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              {data.sets.length} Edições
            </span>
            <ChevronDown className="h-4 w-4 text-slate-600 transition-transform duration-300 group-hover:text-slate-400"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
          </div>
        </button>

        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden">
              <div className="px-3 py-3 space-y-0.5">
                {tree.map(node => (
                  <SetRow key={node.code || node.name}
                    name={node.name} 
                    code={node.code}
                    alias={node.alias}
                    hasChildren={node.children.length > 0}
                    onNameClick={() => {
                      if (node.code) router.push(`/edicoes/${node.code}`);
                    }}
                    onExpandClick={() => {
                      setModal({ 
                        parentName: node.name, 
                        parentCode: node.code, 
                        parentAlias: node.alias, 
                        children: node.children 
                      });
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subgroup modal */}
      {modal && (
        <SubgroupModal
          parentName={modal.parentName}
          parentCode={modal.parentCode}
          parentAlias={modal.parentAlias}
          children={modal.children}
          onClose={() => setModal(null)}
          onSelect={code => {
            setModal(null);
            router.push(`/edicoes/${code}`);
          }}
        />
      )}
    </>
  );
}


/* ─── Page ───────────────────────────────────────────────────── */
export default function EdicoesPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EDITIONS;
    return EDITIONS.map(yr => ({
      ...yr,
      sets: yr.sets.filter(([name, code, alias]) =>
        name.toLowerCase().includes(q) || 
        code.toLowerCase().includes(q) || 
        (alias && alias.toLowerCase().includes(q))
      ),
    })).filter(yr => yr.sets.length > 0);
  }, [search]);

  const top3 = EDITIONS.slice(0, 3).map(y => y.year);
  const left = filtered.filter((_, i) => i % 2 === 0);
  const right = filtered.filter((_, i) => i % 2 === 1);
  const total = EDITIONS.reduce((a, y) => a + y.sets.length, 0);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0c1324' }}>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 py-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-rose-600/8 blur-3xl" />
          <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-blue-600/8 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>
        <div className="page-frame relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="eyebrow flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Pokémon TCG</div>
            <h1 className="font-black text-white" style={{ fontSize: 'clamp(32px,5vw,60px)', letterSpacing: '-0.03em', lineHeight: 0.92 }}>
              Todas as{' '}
              <span style={{ background: 'linear-gradient(135deg,#ffb3b6 0%,#e11d48 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Edições
              </span>
            </h1>
            <p className="text-sm" style={{ color: '#8b95b5' }}>
              Clique em uma edição para ver as cartas disponíveis no marketplace.
            </p>
          </div>
          <div className="flex gap-8 shrink-0">
            {[ ['Edições', total] ].map(([label, value]) => (
              <div key={label as string} className="text-right">
                <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: '#8b95b5' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div className="sticky top-[112px] z-30 border-b border-white/5 py-2.5"
        style={{ background: 'rgba(12,19,36,0.97)', backdropFilter: 'blur(20px)' }}>
        <div className="page-frame flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input type="text" placeholder="Nome ou sigla (SVP, MEW…)"
              value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <span className="ml-auto text-[10px] font-black uppercase tracking-widest" style={{ color: '#8b95b5' }}>
            {filtered.reduce((a, y) => a + y.sets.length, 0)} resultados
          </span>
        </div>
      </div>

      {/* Two-column timeline */}
      <div className="page-frame py-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <p className="text-lg font-black text-white">Nenhuma edição encontrada</p>
            <button onClick={() => setSearch('')} className="btn-ghost text-sm">Limpar busca</button>
          </div>
        ) : (
          <div className="relative">
            {/* Center spine */}
            <div className="pointer-events-none absolute left-1/2 top-0 hidden md:block h-full w-px -translate-x-1/2"
              style={{ background: 'linear-gradient(to bottom,transparent,rgba(255,255,255,0.05) 4%,rgba(255,255,255,0.05) 96%,transparent)' }} />

            <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
              <div className="space-y-6">
                {left.map(yr => (
                  <div key={yr.year} className="relative">
                    <div className="absolute -right-[21px] top-[22px] z-10 hidden md:flex h-3 w-3 translate-x-1/2 rounded-full border-2"
                      style={{ background: '#0c1324', borderColor: '#e11d48' }} />
                    <YearCard data={yr} defaultOpen={top3.includes(yr.year)} />
                  </div>
                ))}
              </div>
              <div className="space-y-6 md:mt-16">
                {right.map(yr => (
                  <div key={yr.year} className="relative">
                    <div className="absolute -left-[21px] top-[22px] z-10 hidden md:flex h-3 w-3 -translate-x-1/2 rounded-full border-2"
                      style={{ background: '#0c1324', borderColor: '#e11d48' }} />
                    <YearCard data={yr} defaultOpen={top3.includes(yr.year)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
