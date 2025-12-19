# Bazari Pay - Prompts de Implementação

## Visão Geral

Prompts organizados por fase para implementação incremental do Bazari Pay.

## Fases

| Fase | Prompt | Descrição | Status | Dependências |
|------|--------|-----------|--------|--------------|
| 0 | [PROMPT-00](./PROMPT-00-HOME-APPSTORE.md) | Home/Dashboard e App Store | Pendente | - |
| 1 | [PROMPT-01](./PROMPT-01-CONTRACTS.md) | Contratos de Pagamento Recorrente | Pendente | Fase 0 |
| 2 | [PROMPT-02](./PROMPT-02-SCHEDULER.md) | Scheduler e Execução Automática | Pendente | Fase 1 |
| 3 | [PROMPT-03](./PROMPT-03-ADJUSTMENTS.md) | Ajustes (Extras e Descontos) | Pendente | Fases 1, 2 |
| 4 | [PROMPT-04](./PROMPT-04-ONCHAIN.md) | Registro On-Chain | Pendente | Fases 1, 2 |
| 5 | [PROMPT-05](./PROMPT-05-NOTIFICATIONS.md) | Notificações e Comprovantes | Pendente | Fases 1-4 |
| 6 | [PROMPT-06](./PROMPT-06-ENTERPRISE.md) | Escala Empresarial (CSV/API) | Pendente | Fases 1-5 |

## Ordem de Execução

```
Fase 0: Home/Dashboard e App Store  ← NOVO (executar primeiro)
    ↓
Fase 1: Contratos
    ↓
Fase 2: Scheduler
    ↓
Fase 3: Ajustes
    ↓
Fase 4: On-Chain
    ↓
Fase 5: Notificações
    ↓
Fase 6: Enterprise
```

## Pré-requisitos Técnicos

- Sistema de wallets existente
- Infraestrutura blockchain Substrate
- BazChat para notificações
- Cron/scheduler infrastructure (Bull, node-cron, etc)
- **BazariOS App Store configurada** (para Fase 0)

## Considerações Importantes

### Fase 0 (Nova)
- Configura o app na App Store da Bazari
- Define o entry point e manifest
- Cria estrutura base do módulo Pay
- **Deve ser executada antes das outras fases**

### Segurança
- Validação rigorosa de wallets
- Verificação de saldo antes de execução
- Logs detalhados de todas as operações

### Performance
- Processamento em batch para múltiplos contratos
- Índices otimizados para queries de scheduler
- Cache de saldos com invalidação

### Resiliência
- Retry automático com backoff exponencial
- Fallback para falhas de blockchain
- Alertas para equipe técnica
