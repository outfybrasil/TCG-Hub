# Segurança e implantação

## Ações obrigatórias antes do próximo deploy

1. Revogue a chave `service_role` antiga do Supabase. Ela esteve versionada e deve ser considerada comprometida.
2. Gere uma nova chave e configure somente como `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor.
3. Configure `MP_WEBHOOK_SECRET`, `MP_ACCESS_TOKEN`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL` e segredos fortes do PostgreSQL/backend.
4. Aplique todas as migrações pendentes de `supabase/migrations`, incluindo `20260806120000_complete_access_and_financial_audit.sql`.
5. Configure no Mercado Pago o webhook HTTPS em `/api/webhook/mercadopago` e use o mesmo segredo de assinatura.
6. Remova o segredo antigo do histórico Git com `git filter-repo` e faça force-push coordenado. Todos os clones antigos devem ser descartados.

## Cartas e imagens

- A sincronização de metadados é feita pelo painel administrativo usando apenas a API oficial TCGdex.
- A fonte principal é `pt`, com `pt-br` como tradução adicional e `en` como fallback de cobertura/imagem. O catálogo `pt-br` ainda é parcial na API atual.
- A comparação consulta Liga Pokémon e MYP Cards, com cache de seis horas, limites de requisição e rotas administrativas protegidas.
- O preço do TCG Hub aparece separadamente; referências externas não alteram automaticamente o preço de venda do anúncio.
- Para espelhar imagens oficiais no Supabase Storage:

```powershell
cd frontend
$env:SUPABASE_URL='https://seu-projeto.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY='chave-nova'
npm run sync:card-images -- --limit=500
```

O script valida MIME e tamanho, aplica timeout/retry e grava no bucket público `card-images` com cache imutável.

## Verificações

```powershell
cd frontend
npm ci
npm audit --audit-level=moderate
npm run lint
npm run build
```

O lint atualmente não possui erros bloqueantes, mas mantém avisos de tipagem e otimização de imagens legadas para correção incremental.
