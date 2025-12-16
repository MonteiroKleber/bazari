# Bazari Developer Docs

Bem-vindo à documentação para desenvolvedores do Bazari!

## Por que desenvolver para Bazari?

- **Acesso a milhares de usuários** - Base ativa de compradores e vendedores
- **Monetização simples** - Receba em BZR automaticamente
- **SDK completo** - Auth, Wallet, Storage, UI prontos para usar
- **Contratos inteligentes** - Templates de fidelidade, escrow, divisão de receita
- **Revenue share justo** - 70-85% para você

## Quick Links

- [Seu primeiro app em 10 minutos](./getting-started/quick-start.md)
- [Instalação do CLI](./getting-started/installation.md)
- [Referência do SDK](./sdk/overview.md)
- [Publicar apps](./cli/publish.md)
- [Gerenciar API Keys](./cli/keys.md)
- [Exemplos de apps](./examples/)

## Casos de Uso Populares

| Caso de Uso | Tempo | Dificuldade |
|-------------|-------|-------------|
| App de saldo | 10 min | Fácil |
| Programa de fidelidade | 2h | Médio |
| App de delivery | 1 dia | Avançado |
| Marketplace | 2 dias | Avançado |

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         SEU APP                                  │
│                    (HTML/JS ou React)                           │
├─────────────────────────────────────────────────────────────────┤
│                 @bazari.libervia.xyz/app-sdk                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │  Auth   │ │ Wallet  │ │ Storage │ │   UI    │ │ Contracts │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Bazari Platform                             │
│               (postMessage bridge / iframe)                      │
├─────────────────────────────────────────────────────────────────┤
│                      Bazari Chain                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │   Loyalty   │ │   Escrow    │ │ RevenueSplit│                │
│  │  Contract   │ │  Contract   │ │  Contract   │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## Suporte

- [Discord da Comunidade](https://discord.gg/bazari)
- [GitHub Issues](https://github.com/bazari/bazari/issues)
- [FAQ](./faq.md)
