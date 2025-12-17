# Bazari Pay - Visão Geral

## 1. Objetivo

Executar pagamentos recorrentes automáticos, como um banco deveria fazer, porém:
- Com regras claras
- Sem operação manual mensal
- Com histórico e previsibilidade

## 2. Contrato de Pagamento Recorrente

Criado **uma única vez**. Execuções são automáticas.

### Campos Principais

| Campo | Tipo | On-chain |
|-------|------|----------|
| `id` | uuid | ✅ (hash) |
| `payerWallet` | address | ✅ |
| `receiverWallet` | address | ✅ |
| `value` | decimal | ✅ |
| `period` | enum | ✅ |
| `paymentDay` | int | ✅ |
| `startDate` | date | ✅ |
| `endDate` | date? | ✅ |
| `status` | enum | ✅ |
| `nextPayment` | date | ✅ |
| `description` | string | ❌ |
| `referenceType` | string | ❌ |
| `referenceId` | uuid | ❌ |

### Status do Contrato

```
ativo     → pagamentos serão executados
pausado   → pagamentos suspensos temporariamente
encerrado → finalizado, sem mais execuções
```

### Periodicidade

```
WEEKLY      → toda semana
BIWEEKLY    → a cada 2 semanas
MONTHLY     → todo mês
```

## 3. Execução Automática

No dia programado, o sistema:

```
1. Verifica saldo do pagador
2. Se houver saldo:
   - Débito da empresa/pagador
   - Crédito do recebedor
   - Registro on-chain
   - Atualiza próximo pagamento
3. Se não houver saldo:
   - Registra falha
   - Notifica via BazChat
   - Mantém histórico
```

**Nenhuma intervenção humana necessária.**

### Tentativas de Retry

```
Falha → espera 24h → tenta novamente
Máximo 3 tentativas por período
Após 3 falhas → notifica e aguarda próximo período
```

## 4. Ajustes (Extras e Descontos)

Variações de pagamento **não alteram o contrato base**.

### Campos do Ajuste

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `type` | enum | EXTRA ou DESCONTO |
| `value` | decimal | Valor fixo |
| `referenceMonth` | date | Período de referência |
| `reason` | string | Motivo |
| `status` | enum | rascunho, aplicado, cancelado |
| `requiresApproval` | bool | Se precisa aceite do recebedor |

### Cálculo do Valor Final

```
valor_pago = valor_base + soma(extras) - soma(descontos)
```

### Aprovação

- Simples: aplica direto
- Com aceite: notifica recebedor via BazChat

## 5. Separação On-chain vs Off-chain

### ON-CHAIN (core do produto)

**Contrato de Pagamento:**
- ID (hash)
- Wallets (pagador/recebedor)
- Valor base
- Periodicidade
- Status
- Próximo pagamento

**Execução do Pagamento:**
- Débito
- Crédito
- Block + tx hash

**Valor Final Pago:**
- Valor líquido
- Referência do período

### OFF-CHAIN (controle e operação)

**Ajustes:**
- Motivo
- Justificativa
- Anexos
- Status de aprovação

**Falhas e Notificações:**
- "Saldo insuficiente"
- "Pagamento adiado"
- Alertas

**Histórico Detalhado:**
- Holerite visual
- Relatórios
- Exportações

### Resumo

| Item | On-chain | Off-chain |
|------|----------|-----------|
| Contrato recorrente | ✅ | ❌ |
| Execução do pagamento | ✅ | ❌ |
| Ajustes (detalhe) | ❌ | ✅ |
| Valor final pago | ✅ | ❌ |
| Notificações | ❌ | ✅ |
| Relatórios | ❌ | ✅ |

## 6. Comunicação

**Tudo que envolve dinheiro é privado:**
- Notificações → BazChat
- Falhas → BazChat
- Ajustes → BazChat
- Comprovantes → BazChat

**No Feed, apenas:**
- Eventos agregados (opcional)
- Reputação
- **Nunca valores**

## 7. Escala para Empresas

| Porte | Método |
|-------|--------|
| Pequena | Criação manual |
| Média | Upload CSV |
| Grande | API integrada a ERP/RH |

> 5.000 funcionários = 5.000 execuções automáticas = zero agendamento mensal

## 8. Fluxo Real

```
┌─────────────────────────────────────────┐
│           BAZARI PAY                    │
├─────────────────────────────────────────┤
│                                         │
│  Empresa cria contrato recorrente       │
│         ↓                               │
│  Scheduler verifica todo dia            │
│         ↓                               │
│  Dia do pagamento?                      │
│    Sim → Verifica saldo                 │
│           ↓                             │
│         Saldo OK?                       │
│           Sim → Executa on-chain        │
│                  → Notifica BazChat     │
│           Não → Registra falha          │
│                  → Notifica BazChat     │
│                  → Retry em 24h         │
│         ↓                               │
│  Atualiza próximo pagamento             │
│                                         │
└─────────────────────────────────────────┘
```

## 9. Integração com Bazari Work (Opcional)

```
Work (off-chain) cria acordo
     ↓
Empresa opta por Bazari Pay
     ↓
Pay cria contrato recorrente on-chain
     ↓
Execuções automáticas
```

**Nada duplicado. Nada pesado.**

## 10. Benefícios

### Para Usuários
- Previsibilidade de renda
- Histórico econômico
- Comprovantes automáticos

### Para Empresas
- Elimina risco operacional
- Não exige troca de sistemas
- Adesão gradual

### Para a Bazari
- Fluxo financeiro recorrente
- Uso real da infraestrutura
- Base para crédito e reputação
