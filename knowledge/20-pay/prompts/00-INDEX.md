# Bazari Pay - Prompts de Implementação

## Visão Geral

Prompts organizados por fase para implementação incremental do Bazari Pay.

## Fases

| Fase | Prompt | Descrição | Dependências |
|------|--------|-----------|--------------|
| 1 | [PROMPT-01](./PROMPT-01-CONTRACTS.md) | Contratos de Pagamento Recorrente | - |
| 2 | [PROMPT-02](./PROMPT-02-SCHEDULER.md) | Scheduler e Execução Automática | Fase 1 |
| 3 | [PROMPT-03](./PROMPT-03-ADJUSTMENTS.md) | Ajustes (Extras e Descontos) | Fases 1, 2 |
| 4 | [PROMPT-04](./PROMPT-04-ONCHAIN.md) | Registro On-Chain | Fases 1, 2 |
| 5 | [PROMPT-05](./PROMPT-05-NOTIFICATIONS.md) | Notificações e Comprovantes | Fases 1-4 |
| 6 | [PROMPT-06](./PROMPT-06-ENTERPRISE.md) | Escala Empresarial (CSV/API) | Fases 1-5 |

## Ordem de Execução

```
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

## Considerações Importantes

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
