import React from 'react';
import Link from 'next/link';

import { getBusinessRules } from '@/lib/business-rules-server';

export default async function SupportPage() {
    const businessRules = await getBusinessRules();

    const faqs = [
        {
            q: 'Quais formas de pagamento voces aceitam?',
            a: 'Pix, cartao de credito e checkout Mercado Pago. O objetivo da pagina e deixar o estado do pedido mais claro depois da compra.',
        },
        {
            q: 'Como as cartas sao enviadas?',
            a: 'Cada envio sai com protecao fisica reforcada e rastreamento, para a experiencia de compra continuar segura ate a entrega.',
        },
        {
            q: 'As cartas passam por verificacao?',
            a: 'Sim. O acervo listado no marketplace parte de uma curadoria interna antes de aparecer para o usuario.',
        },
        {
            q: 'Quando meu pedido e postado?',
            a: 'Assim que o pagamento confirma, o pedido entra na fila de preparacao e a pagina de pedidos passa a refletir esse status.',
        },
        {
            q: 'Como funciona o estorno de creditos?',
            a: `Solicitacoes de estorno passam por analise do suporte, aplicam taxa administrativa de ${businessRules.creditRefundFeePercentage}% e sao concluidas em ate ${businessRules.creditRefundProcessingHours} horas.`,
        },
    ];

    return (
        <div className="animate-fade-up pb-20 pt-10">
            <section className="page-frame grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="page-hero space-y-7">
                    <span className="eyebrow">Suporte ao colecionador</span>
                    <div className="max-w-3xl space-y-5">
                        <h1 className="text-5xl font-black tracking-[-0.07em] text-white sm:text-6xl">
                            Atendimento pensado para continuar o fluxo da compra.
                        </h1>
                        <p className="max-w-2xl text-base leading-8 text-slate-500">
                            Em vez de uma pagina generica, o suporte agora funciona como extensao natural do marketplace: orienta pedido, pagamento, estorno e acompanhamento sem repetir informacao.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            ['Pagamento', 'Status visivel apos compra'],
                            ['Pedidos', 'Historico e acompanhamento'],
                            ['Estorno', `Ate ${businessRules.creditRefundProcessingHours}h para concluir`],
                        ].map(([label, value]) => (
                            <div key={label} className="surface-card p-5">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
                                <p className="mt-3 text-lg font-black tracking-tight text-white">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="surface-card grid gap-4 p-6">
                    {[
                        ['Email', 'suporte@tcgmegastore.com.br', 'Canal para duvidas detalhadas, comprovantes e suporte pos-compra.'],
                        ['WhatsApp', '(11) 99999-0000', 'Atendimento rapido para pedido, envio, status de pagamento e orientacao sobre estorno.'],
                    ].map(([label, value, description]) => (
                        <div key={label} className="rounded-[1.75rem] border border-white/5 bg-white/5 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
                            <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">{value}</p>
                            <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
                        </div>
                    ))}

                    <div className="rounded-[1.75rem] border border-rose-500/20 bg-rose-500/5 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">Sugestao de rota</p>
                        <p className="mt-3 text-sm leading-7 text-slate-300">
                            Se o problema for pagamento, pedido ou estorno de creditos, va primeiro para a sua area de pedidos ou creditos. Se for catalogo ou carta, comece pelo marketplace.
                        </p>
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <Link href="/minha-conta/pedidos" className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-[10px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-rose-600">
                                Ver meus pedidos
                            </Link>
                            <Link href="/minha-conta/creditos" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500">
                                Ver meus creditos
                            </Link>
                            <Link href="/marketplace" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500">
                                Voltar ao marketplace
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="page-frame mt-8 grid gap-4">
                {faqs.map((faq, index) => (
                    <article key={faq.q} className="surface-card p-6">
                        <div className="grid gap-4 md:grid-cols-[64px_minmax(0,1fr)] md:items-start">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                                {String(index + 1).padStart(2, '0')}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-[-0.04em] text-white">{faq.q}</h2>
                                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500">{faq.a}</p>
                            </div>
                        </div>
                    </article>
                ))}
            </section>
        </div>
    );
}
