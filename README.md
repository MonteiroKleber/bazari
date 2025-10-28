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

## 💰 BZR - Token Nativo

BZR é o token nativo da blockchain Bazari, usado para todas as transações no ecossistema.

### Especificações Técnicas
- **Símbolo**: BZR
- **Decimais**: 12 (1 BZR = 10^12 planck)
- **Unidade mínima**: 1 planck
- **Formatação**: Intl.NumberFormat com 2-4 casas decimais

### Uso no Código

```tsx
// Importar utilities
import { formatBzrPlanck } from '@/utils/bzr';

// Formatação manual
const balancePlanck = '1000000000000'; // 1 BZR
const formatted = formatBzrPlanck(balancePlanck, 'pt-BR', true);
// Resultado: "BZR 1.00"

// Usando o componente Balance
import { Balance } from '@/components/wallet/Balance';

<Balance amount={balance.free} withSymbol={true} />
```

### Obter Propriedades da Chain

```typescript
import { getChainProps } from '@/modules/wallet/services/balances';

const { tokenSymbol, tokenDecimals } = await getChainProps();
// tokenSymbol: "BZR"
// tokenDecimals: 12
```

## 📝 Licença

MIT © Bazari Team