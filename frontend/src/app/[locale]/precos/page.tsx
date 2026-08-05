import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BarChart3, Database, Scale, ShieldCheck } from 'lucide-react';

import PriceCatalogSearch from '@/components/PriceCatalogSearch';

export const metadata: Metadata = {
    title: 'Preço de cartas Pokémon no Brasil | TCG Megastore',
    description: 'Consulte preços, faixa justa, histórico e confiança de cartas Pokémon TCG com metodologia transparente e proteção contra manipulação.',
};

export default function PricesPage() {
    return (
        <main className="mx-auto min-h-screen max-w-7xl px-6 py-16">
            <header className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300"><ShieldCheck className="h-4 w-4" /> Referência brasileira independente</div>
                <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">Quanto vale a sua carta?</h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-400 sm:text-lg">O Índice TCG Megastore combina vendas confirmadas e referências de mercado. Um anúncio isolado — barato ou caro demais — não define o preço.</p>
            </header>

            <div className="mt-10"><PriceCatalogSearch /></div>

            <section className="mt-20 grid gap-4 md:grid-cols-3" aria-label="Como funciona o índice">
                <TrustCard icon={<Database />} title="Dados separados" text="Vendas verificadas têm mais peso do que anúncios ainda não concluídos." />
                <TrustCard icon={<Scale />} title="Faixa justa" text="Condição, idioma e acabamento são comparados entre variações equivalentes." />
                <TrustCard icon={<BarChart3 />} title="Confiança visível" text="Mostramos tamanho da amostra, histórico e valores excluídos como outliers." />
            </section>

            <section className="surface-card mt-10 rounded-3xl p-7 sm:p-10">
                <h2 className="text-2xl font-black text-white">Metodologia TCG Megastore</h2>
                <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-400 md:grid-cols-2">
                    <p>Usamos mediana ponderada: vendas pagas dentro da TCG Megastore recebem prioridade, dados antigos perdem peso gradualmente e referências externas servem como contexto.</p>
                    <p>Valores estatisticamente anormais são identificados por faixa interquartil. A oferta continua visível, mas só ganha força no índice quando existir uma transação real confirmada.</p>
                </div>
            </section>
        </main>
    );
}

function TrustCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
    return <article className="surface-card rounded-2xl p-6"><div className="text-emerald-400">{icon}</div><h2 className="mt-4 font-black text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></article>;
}
