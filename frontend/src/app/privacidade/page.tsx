'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacidadePage() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-32 min-h-screen text-slate-800 animate-fade-up">
            <div className="mb-16 text-center space-y-4">
                <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest border border-slate-200">
                    Documentação Legal
                </span>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900">
                    Política de <span className="text-rose-600">Privacidade.</span>
                </h1>
                <p className="text-slate-500 font-medium text-sm">Atualizado em 05 de Março de 2026 • Em conformidade com a LGPD (Lei 13.709/18)</p>
            </div>

            <div className="bg-white border border-slate-200 p-8 sm:p-16 rounded-[50px] shadow-sm space-y-12 prose prose-slate max-w-none">

                <section className="space-y-4">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">1. Introdução</h2>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        A TCG Mega Store valoriza a sua privacidade. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos seus dados pessoais ao utilizar nossa plataforma, em total conformidade com a Lei Geral de Proteção de Dados (LGPD).
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">2. Dados Coletados</h2>
                    <p className="text-slate-600 leading-relaxed font-medium">Coletamos apenas os dados necessários para o funcionamento da loja e entrega de produtos:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 font-medium">
                        <li><strong>Identificação:</strong> Nome completo, CPF (para emissão de nota fiscal se aplicável).</li>
                        <li><strong>Contato:</strong> E-mail e telefone celular.</li>
                        <li><strong>Entrega:</strong> Endereços residenciais ou comerciais fornecidos por você.</li>
                        <li><strong>Financeiro:</strong> Dados de pagamento são processados de forma segura pelo Mercado Pago. Não armazenamos números de cartão em nossos servidores.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">3. Finalidade do Tratamento</h2>
                    <p className="text-slate-600 leading-relaxed font-medium">Usamos seus dados para:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 font-medium">
                        <li>Processar e enviar seus pedidos de cartas Pokémon TCG.</li>
                        <li>Gerenciar o seu saldo de Cashback em nossa carteira virtual.</li>
                        <li>Enviar comunicações sobre o status do seu pedido.</li>
                        <li>Garantir a segurança e prevenir fraudes em nossa plataforma.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">4. Seus Direitos (LGPD)</h2>
                    <p className="text-slate-600 leading-relaxed font-medium">Como titular dos dados, você tem direito a:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 font-medium">
                        <li><strong>Confirmação e Acesso:</strong> Saber se tratamos seus dados e acessá-los.</li>
                        <li><strong>Correção:</strong> Corrigir dados incompletos ou inexatos através da sua área "Minha Conta".</li>
                        <li><strong>Portabilidade:</strong> Solicitar a exportação dos seus dados pessoais.</li>
                        <li><strong>Eliminação:</strong> Solicitar a exclusão definitiva dos seus dados de nosso sistema.</li>
                        <li><strong>Revogação do Consentimento:</strong> Descontinuar o uso de dados baseados em consentimento.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">5. Segurança</h2>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        Implementamos criptografia SSL de 256 bits, autenticação segura via Supabase Auth e monitoramento constante contra acessos não autorizados para garantir que seus ativos e dados estejam sempre blindados.
                    </p>
                </section>

                <section className="space-y-4 pt-8 border-t border-slate-100">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">6. Contato do Encarregado (DPO)</h2>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        Para quaisquer dúvidas ou para exercer seus direitos, entre em contato com nosso Encarregado de Proteção de Dados através do canal de suporte oficial ou pelo e-mail: <span className="text-rose-600 font-black">privacidade@tcgmegastore.com.br</span>
                    </p>
                </section>

                <section id="termos" className="space-y-4 pt-12 border-t border-slate-100">
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase underline decoration-rose-600 decoration-4 underline-offset-8 mb-8">Termos de Uso</h2>

                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase">1. Aceitação dos Termos</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Ao acessar a TCG Mega Store, você concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este site.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase">2. Uso de Licença</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site da TCG Mega Store, apenas para visualização transitória pessoal e não comercial.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase">3. Isenção de Responsabilidade</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Os materiais no site da TCG Mega Store são fornecidos "como estão". Não oferecemos garantias, expressas ou implícitas, e por este meio isentamos e negamos todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase">4. Limitações</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Em nenhum caso a TCG Mega Store ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase">5. Propriedade Intelectual</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Pokémon TCG e suas respectivas marcas, logos e artes são propriedades da The Pokémon Company. A TCG Mega Store é uma plataforma de revenda e gestão de ativos colecionáveis de terceiros.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="pt-10 flex justify-center">
                    <Link href="/">
                        <button className="h-14 px-10 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all">
                            Voltar para a Início
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
