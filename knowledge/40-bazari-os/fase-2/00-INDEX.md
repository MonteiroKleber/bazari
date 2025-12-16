# BazariOS Fase 2: Ecossistema de Desenvolvedores

**Status:** Planejado
**Prioridade:** Alta
**Dependências:** Fase 1 (BazariOS Core) completa
**Objetivo:** Transformar Bazari em plataforma aberta para desenvolvedores externos E lojistas

---

## Visão Estratégica

A Fase 2 adota um **modelo híbrido** que atende dois públicos:

### Camada 1: Plugins Low-Code (Para Lojistas)
- **90% dos lojistas** não sabem programar
- Plugins são configurados via UI, sem código
- Ativação instantânea, sem deploy

### Camada 2: Apps Pro-Code (Para Desenvolvedores)
- Apps customizados com React + SDK
- Smart contracts ink! personalizados
- Upload para IPFS, review e publicação

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MODELO HÍBRIDO BAZARI                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   LOJISTAS (90%)                          DESENVOLVEDORES (10%)                 │
│   ──────────────                          ─────────────────────                 │
│                                                                                  │
│   Portal Web                              CLI + SDK                             │
│       │                                       │                                  │
│       ▼                                       ▼                                  │
│   Configura Plugin                        Código React                          │
│   (JSON Schema)                           + Contratos ink!                      │
│       │                                       │                                  │
│       ▼                                       ▼                                  │
│   Ativo Imediatamente                     Build + IPFS                          │
│                                               │                                  │
│                                               ▼                                  │
│                                           Review + Publicação                   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                        BAZARI PLATFORM                                   │   │
│   │  Renderiza plugins nativos  │  Executa apps externos em sandbox         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Plano de Implementação

**Para implementar esta fase com Claude Code, use:**
- [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) - Guia completo com prompts e checklists

---

## Documentos desta Fase

### Por Prioridade

| Prioridade | Documento | Descrição | Público |
|------------|-----------|-----------|---------|
| **P0** | [07-PLUGIN-SYSTEM.md](./07-PLUGIN-SYSTEM.md) | Sistema de plugins low-code | Lojistas |
| **P0** | [08-PLUGIN-TEMPLATES.md](./08-PLUGIN-TEMPLATES.md) | Templates: Fidelidade, Cashback, Cupons | Lojistas |
| **P0** | [09-SELLER-PLUGINS-UI.md](./09-SELLER-PLUGINS-UI.md) | Interface para lojistas gerenciarem plugins | Lojistas |
| **P1** | [01-IPFS-UPLOAD.md](./01-IPFS-UPLOAD.md) | Upload real de bundles para IPFS | Devs |
| **P1** | [02-INK-CONTRACTS.md](./02-INK-CONTRACTS.md) | Templates de smart contracts ink! | Devs |
| **P1** | [03-DEVELOPER-DOCS.md](./03-DEVELOPER-DOCS.md) | Documentação e tutoriais para devs | Devs |
| **P2** | [04-DESIGN-SYSTEM.md](./04-DESIGN-SYSTEM.md) | Componentes UI para desenvolvedores | Devs |
| **P3** | [05-GPS-MAPS-SDK.md](./05-GPS-MAPS-SDK.md) | APIs de GPS e mapas no SDK | Devs |
| **--** | [06-NAVIGATION.md](./06-NAVIGATION.md) | Integração de navegação com telas existentes | Todos |

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BAZARI ECOSYSTEM - FASE 2                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         CAMADA DE USUÁRIO                                 │   │
│  ├──────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │   │
│  │  │  SELLER PORTAL  │  │ DEVELOPER PORTAL│  │@bazari.libervia.xyz/cli│       │   │
│  │  │  /seller/plugins│  │    /developer   │  │  create, build  │           │   │
│  │  │  Low-Code UI    │  │    Pro-Code UI  │  │  publish        │           │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │   │
│  │           │                    │                    │                     │   │
│  └───────────┼────────────────────┼────────────────────┼─────────────────────┘   │
│              │                    │                    │                         │
│              ▼                    ▼                    ▼                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                           BAZARI API                                      │   │
│  ├──────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                           │   │
│  │  /plugins              /seller/plugins          /developer/apps          │   │
│  │  (Catálogo)            (Instâncias)             (Apps customizados)      │   │
│  │                                                                           │   │
│  │  /stores/:id/plugins   /developer/revenue       /store/apps              │   │
│  │  (Plugins da loja)     (Receita dev)            (App Store)              │   │
│  │                                                                           │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                             │
│              ┌────────────────────┴────────────────────┐                        │
│              │                                          │                        │
│              ▼                                          ▼                        │
│  ┌────────────────────────────┐          ┌────────────────────────────┐         │
│  │      PLUGIN SYSTEM         │          │        IPFS CLUSTER        │         │
│  │                            │          │                            │         │
│  │  PluginDefinition (JSON)   │          │  App Bundles (.wasm)       │         │
│  │  PluginInstance (Config)   │          │  Assets (images, etc)      │         │
│  │  Native Components         │          │  CID-based, pinned         │         │
│  │                            │          │                            │         │
│  └────────────────────────────┘          └────────────────────────────┘         │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        BAZARI BLOCKCHAIN                                  │   │
│  ├──────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │   loyalty   │  │   escrow    │  │ revenue-    │  │  app-store  │      │   │
│  │  │  (ink!)     │  │  (ink!)     │  │   split     │  │   pallet    │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │                                                                           │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Casos de Uso

### Para Lojistas (Plugins Low-Code)

| Necessidade | Plugin | Complexidade |
|-------------|--------|--------------|
| Aumentar retenção | Programa de Fidelidade | Ativar + Configurar regras |
| Atrair clientes | Cupons de Desconto | Criar códigos via UI |
| Incentivar compras | Cashback | Definir % e limites |
| Acompanhar entregas | Delivery Tracking | Ativar + Personalizar status |
| Coletar feedback | Avaliações | Ativar |

### Para Desenvolvedores (Apps Pro-Code)

| Necessidade | Solução | Complexidade |
|-------------|---------|--------------|
| App completamente customizado | React + SDK + CLI | Alta |
| Lógica on-chain personalizada | Contratos ink! | Alta |
| Integração com sistemas externos | SDK + APIs | Média |
| Marketplace white-label | Templates + Customização | Média |

---

## Métricas de Sucesso

### Plugins (Low-Code)

| Métrica | Meta |
|---------|------|
| Lojas com plugins ativos | 500+ |
| Plugins mais usados | Fidelidade, Cashback |
| Tempo médio para ativar | < 5 minutos |
| Taxa de retenção (lojas) | +30% |

### Apps (Pro-Code)

| Métrica | Meta |
|---------|------|
| Devs cadastrados | 50+ |
| Apps publicados | 20+ |
| Downloads totais | 1.000+ |
| Receita devs (BZR) | 10.000+ |

---

## Dependências Técnicas

### Já Implementado (Fase 1)
- [x] SDK básico (auth, wallet, storage, ui, events)
- [x] CLI (create, dev, build, validate, publish simulado)
- [x] Developer Portal (dashboard, criar app, monetização)
- [x] Sistema de review
- [x] Monetização (FREE, PAID, FREEMIUM, SUBSCRIPTION)
- [x] Revenue share tiers

### A Implementar (Fase 2)

#### P0 - Plugins Low-Code
- [ ] Sistema de Plugins (PluginDefinition, PluginInstance)
- [ ] Templates oficiais (Fidelidade, Cashback, Cupons)
- [ ] UI para lojistas (/seller/plugins)
- [ ] Renderização de plugins na loja
- [ ] Hooks automáticos (onPurchase, etc)

#### P1 - Apps Pro-Code
- [ ] Upload IPFS real
- [ ] Templates ink! (fidelidade, escrow, divisão)
- [ ] Documentação/Tutoriais
- [ ] Publicação no npm (@bazari.libervia.xyz/cli, @bazari.libervia.xyz/app-sdk)

#### P2-P3 - Extras
- [ ] Design System para devs
- [ ] SDK de GPS/Maps

---

## Cronograma Sugerido

| Sprint | Foco | Documentos | Impacto |
|--------|------|------------|---------|
| 1-2 | **Sistema de Plugins** | 07, 08, 09 | Alto (lojistas) |
| 3-4 | IPFS + Contratos | 01, 02 | Médio (devs) |
| 5-6 | Documentação | 03 | Médio (devs) |
| 7-8 | Design System | 04 | Baixo |
| 9-10 | GPS/Maps | 05 | Baixo |

---

## Repositórios

| Repo | Path | Uso |
|------|------|-----|
| **bazari** | `/root/bazari` | API, Web, SDK, CLI |
| **bazari-chain** | `/root/bazari-chain` | Blockchain, Contratos ink! |

---

**Versão:** 2.0.0
**Data:** 2024-12-07
**Autor:** BazariOS Team
