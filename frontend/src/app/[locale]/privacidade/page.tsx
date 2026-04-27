import React from 'react';
import Link from 'next/link';

import { getBusinessRules } from '@/lib/business-rules-server';

export default async function PrivacidadePage() {
    const businessRules = await getBusinessRules();

    return (
        <div className="min-h-screen max-w-4xl animate-fade-up px-6 py-32 text-slate-800 mx-auto">
            <div className="mb-16 space-y-4 text-center">
                <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    Documentacao Legal
                </span>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900">
                    Politica de <span className="text-rose-600">Privacidade.</span>
                </h1>
                <p className="text-sm font-medium text-slate-500">Atualizado em 01 de Abril de 2026 - Em conformidade com a LGPD (Lei 13.709/18)</p>
            </div>

            <div className="prose prose-slate max-w-none space-y-12 rounded-[50px] border border-slate-200 bg-white p-8 shadow-sm sm:p-16">
                <section className="space-y-4">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">1. Introducao</h2>
                    <p className="font-medium leading-relaxed text-slate-600">
                        A TCG Mega Store valoriza a sua privacidade. Esta Politica de Privacidade explica como coletamos, usamos, armazenamos e protegemos seus dados pessoais ao utilizar nossa plataforma, em conformidade com a Lei Geral de Protecao de Dados (LGPD).
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">2. Dados Coletados</h2>
                    <p className="font-medium leading-relaxed text-slate-600">Coletamos apenas os dados necessarios para o funcionamento da loja e entrega de produtos:</p>
                    <ul className="list-disc space-y-2 pl-6 font-medium text-slate-600">
                        <li><strong>Identificacao:</strong> Nome completo, CPF e dados de cadastro necessarios para autenticacao e faturamento quando aplicavel.</li>
                        <li><strong>Contato:</strong> E-mail e telefone celular.</li>
                        <li><strong>Entrega:</strong> Enderecos residenciais ou comerciais fornecidos por voce.</li>
                        <li><strong>Financeiro:</strong> Dados de pagamento sao processados de forma segura pelo Mercado Pago. Nao armazenamos numeros de cartao em nossos servidores.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">3. Finalidade do Tratamento</h2>
                    <p className="font-medium leading-relaxed text-slate-600">Usamos seus dados para:</p>
                    <ul className="list-disc space-y-2 pl-6 font-medium text-slate-600">
                        <li>Processar e enviar seus pedidos de cartas Pokemon TCG.</li>
                        <li>Gerenciar o seu saldo de cashback e creditos internos.</li>
                        <li>Enviar comunicacoes sobre o status do seu pedido.</li>
                        <li>Garantir a seguranca e prevenir fraudes em nossa plataforma.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">4. Seus Direitos (LGPD)</h2>
                    <p className="font-medium leading-relaxed text-slate-600">Como titular dos dados, voce tem direito a:</p>
                    <ul className="list-disc space-y-2 pl-6 font-medium text-slate-600">
                        <li><strong>Confirmacao e Acesso:</strong> Saber se tratamos seus dados e acessa-los.</li>
                        <li><strong>Correcao:</strong> Corrigir dados incompletos ou inexatos pela area Minha Conta.</li>
                        <li><strong>Portabilidade:</strong> Solicitar a exportacao dos seus dados pessoais.</li>
                        <li><strong>Eliminacao:</strong> Solicitar a exclusao definitiva dos seus dados de nosso sistema, respeitadas as obrigacoes legais.</li>
                        <li><strong>Revogacao do Consentimento:</strong> Descontinuar o uso de dados baseados em consentimento.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">5. Seguranca</h2>
                    <p className="font-medium leading-relaxed text-slate-600">
                        Implementamos criptografia SSL, autenticacao segura via Supabase Auth e monitoramento constante contra acessos nao autorizados para proteger seus dados e transacoes.
                    </p>
                </section>

                <section className="space-y-4 border-t border-slate-100 pt-8">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">6. Contato do Encarregado (DPO)</h2>
                    <p className="font-medium leading-relaxed text-slate-600">
                        Para duvidas ou para exercer seus direitos, entre em contato com o canal de suporte oficial ou pelo e-mail <span className="font-black text-rose-600">privacidade@tcgmegastore.com.br</span>.
                    </p>
                </section>

                <section id="termos" className="space-y-4 border-t border-slate-100 pt-12">
                    <h2 className="mb-8 text-3xl font-black uppercase tracking-tighter text-slate-900 underline decoration-4 decoration-rose-600 underline-offset-8">Termos de Uso</h2>

                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">1. Aceitacao dos Termos</h3>
                            <p className="font-medium leading-relaxed text-slate-600">
                                Ao acessar a TCG Mega Store, voce concorda em cumprir estes termos de servico, todas as leis e regulamentos aplicaveis. Se nao concordar com algum destes termos, nao utilize a plataforma.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">2. Uso da Plataforma</h3>
                            <p className="font-medium leading-relaxed text-slate-600">
                                O acesso aos materiais, catalogo, leiloes, creditos e servicos do site deve ocorrer de forma licita, pessoal e compativel com as regras publicadas em cada fluxo da plataforma.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">3. Isencao de Responsabilidade</h3>
                            <p className="font-medium leading-relaxed text-slate-600">
                                Os materiais no site sao fornecidos no estado em que se encontram. Nao oferecemos garantias alem das previstas em lei e das politicas comerciais expressamente divulgadas na plataforma.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">4. Limitacoes</h3>
                            <p className="font-medium leading-relaxed text-slate-600">
                                Em nenhum caso a TCG Mega Store ou seus fornecedores serao responsaveis por danos decorrentes do uso indevido da plataforma, indisponibilidades de terceiros ou informacoes incorretas fornecidas pelo proprio usuario.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">5. Propriedade Intelectual</h3>
                            <p className="font-medium leading-relaxed text-slate-600">
                                Pokemon TCG e suas respectivas marcas, logos e artes sao propriedades da The Pokemon Company. A TCG Mega Store atua como plataforma de revenda e gestao de itens colecionaveis de terceiros.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">6. Estornos de Creditos</h3>
                            <p className="font-medium leading-relaxed text-slate-600">
                                Solicitacoes de devolucao de creditos para o mesmo meio de pagamento original estao sujeitas a taxa administrativa de {businessRules.creditRefundFeePercentage}% sobre o valor solicitado. O processamento do estorno pode levar ate {businessRules.creditRefundProcessingHours} horas apos a confirmacao da solicitacao.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="flex justify-center pt-10">
                    <Link href="/">
                        <button className="h-14 rounded-2xl bg-slate-900 px-10 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-rose-600">
                            Voltar para a Inicio
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
