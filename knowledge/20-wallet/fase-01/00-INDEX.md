# Fase 01: Reorganizacao de Navegacao

## Objetivo

Reorganizar a estrutura de navegacao da Wallet para separar **uso diario** de **configuracoes**, sem alterar nenhuma funcionalidade.

## Principio: EXTRAIR, NAO REESCREVER

Toda a logica ja existe e funciona. O trabalho eh:
1. Extrair JSX de um arquivo para outro
2. Importar os mesmos hooks/services
3. Manter exatamente a mesma logica

## Estado Atual vs Proposto

### Atual (4 tabs)
```
/app/wallet           → WalletDashboard (saldos + tokens + historico)
/app/wallet/accounts  → AccountsPage (criar/importar/exportar/gerenciar)
/app/wallet/send      → SendPage
/app/wallet/receive   → ReceivePage
```

### Proposto (4 tabs + settings)
```
/app/wallet           → SaldosPage (NOVO - extraido do Dashboard)
/app/wallet/send      → SendPage (SEM MUDANCAS)
/app/wallet/receive   → ReceivePage (SEM MUDANCAS)
/app/wallet/history   → HistoryPage (NOVO - extraido do Dashboard)

+ Botao Settings (⚙️) → WalletSettingsModal (NOVO)
  - Token management (extraido do Dashboard)
  - Account management (extraido do AccountsPage)
```

## Features da Fase

| # | Feature | Descricao | Spec |
|---|---------|-----------|------|
| 1 | SaldosPage | Nova pagina focada em saldos | [01-SALDOS-TAB.md](./01-SALDOS-TAB.md) |
| 2 | HistoryPage | Historico separado com filtros | [02-HISTORY-TAB.md](./02-HISTORY-TAB.md) |
| 3 | SettingsModal | Modal de configuracoes | [03-SETTINGS-MODAL.md](./03-SETTINGS-MODAL.md) |
| 4 | Accounts Migration | Mover contas para Settings | [04-ACCOUNTS-TO-SETTINGS.md](./04-ACCOUNTS-TO-SETTINGS.md) |

## Ordem de Execucao

### Passo 1: Criar SaldosPage (Feature 1)
- Criar `SaldosPage.tsx`
- Extrair: TokenList, balances, account card do WalletDashboard
- NAO remover do Dashboard ainda

### Passo 2: Criar HistoryPage (Feature 2)
- Criar `HistoryPage.tsx`
- Extrair: history table, pagination do WalletDashboard
- NAO remover do Dashboard ainda

### Passo 3: Criar SettingsModal (Feature 3)
- Criar `WalletSettingsModal.tsx`
- Criar estrutura de tabs internas
- NAO mover conteudo ainda

### Passo 4: Migrar Token Management (Feature 3 cont.)
- Mover add/remove tokens para SettingsModal
- Testar: adicionar token, remover token
- Remover do Dashboard

### Passo 5: Migrar Account Management (Feature 4)
- Mover criar/importar/exportar/gerenciar para SettingsModal
- Testar TODAS as operacoes de conta
- NAO remover AccountsPage ainda

### Passo 6: Atualizar Navegacao
- Modificar WalletHome.tsx
- Novas tabs: Saldos, Enviar, Receber, Historico
- Adicionar botao Settings
- Remover tab Contas

### Passo 7: Limpeza
- Remover WalletDashboard.tsx (quando vazio)
- Remover AccountsPage.tsx (quando migrado)
- Remover rotas antigas

## Arquivos a Criar

```
apps/web/src/modules/wallet/pages/
├── SaldosPage.tsx      # NOVO
├── HistoryPage.tsx     # NOVO
└── (existentes mantem)

apps/web/src/modules/wallet/components/
├── WalletSettingsModal.tsx  # NOVO
├── AccountsSettings.tsx     # NOVO (extraido de AccountsPage)
├── TokenSettings.tsx        # NOVO (extraido de WalletDashboard)
└── (existentes mantem)
```

## Arquivos a Modificar

```
apps/web/src/modules/wallet/pages/
├── WalletHome.tsx      # Modificar navegacao
└── (outros intocados)
```

## Arquivos a Remover (APENAS NO FINAL)

```
apps/web/src/modules/wallet/pages/
├── WalletDashboard.tsx  # Quando tudo extraido
└── AccountsPage.tsx     # Quando tudo migrado
```

## Validacao por Feature

### Feature 1 - SaldosPage
- [ ] Saldos carregam
- [ ] Saldos atualizam em tempo real
- [ ] Botao refresh funciona
- [ ] Botoes Send/Receive navegam corretamente
- [ ] Endereco mostra e copia

### Feature 2 - HistoryPage
- [ ] Historico carrega
- [ ] Paginacao funciona
- [ ] Formatacao de valores correta
- [ ] Direcao (in/out) correta

### Feature 3 - SettingsModal
- [ ] Modal abre e fecha
- [ ] Adicionar token funciona
- [ ] Remover token funciona
- [ ] Lista tokens corretamente

### Feature 4 - Account Migration
- [ ] Criar conta funciona
- [ ] Importar conta funciona
- [ ] Exportar conta funciona
- [ ] Remover conta funciona
- [ ] Trocar conta ativa funciona
- [ ] Renomear conta funciona

## Rollback Plan

Se algo quebrar:
1. Git revert do commit especifico
2. Manter arquivos antigos ate validacao completa
3. Nunca deletar antes de testar

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Tabs principais | 4 | 4 (+ settings) |
| Cliques para ver saldo | 0 | 0 |
| Cliques para historico | Scroll | 1 |
| Cliques para add token | Scroll | 2 |
| Cliques para gerenciar conta | 1 | 2 |

Trade-off aceito: Configuracoes ficam 1 click mais distantes, mas uso diario fica mais limpo.
