# Fase 3 - Bazari Studio (Indice)

## Visao Geral

O Bazari Studio e uma IDE no browser que se conecta ao **CLI Server local** para criar apps e smart contracts para o ecossistema Bazari.

**Arquitetura**: Local-first (CLI Server no sistema do desenvolvedor)

**Leia primeiro**: [README.md](./README.md)

## Documentos de Especificacao

| # | Documento | Descricao |
|---|-----------|-----------|
| 01 | [01-ARQUITETURA.md](./01-ARQUITETURA.md) | Arquitetura Local-First (CLI Server + Studio UI) |
| 02 | [02-ESTRUTURA-BASE.md](./02-ESTRUTURA-BASE.md) | App nativo, layout, rotas |
| 03 | [03-CLI-SERVER.md](./03-CLI-SERVER.md) | CLI Server local (localhost:4444) |
| 04 | [04-EDITOR.md](./04-EDITOR.md) | Monaco Editor + API Local |
| 05 | [05-PREVIEW.md](./05-PREVIEW.md) | Preview via Vite local (localhost:3333) |
| 06 | [06-CLI-AUTOMATION.md](./06-CLI-AUTOMATION.md) | Create/Build/Publish via API local |
| 07 | [07-TEMPLATES.md](./07-TEMPLATES.md) | Sistema de templates |
| 08 | [08-AI-INTEGRATION.md](./08-AI-INTEGRATION.md) | Assistente IA - Especialista Bazari |
| 09 | [09-SMART-CONTRACTS.md](./09-SMART-CONTRACTS.md) | Editor ink! - Compilacao local |

## Diagrama da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    BAZARI STUDIO (Browser)                  │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐ │
│  │ Editor  │ │ Terminal │ │ Preview │ │ AI Assistant     │ │
│  │ (Monaco)│ │ (xterm)  │ │ (iframe)│ │ (Especialista)   │ │
│  └────┬────┘ └────┬─────┘ └────┬────┘ └────────┬─────────┘ │
└───────┼───────────┼────────────┼───────────────┼───────────┘
        │           │            │               │
        │ HTTP/WS   │ WebSocket  │ iframe src    │ HTTP
        ▼           ▼            ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│              CLI SERVER (localhost:4444)                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐ │
│  │ Files  │ │ Build  │ │Terminal│ │ Publish │ │Contracts │ │
│  │ API    │ │ API    │ │  WS    │ │  API    │ │   API    │ │
│  └───┬────┘ └───┬────┘ └───┬────┘ └────┬────┘ └────┬─────┘ │
└──────┼──────────┼──────────┼───────────┼───────────┼───────┘
       │          │          │           │           │
       ▼          ▼          ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA LOCAL DO DESENVOLVEDOR                  │
│  ~/bazari-projects/    npm install    bash      IPFS/API    │
│  └── my-app/           npm run dev    node      cargo       │
│      ├── src/          npm run build  pty       contract    │
│      └── dist/                                  build       │
└─────────────────────────────────────────────────────────────┘
```

## Prompts para Implementacao

Prompts prontos para executar no Claude Code:

| # | Prompt | Descricao | Depende de |
|---|--------|-----------|------------|
| 01 | [PROMPT-01-ESTRUTURA-BASE.md](./prompts/PROMPT-01-ESTRUTURA-BASE.md) | Estrutura base do app | - |
| 02 | [PROMPT-02-CLI-SERVER.md](./prompts/PROMPT-02-CLI-SERVER.md) | CLI Server local | 01 |
| 03 | [PROMPT-03-EDITOR.md](./prompts/PROMPT-03-EDITOR.md) | Monaco Editor + API local | 01, 02 |
| 04 | [PROMPT-04-PREVIEW.md](./prompts/PROMPT-04-PREVIEW.md) | Preview via Vite local | 01, 02, 03 |
| 05 | [PROMPT-05-CLI-AUTOMATION.md](./prompts/PROMPT-05-CLI-AUTOMATION.md) | Create/Build/Publish | 01, 02, 03, 04 |
| 06 | [PROMPT-06-TEMPLATES.md](./prompts/PROMPT-06-TEMPLATES.md) | Sistema de templates | 01-05 |
| 07 | [PROMPT-07-AI-INTEGRATION.md](./prompts/PROMPT-07-AI-INTEGRATION.md) | Especialista Bazari (IA) | 01-06 |
| 08 | [PROMPT-08-SMART-CONTRACTS.md](./prompts/PROMPT-08-SMART-CONTRACTS.md) | Editor ink! (local) | 01-07 |

## Ordem de Implementacao

```
PROMPT-01 (Estrutura Base)
    │
    ▼
PROMPT-02 (CLI Server) ← FUNDACAO
    │
    ▼
PROMPT-03 (Editor Monaco + API)
    │
    ▼
PROMPT-04 (Preview Vite)
    │
    ▼
PROMPT-05 (CLI Automation) ← MAIS IMPORTANTE
    │
    ▼
PROMPT-06 (Templates)
    │
    ▼
PROMPT-07 (IA Especialista) ← Diferencial
    │
    ▼
PROMPT-08 (Smart Contracts) ← Opcional inicial
```

## Como Usar os Prompts

1. **Iniciar CLI Server**: `bazari studio --serve`
2. Abrir nova conversa no Claude Code
3. Copiar o conteudo do prompt desejado
4. Colar e executar
5. Verificar criterios de aceite
6. Passar para o proximo prompt

## Principio Fundamental

**A automacao segue EXATAMENTE o fluxo do CLI existente:**

```
bazari create → npm install → codigo → bazari build → bazari publish → Admin aprova
```

A IA e o Studio apenas automatizam este fluxo - nao inventam nada novo.

**A execucao e LOCAL** - o CLI Server roda no sistema do desenvolvedor e expoe APIs HTTP/WebSocket.

## Tecnologias Utilizadas

| Componente | Tecnologia |
|------------|------------|
| CLI Server | Express + WebSocket + node-pty |
| File Watcher | chokidar |
| Editor | Monaco Editor (@monaco-editor/react) |
| Terminal | xterm.js |
| Preview | Vite dev server (localhost:3333) |
| Layout | react-resizable-panels |
| Estado | Zustand |
| UI | shadcn/ui |
| IA | Claude API (Especialista Bazari) |
| Contracts | ink! / cargo-contract (local) |

## Arquivos de Referencia

- CLI existente: `packages/bazari-cli/src/commands/`
- Templates: `packages/bazari-cli/templates/react-ts/`
- Apps nativos: `apps/web/src/apps/`
- Registry: `apps/web/src/platform/registry/native-apps.ts`

## Mudancas da Arquitetura Anterior

| Antes (WebContainers) | Agora (Local-First) |
|----------------------|---------------------|
| Node.js no browser (WASM) | Node.js nativo local |
| Lento para npm install | npm install rapido (nativo) |
| Limitado a browser | Acesso total ao sistema |
| Sem acesso a Rust/cargo | cargo contract build local |
| Memoria limitada | Sem limites |
