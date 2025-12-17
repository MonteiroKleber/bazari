# Bazari Pay - Documentação

> Banco Programável de Pagamentos Recorrentes

## Visão Geral

O Bazari Pay é o app nativo da Bazari para execução de pagamentos recorrentes automáticos. Ele **move dinheiro**, não organiza relações de trabalho.

### Princípio Arquitetural

```
On-chain: contratos, execuções, valores
Off-chain: ajustes (detalhes), notificações, relatórios
```

## Documentos

| Arquivo | Descrição |
|---------|-----------|
| [01-VISAO-GERAL.md](./01-VISAO-GERAL.md) | Arquitetura e conceitos |
| [02-CASOS-DE-USO.md](./02-CASOS-DE-USO.md) | Casos de uso detalhados |
| [03-ENTIDADES.md](./03-ENTIDADES.md) | Modelo de dados |
| [04-INTEGRACAO.md](./04-INTEGRACAO.md) | Integração com Work e outros apps |
| [prompts/](./prompts/) | Prompts para implementação |

## Fases de Implementação

### Fase 1: Contratos de Pagamento Recorrente
- Criação de contratos
- Configuração de valores e periodicidade
- Gestão de status

### Fase 2: Execução Automática
- Scheduler de pagamentos
- Verificação de saldo
- Débito/crédito automático

### Fase 3: Ajustes (Extras e Descontos)
- Cadastro de ajustes
- Aprovação (se necessário)
- Cálculo do valor final

### Fase 4: Registro On-Chain
- Contratos on-chain
- Execuções on-chain
- Auditabilidade

### Fase 5: Notificações e Relatórios
- BazChat para tudo privado
- Comprovantes
- Exportação CSV/API

### Fase 6: Escala Empresarial
- Upload CSV em lote
- API para integração ERP
- Dashboard empresarial

## O que o Bazari Pay NÃO faz

- ❌ Não recruta
- ❌ Não publica vagas
- ❌ Não cria vínculo
- ❌ Não calcula folha trabalhista
- ❌ Não interpreta leis

**É infraestrutura de pagamento, não RH.**

## Quem pode usar

- Empresas que contrataram via Bazari Work
- Empresas com funcionários existentes
- Prestadores de serviço
- Freelancers
- **Qualquer relação pagador → recebedor**

> Bazari Pay **não exige** uso do Bazari Work.

## Frase Técnica Oficial

> O Bazari Pay utiliza a blockchain como camada de execução financeira e liquidação de pagamentos recorrentes.
