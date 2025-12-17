# Wallet - Melhorias UX

## IMPORTANTE: Codigo de Producao - Zero Regressao

**ATENCAO MAXIMA**: A carteira esta 100% funcional em producao.

### Regras Obrigatorias:
- **NAO** quebrar funcionalidades existentes
- **NAO** remover codigo que esta funcionando
- **NAO** alterar logica de negocio (PIN, criptografia, transacoes)
- **NAO** modificar services, hooks ou stores existentes sem necessidade
- **SEMPRE** entender a arquitetura antes de implementar
- **SEMPRE** testar todas as funcionalidades apos cada mudanca
- **APENAS** reorganizar UI/UX mantendo mesma logica

### Funcionalidades que DEVEM continuar funcionando:
1. Criar conta (mnemonic, PIN, criptografia AES-GCM)
2. Importar conta (mnemonic existente)
3. Exportar conta (revelar seed com PIN)
4. Remover conta
5. Trocar conta ativa (PIN + SIWS session)
6. Ver saldos (native + assets com subscriptions)
7. Enviar transacoes (fee estimation, PIN confirmation)
8. Receber (QR code, copiar endereco)
9. Historico de transacoes (paginacao, streaming)
10. Adicionar/remover tokens customizados
11. Refresh de saldos

---

## Visao Geral

Este modulo especifica melhorias de UX para a pagina **Wallet** (`/app/wallet`), reorganizando a interface para melhor usabilidade sem alterar funcionalidades.

## Objetivo

Separar **configuracoes** de **uso diario**, tornando a carteira mais intuitiva e alinhada com padroes de mercado (MetaMask, Trust Wallet).

## Arquitetura Atual (NAO MODIFICAR)

### Estrutura de Arquivos
```
apps/web/src/modules/wallet/
├── components/           # Componentes reutilizaveis
│   ├── AddressQr.tsx     # QR code generation
│   ├── PinDialog.tsx     # PIN entry modal
│   ├── Scanner.tsx       # QR code scanner
│   ├── TokenList.tsx     # Lista de tokens com saldos
│   └── TokenSelector.tsx # Seletor de token para envio
├── hooks/                # Hooks customizados
│   ├── useApi.ts         # API connection
│   ├── useChainProps.ts  # Chain metadata
│   ├── useVaultAccounts.ts # Account vault state
│   └── useTransactionFee.ts # Fee estimation
├── pages/                # Paginas principais
│   ├── WalletHome.tsx    # Router e navegacao
│   ├── WalletDashboard.tsx # Dashboard atual
│   ├── AccountsPage.tsx  # Gerenciamento de contas
│   ├── SendPage.tsx      # Enviar transacoes
│   └── ReceivePage.tsx   # Receber fundos
├── pin/                  # Sistema de PIN
│   ├── PinDialog.tsx
│   ├── PinProvider.tsx
│   └── PinService.ts
├── services/             # Servicos blockchain
│   ├── assets.ts         # Asset metadata
│   ├── balances.ts       # Balance subscriptions
│   ├── history.ts        # Transaction history
│   └── polkadot.ts       # API singleton
├── store/                # Estado global
│   └── tokens.store.ts   # Token registry
└── utils/                # Utilitarios
    └── format.ts         # Balance/address formatting
```

### Fluxos Criticos (NAO ALTERAR LOGICA)
```
Criar Conta:
  generateMnemonic() → confirmar mnemonic → setPIN() → encryptWithPIN() → save

Trocar Conta:
  selectAccount() → validatePIN() → decryptMnemonic() → SIWS session → reload

Enviar TX:
  fillForm() → estimateFee() → confirmPIN() → decryptMnemonic() → signAndSend()

Balance Subscription:
  subscribeNativeBalance() + subscribeAssetBalance() → real-time updates
```

## Mudanca Proposta

### Navegacao Atual
```
[Visao Geral] [Contas] [Enviar] [Receber]
```

### Navegacao Nova
```
[Saldos] [Enviar] [Receber] [Historico]  [⚙️]
```

## Fases de Implementacao

| Fase | Foco | Features | Risco |
|------|------|----------|-------|
| 01 | Reorganizacao de Navegacao | 4 features | Baixo |

## Fase 01: Reorganizacao de Navegacao

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | Nova Tab Saldos | Media | Alto | [01-SALDOS-TAB.md](./fase-01/01-SALDOS-TAB.md) |
| 2 | Tab Historico Dedicada | Baixa | Alto | [02-HISTORY-TAB.md](./fase-01/02-HISTORY-TAB.md) |
| 3 | Modal de Configuracoes | Media | Alto | [03-SETTINGS-MODAL.md](./fase-01/03-SETTINGS-MODAL.md) |
| 4 | Migrar Contas para Settings | Baixa | Medio | [04-ACCOUNTS-TO-SETTINGS.md](./fase-01/04-ACCOUNTS-TO-SETTINGS.md) |

## Mapeamento de Componentes

### O que MOVE para onde:

| Componente Atual | Localizacao Atual | Destino |
|------------------|-------------------|---------|
| Token list + balances | WalletDashboard | **SaldosPage** (nova) |
| Transaction history | WalletDashboard | **HistoryPage** (nova) |
| Add/remove tokens | WalletDashboard | **SettingsModal** (novo) |
| Account card (endereco) | WalletDashboard | **SaldosPage** (simplificado) |
| Create account | AccountsPage | **SettingsModal** |
| Import account | AccountsPage | **SettingsModal** |
| Export account | AccountsPage | **SettingsModal** |
| Account list | AccountsPage | **SettingsModal** |
| SendPage | (mantem) | **SendPage** (sem mudancas) |
| ReceivePage | (mantem) | **ReceivePage** (sem mudancas) |

### O que NAO MUDA:
- `SendPage.tsx` - Permanece identico
- `ReceivePage.tsx` - Permanece identico
- Todos os `services/` - Intocados
- Todos os `hooks/` - Intocados
- `store/tokens.store.ts` - Intocado
- `pin/` - Intocado
- `utils/` - Intocado

## Checklist de Validacao

Apos cada mudanca, verificar:

- [ ] Criar conta funciona (mnemonic + PIN)
- [ ] Importar conta funciona
- [ ] Exportar conta funciona (revelar seed)
- [ ] Trocar conta ativa funciona
- [ ] Remover conta funciona
- [ ] Saldos carregam corretamente
- [ ] Saldos atualizam em tempo real
- [ ] Enviar transacao funciona
- [ ] Receber mostra QR correto
- [ ] Historico carrega
- [ ] Adicionar token funciona
- [ ] Remover token funciona
- [ ] PIN valida corretamente
- [ ] Fee estimation funciona

## Ordem de Implementacao

1. **Criar SaldosPage** - Extrair saldos do Dashboard
2. **Criar HistoryPage** - Extrair historico do Dashboard
3. **Criar SettingsModal** - Container para configuracoes
4. **Migrar Token Management** - Mover para Settings
5. **Migrar Account Management** - Mover para Settings
6. **Atualizar WalletHome** - Nova navegacao
7. **Remover WalletDashboard** - Quando tudo migrado
8. **Remover AccountsPage** - Quando tudo migrado

## Principio de Implementacao

```
EXTRAIR → VALIDAR → MOVER → VALIDAR → LIMPAR
```

Nunca deletar codigo antigo ate o novo estar 100% funcionando.
