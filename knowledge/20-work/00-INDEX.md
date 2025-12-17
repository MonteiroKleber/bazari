# Bazari Work - Documentação

> Mercado de Trabalho e Formalização de Acordos

## Visão Geral

O Bazari Work é o app nativo da Bazari para organização de pessoas, talentos e acordos de trabalho. Ele **não executa pagamentos** - apenas organiza relações.

### Princípio Arquitetural

```
On-chain: apenas registro de vínculo (hash + estado)
Off-chain: conteúdo, busca, mensagens, detalhes
```

## Documentos

| Arquivo | Descrição |
|---------|-----------|
| [01-VISAO-GERAL.md](./01-VISAO-GERAL.md) | Arquitetura e conceitos |
| [02-CASOS-DE-USO.md](./02-CASOS-DE-USO.md) | Casos de uso detalhados |
| [03-ENTIDADES.md](./03-ENTIDADES.md) | Modelo de dados |
| [04-INTEGRACAO.md](./04-INTEGRACAO.md) | Integração com Pay e outros apps |
| [prompts/](./prompts/) | Prompts para implementação |

## Fases de Implementação

### Fase 1: Extensão de Perfil Profissional
- Campos profissionais no perfil existente
- Status de disponibilidade
- Habilidades (tags)

### Fase 2: Marketplace de Talentos
- Busca filtrada por habilidades/área
- Listagem pública de profissionais

### Fase 3: Vagas de Emprego
- Publicação de vagas por empresas
- Candidaturas e propostas

### Fase 4: Acordos de Contratação
- Formalização digital de acordos
- Registro on-chain (hash)
- Ciclo de vida do vínculo

### Fase 5: Eventos e Reputação
- Eventos no Feed/Perfil
- Badges de consistência
- Histórico profissional

## O que o Bazari Work NÃO faz

- ❌ Não executa pagamentos
- ❌ Não calcula salário
- ❌ Não controla ponto
- ❌ Não interpreta leis trabalhistas
- ❌ Não valida currículos (é marketplace, não certificadora)

## Integração com Bazari Pay

O Work pode gerar acordos que o Pay consome para criar contratos de pagamento recorrente, mas a integração é **opcional**.

Fluxos válidos:
- Work sem Pay
- Pay sem Work
- Work + Pay
- Uso híbrido
