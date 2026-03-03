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
