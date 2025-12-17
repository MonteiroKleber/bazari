# Prompts para Implementacao - P2P UX Redesign

## Ordem de Execucao

Os prompts devem ser executados na ordem abaixo. Cada prompt depende dos anteriores.

| # | Prompt | Descricao | Estimativa |
|---|--------|-----------|------------|
| 1 | [PROMPT-01-COMPONENTES-BASE.md](./PROMPT-01-COMPONENTES-BASE.md) | Criar componentes fundamentais (utils, CopyField, RatingStars, UserBadge, CountdownTimer, StatusStepper, WizardStepper, AssetCard) | 8 componentes |
| 2 | [PROMPT-02-COMPONENTES-AVANCADOS.md](./PROMPT-02-COMPONENTES-AVANCADOS.md) | Criar componentes complexos (OfferCard, FileDropzone, ChatPanel, ActionCard, FilterSheet) | 5 componentes |
| 3 | [PROMPT-03-HOME-PAGE.md](./PROMPT-03-HOME-PAGE.md) | Refatorar P2PHomePage com nova UX | 1 pagina |
| 4 | [PROMPT-04-OFFER-NEW-WIZARD.md](./PROMPT-04-OFFER-NEW-WIZARD.md) | Converter P2POfferNewPage para wizard | 1 pagina |
| 5 | [PROMPT-05-ORDER-ROOM.md](./PROMPT-05-ORDER-ROOM.md) | Refatorar P2POrderRoomPage com layout em colunas | 1 pagina + 3 sub-componentes |
| 6 | [PROMPT-06-FINALIZACAO.md](./PROMPT-06-FINALIZACAO.md) | Paginas secundarias, traducoes, testes | 2 paginas + cleanup |

## Como Usar

### Para Claude Code

1. Abra o projeto Bazari
2. Cole o conteudo do prompt
3. Claude Code ira implementar automaticamente
4. Valide com `pnpm --filter @bazari/web exec tsc --noEmit`
5. Prossiga para o proximo prompt

### Exemplo de Uso

```
User: @file knowledge/20-p2p/prompts/PROMPT-01-COMPONENTES-BASE.md

Implemente os componentes descritos neste prompt.
```

## Dependencias entre Prompts

```
PROMPT-01 ──┬──> PROMPT-02 ──> PROMPT-03 ──> PROMPT-04
            │
            └──────────────────────────────> PROMPT-05 ──> PROMPT-06
```

- Prompts 01 e 02: Componentes (devem vir primeiro)
- Prompt 03: HomePage (usa componentes)
- Prompt 04: Wizard (usa componentes)
- Prompt 05: OrderRoom (usa componentes)
- Prompt 06: Finalizacao (depende de todos)

## Checklist de Validacao

Apos cada prompt, verificar:

```bash
# Sem erros de TypeScript
pnpm --filter @bazari/web exec tsc --noEmit

# Build funciona
pnpm --filter @bazari/web build
```

## Resumo das Mudancas

### Antes

- 4 tabs confusos (BUY_BZR, SELL_BZR, BUY_ZARI, SELL_ZARI)
- Form de criacao linear
- OrderRoom com 920+ linhas
- Chat pequeno (h-48)
- Detalhes tecnicos expostos
- Mobile problematico

### Depois

- Asset selector visual + toggle Comprar/Vender
- Wizard guiado em 4 steps
- OrderRoom modular (< 300 linhas)
- Chat proeminente (h-[400px])
- Detalhes tecnicos em collapsible
- Mobile-first responsivo

## Componentes Criados

| Componente | Uso |
|------------|-----|
| `utils/format.ts` | Formatacao de valores |
| `CopyField` | Campo com botao copiar |
| `RatingStars` | Estrelas de avaliacao |
| `UserBadge` | Avatar + handle + reputacao |
| `CountdownTimer` | Timer de expiracao |
| `StatusStepper` | Progresso da ordem |
| `WizardStepper` | Steps do wizard |
| `AssetCard` | Selecao BZR/ZARI |
| `OfferCard` | Card de oferta |
| `FileDropzone` | Upload drag-and-drop |
| `ChatPanel` | Chat completo |
| `ActionCard` | Acao contextual |
| `FilterSheet` | Filtros em bottom sheet |

## Notas

- Manter compatibilidade com API existente
- Nao quebrar funcionalidade durante refatoracao
- Testar em mobile (Chrome DevTools 375px)
- Adicionar traducoes em pt-BR
