# TCGHub v1.0 🎯

Plataforma premium de gestão e comércio de cartas Pokémon TCG com Grading por IA.

## 🏗️ Arquitetura

O projeto é dividido em 3 módulos principais:

1.  **Backend Core (`/backend`)**: API FastAPI responsável pelo gerenciamento de usuários, estoque, leilões e integração com APIs de mercado (TCGPlayer/CardMarket).
2.  **AI Service (`/ai_service`)**: Microserviço dedicado ao processamento de imagens, identificação de cartas e análise de condição (Grading).
3.  **Frontend (`/frontend`)**: Aplicação Next.js 14 com design premium, dark mode, glassmorphism e scanner IA integrado.

## 🚀 Como Rodar (Local)

Como o ambiente local não possui Docker configurado, utilize o script de inicialização manual:

1.  Certifique-se de ter **Python 3.12+** e **Node.js 18+** instalados.
2.  Abra o terminal na pasta raiz.
3.  Execute: `.\run_dev.ps1`

## 🚀 Deploy em VPS (Docker)

1.  Na raiz `TCG-Hub`, crie o arquivo de ambiente:
    - `cp .env.example .env`
2.  Edite o `.env` com seus valores reais:
    - `NEXT_PUBLIC_API_URL`
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `MP_ACCESS_TOKEN`
3.  Suba os serviços:
    - `docker compose up -d --build`
4.  Verifique os logs:
    - `docker compose logs -f frontend backend`
5.  Teste saúde:
    - API: `http://SEU_IP:8000/health`
    - Frontend: `http://SEU_IP:3000`

### Erros comuns na VPS

- `Property '$id' does not exist on type 'Auction'`: corrigido no frontend.
- `Cannot find module 'appwrite'`: dependência adicionada no `package.json`.
- `supabaseUrl is required`: agora há fallback para build, mas em produção você deve configurar as variáveis do Supabase no `.env`.
- Build Docker muito lento: adicionado `.dockerignore` para reduzir contexto.

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, TailwindCSS, Lucide React.
- **Backend**: FastAPI, SQLAlchemy, Pydantic v2.
- **IA**: PyTorch, Vision Transformer (identificação), YOLOv8 (segmentação).
- **Banco de Dados**: PostgreSQL (estruturado) + Redis (cache/socket).

## 📅 Roadmap MVP

- [x] Arquitetura e Modelagem
- [x] UI Premium & Scanner Simulator
- [ ] Autenticação JWT completa
- [ ] Integração real com TCGPlayer API
- [ ] Leilões via WebSockets
