# Plano de melhorias — TCG MEGASTORE

Documento de continuidade para a próxima sessão: **06/08/2026**.

## Já concluído

- Tela de vendas adaptada para mobile com cartões responsivos.
- Menu administrativo mobile fixado na parte inferior.
- Estoque administrativo mantido dentro do painel sem trocar o menu.
- Cabine de Comando reorganizada para telas pequenas.
- Arena ao vivo com carta menor no mobile.
- Tela Minha Conta redesenhada com o Impeccable.
- Loja com modo de visualização de 2 ou 4 cartas por linha no mobile.
- Filtros da loja transformados em painel inferior no celular.
- Build de produção validado após as últimas alterações.
- Compra rápida adicionada ao modo compacto, com bloqueio de itens esgotados.
- Catálogo paginado no servidor, com carregamento progressivo, erro e retry.
- Imagens responsivas em AVIF/WebP, lazy loading e fallback preservado.
- Filtros avançados combináveis por preço, idioma, condição, graduação, acabamento e disponibilidade.
- Estados de recuperação padronizados na loja, conta, carteira e live.
- Live com reconexão automática e cronômetro recalibrado pelo servidor.
- RLS financeiro reforçado, liquidação atômica e trilha de auditoria adicionada.

## Próximas tarefas — ordem recomendada

### 1. Compra rápida no modo compacto da loja — prioridade alta

No modo de 4 cartas por linha, manter a visualização compacta e adicionar um botão pequeno para colocar a carta no carrinho sem precisar abrir a página de detalhes.

Critérios de conclusão:

- Botão com área de toque mínima de 44 px.
- Nome e preço continuam legíveis.
- O modo de 2 cartas por linha continua com compra normal.
- Produto esgotado não permite adicionar ao carrinho.

### 2. Paginação e carregamento progressivo do catálogo — prioridade alta

Evitar carregar todo o estoque de uma vez. Implementar paginação ou carregamento incremental, mantendo filtros, ordenação e busca.

Critérios de conclusão:

- Primeira página aparece rapidamente no celular.
- Busca e filtros funcionam em todas as páginas.
- Indicador de carregamento ao buscar mais produtos.
- Estado vazio e erro com botão de tentativa novamente.

### 3. Otimização das imagens — prioridade alta

Reduzir o peso das imagens das cartas usando imagens responsivas, dimensões corretas e formatos mais leves quando possível.

Critérios de conclusão:

- Imagens acima da dobra não causam mudança de layout.
- Imagens abaixo da dobra carregam sob demanda.
- Fallback preservado para URLs quebradas.
- Melhor experiência em rede móvel lenta.

### 4. Filtros avançados — prioridade média

Adicionar filtros por faixa de preço, idioma, condição, graduação, acabamento e disponibilidade.

Critérios de conclusão:

- Filtros funcionam combinados.
- Quantidade de filtros ativos fica visível.
- Limpar filtros restaura o catálogo completo.
- Filtros funcionam no painel mobile e na lateral desktop.

### 5. Estados de erro e tentativa novamente — prioridade média

Padronizar carregamento, erro, vazio, sucesso e retry na loja, conta, carteira e live.

Critérios de conclusão:

- Usuário entende o que ocorreu.
- Existe botão de recuperação quando a consulta falhar.
- Nenhuma tela fica travada indefinidamente em “carregando”.
- Mensagens não expõem detalhes técnicos ou dados sensíveis.

### 6. Robustez da transmissão ao vivo — prioridade média

Melhorar reconexão do vídeo, indicação de conexão, atraso da transmissão e sincronização do cronômetro pelo servidor.

Critérios de conclusão:

- Vídeo tenta reconectar após falha.
- Usuário vê quando está reconectando.
- Cronômetro não depende apenas do relógio do aparelho.
- Lances continuam protegidos por validação no servidor.

### 7. Segurança e confiabilidade — prioridade alta antes de escalar

Revisar permissões do Supabase e regras de acesso para estoque, créditos, lances, compras e finalização de lives.

Critérios de conclusão:

- Usuário só acessa os próprios dados quando aplicável.
- Operações administrativas exigem autorização administrativa.
- Créditos e lances não podem ser alterados pelo cliente diretamente.
- Reembolso e finalização possuem validação e registro de auditoria.

## Checklist de validação

- [ ] iPhone em portrait e landscape.
- [ ] Android pequeno em portrait.
- [ ] Tablet.
- [ ] Desktop em largura intermediária e grande.
- [ ] Rede móvel lenta.
- [ ] Usuário anônimo.
- [ ] Usuário autenticado sem créditos.
- [ ] Usuário com estoque e pedidos.
- [ ] Administrador.
- [x] Build de produção.
- [ ] Teste de fluxo de compra e lance.

## Regra de publicação

Cada etapa deve ser validada com build de produção e publicada em commit separado, sem incluir arquivos temporários ou scripts de investigação no commit.
