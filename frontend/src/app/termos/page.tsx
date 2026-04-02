'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermosPage() {
    return (
        <div className="min-h-screen bg-[#f4f1ea] px-6 py-20 text-slate-900 selection:bg-rose-200 selection:text-rose-950">
            <div className="mx-auto max-w-4xl">
                <Link href="/" className="mb-10 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 transition-colors hover:text-slate-950">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para a página inicial
                </Link>

                <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-16">
                    <div className="mb-12 border-b border-slate-100 pb-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Documento Oficial</span>
                        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">Termos e Condições <br/>de Uso</h1>
                        <p className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">Última atualização: Abril de 2026</p>
                    </div>

                    <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-rose-600 prose-a:no-underline hover:prose-a:underline">
                        <p className="lead text-lg font-medium text-slate-600">
                            Bem-vindo à TCG Mega Store (TCG Hub). A plataforma atua como intermediadora de negócios (Marketplace) entre compradores e vendedores independentes do cenário de Trading Card Games.
                            Ao se cadastrar na plataforma, você concorda irrestritamente com as condições estipuladas abaixo.
                        </p>

                        <h2 className="mt-12 text-2xl">1. Natureza do Serviço</h2>
                        <p>A TCG Hub fornece o espaço virtual para o anúncio de cartas colecionáveis. O comércio em ofertas do tipo "P2P" (Peer-to-Peer) ocorre diretamente entre os usuários. A plataforma não é proprietária dos itens dos usuários vendedores, não tem posse deles, e não se responsabiliza por defeitos ocultos nas cartas de terceiros.</p>

                        <h2 className="mt-12 text-2xl">2. Responsabilidades do Vendedor</h2>
                        <ul className="space-y-3">
                            <li><strong>Avaliação Honesta da Condição:</strong> O vendedor compromete-se a classificar as cartas rigorosamente conforme os padrões de mercado (Mint, Near Mint, LP, MP, HP, Damaged). Listagens fraudulentas resultarão em banimento permanente e estorno do saldo.</li>
                            <li><strong>Embalagem e Envio:</strong> O vendedor é totalmente responsável por embalar a carta de forma segura (uso obrigatório de <em>sleeves</em> e papelão rígido/<em>toploader</em>). O envio deve ocorrer no prazo máximo de <strong>03 dias úteis</strong> após a confirmação do pagamento.</li>
                            <li><strong>Taxa da Plataforma:</strong> A TCG Hub retém automaticamente uma taxa de <strong>8%</strong> sobre a venda da carta para cobrir custos operacionais e manutenção de ecossistema.</li>
                        </ul>

                        <h2 className="mt-12 text-2xl">3. Direitos e Garantias do Comprador</h2>
                        <p>Garantimos um ambiente de negociação protegido pelo <strong>Mercado Pago</strong>:</p>
                        <ul className="space-y-3">
                            <li>Se a carta não for postada no prazo, ou caso sofra extravio pelos Correios com prova documentada, o comprador receberá o estorno integral do valor pago.</li>
                            <li>Se a carta recebida for significativamente divergente da condição anunciada, o comprador terá até <strong>7 dias úteis</strong> após o recebimento para acionar o suporte da TCG Hub acompanhado de vídeo comprovando o <em>unboxing</em>. Nenhuma devolução é aceita sem o vídeo de abertura do pacote.</li>
                        </ul>

                        <h2 className="mt-12 text-2xl">4. Processamento Financeiro e Saques</h2>
                        <p>Todas as transações são capturadas através do repassador Mercado Pago. Para os vendedores, os fundos ficam travados (disponíveis como "Saldo Bloqueado") até a mercadoria ser entregue à transportadora e atualizada no sistema.</p>
                        <p>Solicitações de saque devem ter um valor mínimo acumulado e podem levar até 48 horas úteis para repasse, sujeito a validação de segurança do CPF/CNPJ atrelado à conta.</p>

                        <h2 className="mt-12 text-2xl">5. Conduta e Integridade</h2>
                        <p>Qualquer tentativa de burlar a taxa da plataforma fornecendo informações de contato direto nos anúncios (WhatsApp, E-mail, Chave Pix em descrições), bem como o uso de robôs para manipulação de lances em Leilões, resultará em suspensão sumária sem aviso prévio.</p>
                        
                        <div className="mt-16 rounded-3xl bg-slate-50 p-8 border border-slate-100">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">Consentimento Legal</h3>
                            <p className="text-sm text-slate-600 m-0">Ao prosseguir com a criação da sua conta e ao assinalar o campo de concordância, você assume ter lido e compreendido todas as cláusulas acima, submetendo-se ativamente às políticas da TCG Hub e à legislação vigente envolvendo comércio eletrônico nacional.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
