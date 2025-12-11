# Bazari Studio - Fase 3 do BazariOS

## Visao Geral

O **Bazari Studio** e um ambiente de desenvolvimento integrado (IDE) para criar aplicativos e smart contracts para o ecossistema Bazari. Funciona com uma arquitetura **local-first**:

- **Studio UI**: Interface no browser (app nativo do BazariOS)
- **CLI Server**: Servidor local que executa na maquina do desenvolvedor

Esta arquitetura permite:
- Editor de codigo com syntax highlighting
- Preview em tempo real
- Integracao com IA especializada no ecossistema Bazari
- Build e publicacao automatizados
- Compilacao de smart contracts ink! localmente
- Zero custo de servidor para compilacao

## Principio Fundamental

**A IA e a automacao seguem EXATAMENTE o fluxo do CLI existente.** Nenhuma reinvencao - apenas automacao inteligente do que ja funciona:

```
bazari create → npm install → codigo → bazari build → bazari publish → Admin aprova
```

A IA e um **Especialista Bazari** - conhece profundamente o SDK, templates, padroes ink! e o fluxo de desenvolvimento. Ela NAO inventa endpoints ou sugere tecnologias incompativeis.

## Arquitetura Local-First

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    BAZARI STUDIO (App Nativo)                         │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐       │  │
│  │  │   Sidebar   │  │   Editor    │  │        Preview          │       │  │
│  │  │             │  │  (Monaco)   │  │    (Live Reload)        │       │  │
│  │  │  - Files    │  │             │  │                         │       │  │
│  │  │  - Search   │  │  src/       │  │  ┌─────────────────┐    │       │  │
│  │  │  - AI Chat  │  │    App.tsx  │  │  │  Meu App        │    │       │  │
│  │  │  - Settings │  │    ...      │  │  │  ───────────    │    │       │  │
│  │  │             │  │             │  │  │  [Botao]        │    │       │  │
│  │  └─────────────┘  └─────────────┘  │  └─────────────────┘    │       │  │
│  │                                    └─────────────────────────┘       │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────┐         │  │
│  │  │                    Terminal / Output                     │         │  │
│  │  │  $ bazari build                                          │         │  │
│  │  │  ✓ Build completed! Size: 45KB                          │         │  │
│  │  └─────────────────────────────────────────────────────────┘         │  │
│  │                                                                       │  │
│  │  [▶ Dev] [📦 Build] [🚀 Publish] [🤖 AI Assistant]                   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                               │
└──────────────────────────────│───────────────────────────────────────────────┘
                               │ HTTP / WebSocket
                               │ localhost:4444
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MAQUINA LOCAL DO DESENVOLVEDOR                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │              CLI SERVER (bazari studio --serve)                       │  │
│  │                                                                       │  │
│  │  Endpoints:                                                           │  │
│  │  GET  /api/files              → Lista arquivos                        │  │
│  │  GET  /api/files/:path        → Le arquivo                            │  │
│  │  PUT  /api/files/:path        → Salva arquivo                         │  │
│  │  POST /api/terminal/exec      → Executa comando                       │  │
│  │  WS   /api/terminal/stream    → Stream de output                      │  │
│  │  POST /api/project/create     → bazari create                         │  │
│  │  POST /api/project/build      → bazari build                          │  │
│  │  POST /api/project/publish    → bazari publish                        │  │
│  │  POST /api/contract/build     → cargo contract build                  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                               │
│                              ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    SISTEMA LOCAL                                      │  │
│  │                                                                       │  │
│  │  - Node.js / npm                → Compilacao JavaScript/TypeScript    │  │
│  │  - Vite                         → Dev server + HMR                    │  │
│  │  - Rust / Cargo                 → Compilacao smart contracts          │  │
│  │  - cargo-contract               → Build ink! contracts                │  │
│  │  - Sistema de arquivos real     → Projetos persistem localmente       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                               │
                               │ Apenas no Publish
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUD                                          │
│                                                                             │
│  - IPFS (upload do bundle)                                                 │
│  - Bazari API (submit para review)                                         │
│  - Bazari Chain (deploy de contratos)                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Beneficios da Arquitetura Local

| Aspecto | WebContainers (antigo) | Local-First (novo) |
|---------|------------------------|-------------------|
| **Compilacao Rust** | Impossivel | Nativo |
| **Performance** | Limitada | Total do sistema |
| **Custo servidor** | Alto (se backend) | Zero |
| **Offline** | Parcial | Completo |
| **Tamanho projetos** | Limitado | Ilimitado |
| **Dependencias npm** | Algumas incompativeis | Todas funcionam |

## Fluxo de Desenvolvimento

### Passo 1: Iniciar o Studio

```bash
# Developer instala CLI globalmente
npm install -g @bazari.libervia.xyz/cli

# Inicia o servidor local
bazari studio --serve

# Output:
# 🚀 Bazari Studio Server running on http://localhost:4444
# 📂 Project directory: ~/bazari-projects
#
# Abra o Studio em: https://bazari.libervia.xyz/app/studio
# Ou conecte via: bazari studio connect
```

### Passo 2: Desenvolver no Browser

1. Usuario abre Bazari Studio no BazariOS
2. Studio conecta automaticamente ao servidor local (localhost:4444)
3. Toda edicao no Monaco Editor salva no disco local via API
4. Preview aponta para Vite rodando localmente (localhost:3333)
5. Build executa `bazari build` localmente
6. Publish faz upload do bundle para IPFS

### Fluxo Completo

```
Usuario abre Studio no browser
           │
           ▼
Studio conecta em localhost:4444
           │
           ▼
Cria projeto (via API) → arquivos criados localmente
           │
           ▼
npm install executa localmente
           │
           ▼
Vite dev server inicia (localhost:3333)
           │
           ▼
Edita codigo no Monaco → salva via API → HMR atualiza preview
           │
           ▼
Build executa localmente (npx vite build)
           │
           ▼
Publish → Upload IPFS → Submit para review
           │
           ▼
Admin aprova no portal
```

## Tecnologias

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| UI | React + shadcn/ui | Consistencia com BazariOS |
| Editor | Monaco Editor | Mesmo editor do VS Code |
| Preview | iframe + Vite HMR | Hot reload em tempo real |
| CLI Server | Express + WebSocket | Comunicacao bidirecional |
| Terminal | xterm.js | Emulador de terminal |
| IA | Claude API | Especialista Bazari contextualizado |
| Contracts | cargo-contract | Compilacao ink! nativa |

## Documentos da Especificacao

| Doc | Titulo | Descricao |
|-----|--------|-----------|
| [01-ARQUITETURA](./01-ARQUITETURA.md) | Arquitetura Tecnica | CLI Server + Studio UI |
| [02-ESTRUTURA-BASE](./02-ESTRUTURA-BASE.md) | Estrutura Base | App nativo, rotas, layout |
| [03-CLI-SERVER](./03-CLI-SERVER.md) | CLI Server | Servidor local com APIs |
| [04-EDITOR](./04-EDITOR.md) | Editor de Codigo | Monaco Editor + API local |
| [05-PREVIEW](./05-PREVIEW.md) | Preview em Tempo Real | Vite local + iframe |
| [06-CLI-AUTOMATION](./06-CLI-AUTOMATION.md) | Automacao CLI | Create, build, publish via API |
| [07-TEMPLATES](./07-TEMPLATES.md) | Sistema de Templates | Templates prontos para apps |
| [08-AI-INTEGRATION](./08-AI-INTEGRATION.md) | Integracao IA | Especialista Bazari |
| [09-SMART-CONTRACTS](./09-SMART-CONTRACTS.md) | Smart Contracts | Compilacao local ink! |

## Prompts para Implementacao

Cada especificacao tem um prompt correspondente em `prompts/` pronto para ser executado pelo Claude Code:

- `prompts/PROMPT-01-ESTRUTURA-BASE.md`
- `prompts/PROMPT-02-CLI-SERVER.md`
- `prompts/PROMPT-03-EDITOR.md`
- `prompts/PROMPT-04-PREVIEW.md`
- `prompts/PROMPT-05-CLI-AUTOMATION.md`
- `prompts/PROMPT-06-TEMPLATES.md`
- `prompts/PROMPT-07-AI-INTEGRATION.md`
- `prompts/PROMPT-08-SMART-CONTRACTS.md`

## Ordem de Implementacao

```
Fase 3.1: Estrutura Base (app nativo + layout)
    │
    ▼
Fase 3.2: CLI Server (servidor local + APIs)
    │
    ▼
Fase 3.3: Editor Monaco (conecta via API local)
    │
    ▼
Fase 3.4: Preview (aponta para Vite local)
    │
    ▼
Fase 3.5: CLI Automation (create/build/publish via API)
    │
    ▼
Fase 3.6: Templates (projetos prontos)
    │
    ▼
Fase 3.7: AI Integration (Especialista Bazari)
    │
    ▼
Fase 3.8: Smart Contracts (compila localmente com cargo)
```

## Requisitos do Desenvolvedor

Para usar o Bazari Studio, o desenvolvedor precisa ter instalado:

### Para Apps (JavaScript/TypeScript)

```bash
# Node.js 18+
node --version  # v18.x ou superior

# npm ou pnpm
npm --version

# CLI Bazari
npm install -g @bazari.libervia.xyz/cli
```

### Para Smart Contracts (ink!)

```bash
# Rust
rustup update

# cargo-contract
cargo install cargo-contract

# Verificar
cargo contract --version
```

## IA: Especialista Bazari

A IA integrada ao Studio e um **Especialista Bazari**, nao uma IA generica:

### O que ela SABE:

- SDK Bazari completo (`@bazari.libervia.xyz/app-sdk`)
- Estrutura de projetos e templates
- Padroes ink! para smart contracts
- APIs disponiveis no ecossistema
- Fluxo de desenvolvimento: create → build → publish
- Permissoes e manifest

### O que ela NAO FAZ:

- Inventar endpoints que nao existem
- Sugerir bibliotecas incompativeis
- Criar fluxos alternativos ao CLI
- Modificar o SDK
- Acessar recursos fora do escopo Bazari

### Exemplos de uso:

```
Usuario: "Crie um componente de card de produto"
IA: Gera codigo usando sdk.wallet, sdk.auth conforme documentado

Usuario: "Como integro pagamento?"
IA: Explica sdk.wallet.requestTransfer() com exemplo funcional

Usuario: "Quero usar Firebase"
IA: "Firebase nao e compativel com o ecossistema Bazari.
     Para persistencia, use sdk.storage. Para auth, use sdk.auth."
```

## Referencias

- [Bazari SDK Docs](https://bazari.libervia.xyz/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [ink! Smart Contracts](https://use.ink/)
- [Polkadot.js API](https://polkadot.js.org/docs/)
