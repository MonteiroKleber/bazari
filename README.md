# 🏪 Bazari - Nação Digital Descentralizada

> Economia popular descentralizada com moeda própria (BZR) e cashback (LIVO)

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- PNPM 8+

### Instalação

```bash
# Instalar dependências
pnpm install

# Rodar o projeto web (landing page)
pnpm --filter @bazari/web dev

# Ou rodar todos os apps em paralelo
pnpm dev
```

Acesse http://localhost:5173 para ver a landing page.

## 📁 Estrutura do Monorepo

```
bazari/
├── apps/
│   ├── web/          # Landing page + Super App (React + Vite)
│   ├── api/          # Backend (Fastify + Prisma) - futuro
│   ├── bazari-chain/ # Blockchain Substrate - futuro
│   └── studio/       # Gerador low-code - futuro
├── packages/
│   ├── ui-kit/       # Componentes visuais compartilhados
│   ├── chain-client/ # SDK TypeScript para blockchain
│   ├── wallet-core/  # Core da wallet multi-conta
│   ├── schemas/      # Schemas Zod/Prisma
│   └── dsl/          # DSL do Studio
└── docs/             # Documentação
```

## 🎨 Temas Disponíveis

A landing suporta 6 temas visuais:

- **Bazari** (padrão) - Cores oficiais: vermelho terroso + dourado
- **Night** - Tema escuro
- **Sandstone** - Tema claro papel
- **Emerald** - Tema verde
- **Royal** - Tema roxo/azul
- **Cyber** - Tema neon

## 🌐 Internacionalização

Suporte completo para:
- 🇧🇷 Português (pt)
- 🇺🇸 English (en)
- 🇪🇸 Español (es)

## 🛠️ Stack Tecnológica

- **Frontend**: React + Vite + TypeScript
- **Estilização**: Tailwind CSS 3.4.3 + shadcn/ui
- **Blockchain**: Substrate (Polkadot SDK)
- **Backend**: Fastify + Prisma + PostgreSQL
- **Storage**: S3 (produção) / Filesystem (dev)
- **Moeda**: BZR (12 decimais) + LIVO (cashback)

## 📝 Licença

MIT © Bazari Team