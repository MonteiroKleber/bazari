# 🏗️ Arquitetura Visual - Sistema ZARI

**Data:** 26 de Outubro de 2025
**Versão:** 1.0

---

## 📐 Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         BAZARI ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                           ┌──────────────┐   │
│  │   BZR Token  │                           │  ZARI Token  │   │
│  │ (Nativo)     │                           │  (Asset #1)  │   │
│  ├──────────────┤                           ├──────────────┤   │
│  │ Economia     │                           │ Governança   │   │
│  │ Popular      │                           │ & Funding    │   │
│  │              │                           │              │   │
│  │ • Compras    │                           │ • Votação    │   │
│  │ • Vendas     │◄────── Conversão ────────►│ • Staking    │   │
│  │ • P2P        │         BZR↔ZARI          │ • Treasury   │   │
│  │ • Taxas      │                           │ • Rewards    │   │
│  └──────────────┘                           └──────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Arquitetura de 3 Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: BLOCKCHAIN                           │
│                    (bazari-chain)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Balances  │  │   Assets    │  │  Treasury   │            │
│  │   (BZR)     │  │   (ZARI)    │  │   (DAO)     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Democracy  │  │ Collective  │  │   Staking   │            │
│  │  (Votação)  │  │ (Council)   │  │ (Validador) │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────┐           │
│  │       Custom Pallets (Existentes)               │           │
│  │  • bazari-identity (profiles)                   │           │
│  │  • stores (lojas)                               │           │
│  │  • universal-registry (IPFS)                    │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ RPC Calls
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 2: BACKEND API                          │
│                    (bazari/apps/api)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Módulo P2P (Existente)                   │          │
│  │  ┌────────────────────────────────────────────┐  │          │
│  │  │ P2P BZR ↔ Fiat (Atual)                    │  │          │
│  │  └────────────────────────────────────────────┘  │          │
│  │  ┌────────────────────────────────────────────┐  │          │
│  │  │ P2P ZARI ↔ BZR (NOVO - Extensão)         │  │          │
│  │  │  • Oferta Oficial DAO                      │  │          │
│  │  │  • Compra direta                           │  │          │
│  │  └────────────────────────────────────────────┘  │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Módulo DAO (NOVO)                        │          │
│  │  • POST /api/dao/proposals                       │          │
│  │  • POST /api/dao/proposals/:id/vote              │          │
│  │  • GET  /api/dao/proposals                       │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Módulo ZARI (NOVO)                       │          │
│  │  • POST /api/zari/dao-offer (admin)              │          │
│  │  • POST /api/zari/buy                            │          │
│  │  • GET  /api/zari/balance/:address               │          │
│  │  • GET  /api/zari/history/:userId                │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Workers (Background Jobs)                │          │
│  │  • Sync de saldos ZARI                           │          │
│  │  • Reputação on-chain                            │          │
│  │  • Escrow timeout checker                        │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP/REST
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 3: FRONTEND                             │
│                    (bazari/apps/web)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Wallet (Client-Side)                     │          │
│  │  ┌────────────────────────────────────────────┐  │          │
│  │  │ Multi-Token Support (NOVO)                 │  │          │
│  │  │  • BZR Balance                             │  │          │
│  │  │  • ZARI Balance                            │  │          │
│  │  │  • Transfer BZR/ZARI                       │  │          │
│  │  └────────────────────────────────────────────┘  │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Módulo P2P (Existente)                   │          │
│  │  • Ofertas BZR ↔ Fiat                            │          │
│  │  • Chat integrado                                │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Módulo ZARI Purchase (NOVO)              │          │
│  │  • /zari/purchase                                │          │
│  │  • Compra de ZARI com BZR                        │          │
│  │  • Visualização de fases                         │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Módulo DAO (NOVO)                        │          │
│  │  • /dao/proposals (lista)                        │          │
│  │  • /dao/proposals/new (criar)                    │          │
│  │  • /dao/proposals/:id (votar)                    │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Compra de ZARI

### Fluxo Completo (Happy Path)

```
┌──────────┐
│  Usuário │
└────┬─────┘
     │ 1. Acessa /zari/purchase
     ▼
┌─────────────────┐
│   Frontend      │
│ (ZARIPurchase   │
│  Page)          │
└────┬────────────┘
     │ 2. Carrega oferta ativa
     │    GET /api/zari/dao-offer/active
     ▼
┌─────────────────┐
│   Backend API   │
│ (ZARI Module)   │
└────┬────────────┘
     │ 3. Busca oferta DAO no DB
     │    (P2POffer onde offerType='DAO_OFFICIAL')
     ▼
┌─────────────────┐
│   PostgreSQL    │
│  (P2POffer)     │
└────┬────────────┘
     │ 4. Retorna: preço, quantidade disponível
     ▼
┌─────────────────┐
│   Frontend      │
│ (mostra oferta) │
└────┬────────────┘
     │
     │ 5. Usuário preenche quantidade (ex: 100 ZARI)
     │    Frontend calcula: 100 * preço = custo em BZR
     │
     │ 6. Usuário clica "Comprar ZARI"
     │    POST /api/zari/buy { amount: 100 }
     ▼
┌─────────────────┐
│   Backend API   │
│ (ZARI Module)   │
└────┬────────────┘
     │
     │ 7. Validações:
     │    • Verifica saldo BZR do usuário (consulta blockchain)
     │    • Verifica disponibilidade ZARI na oferta DAO
     │
     │ 8. Cria ordem no DB
     │    P2POrder { status: 'PENDING', ... }
     │
     │ 9. Executa transação on-chain:
     │    ┌────────────────────────────────────────┐
     │    │ Atomic Transaction:                    │
     │    │ 1. Transfer BZR (usuário → treasury)   │
     │    │ 2. Transfer ZARI (treasury → usuário)  │
     │    └────────────────────────────────────────┘
     ▼
┌─────────────────┐
│  BazariChain    │
│ (pallet-assets, │
│  balances)      │
└────┬────────────┘
     │ 10. Transação confirmada
     │     Retorna txHash
     ▼
┌─────────────────┐
│   Backend API   │
└────┬────────────┘
     │ 11. Atualiza ordem no DB
     │     P2POrder { status: 'COMPLETED', escrowTxHash }
     │
     │ 12. Atualiza saldo cache do usuário
     │     User.zariBalance += 100
     ▼
┌─────────────────┐
│   Frontend      │
│ (sucesso!)      │
└────┬────────────┘
     │ 13. Mostra confirmação
     │     "Compra confirmada! TX: 0x123..."
     │     Atualiza saldo ZARI na wallet
     ▼
┌──────────┐
│  Usuário │
│ (100 ZARI│
│  a mais) │
└──────────┘
```

### Fluxo de Erro (Saldo Insuficiente)

```
Usuário → Frontend → Backend
                       │
                       │ Verifica saldo BZR
                       │ Usuário tem: 50 BZR
                       │ Precisa de: 100 BZR
                       ▼
                    ❌ ERRO
                       │
                       │ 400 Bad Request
                       │ { error: "Insufficient BZR balance" }
                       ▼
                    Frontend
                       │
                       │ Toast: "Saldo insuficiente de BZR"
                       ▼
                    Usuário
```

---

## 🗳️ Fluxo de Governança (Votação)

```
┌──────────┐
│  Usuário │
│ (tem ZARI)│
└────┬─────┘
     │ 1. Acessa /dao/proposals
     ▼
┌─────────────────┐
│   Frontend      │
│ (ProposalsList) │
└────┬────────────┘
     │ 2. GET /api/dao/proposals
     ▼
┌─────────────────┐
│   Backend API   │
└────┬────────────┘
     │ 3. Busca propostas ativas
     ▼
┌─────────────────┐
│   PostgreSQL    │
│ (DAOProposal)   │
└────┬────────────┘
     │ 4. Lista propostas
     ▼
┌─────────────────┐
│   Frontend      │
│ (mostra lista)  │
└────┬────────────┘
     │ 5. Usuário clica em proposta
     │    /dao/proposals/:id
     │
     │ 6. Lê proposta completa
     │    Título: "Alocar 50k ZARI para Marketing"
     │    Descrição: ...
     │    Votação: 1.2M FOR | 300k AGAINST
     │
     │ 7. Usuário clica "Votar A Favor"
     ▼
┌─────────────────┐
│   Frontend      │
│ (VoteDialog)    │
└────┬────────────┘
     │ 8. Modal de confirmação:
     │    "Votar COM 100 ZARI em stake?"
     │    Peso do voto: 100
     │
     │ 9. Confirma
     │    POST /api/dao/proposals/:id/vote
     │    { vote: 'FOR', weight: 100 }
     ▼
┌─────────────────┐
│   Backend API   │
└────┬────────────┘
     │ 10. Validações:
     │     • Usuário tem 100+ ZARI?
     │     • Proposta ainda ativa?
     │     • Usuário já votou?
     │
     │ 11. Cria voto no DB
     │     DAOVote { vote: 'FOR', weight: 100 }
     │
     │ 12. Atualiza contagem
     │     DAOProposal.votesFor += 100
     │
     │ 13. (Opcional) Registra on-chain
     │     democracy.vote(proposalHash, aye, conviction)
     ▼
┌─────────────────┐
│  BazariChain    │
│ (pallet-        │
│  democracy)     │
└────┬────────────┘
     │ 14. Voto confirmado on-chain
     ▼
┌─────────────────┐
│   Backend API   │
└────┬────────────┘
     │ 15. Sucesso
     ▼
┌─────────────────┐
│   Frontend      │
│ (atualiza UI)   │
└────┬────────────┘
     │ 16. Mostra:
     │     "Voto confirmado!"
     │     Nova contagem: 1.3M FOR | 300k AGAINST
     ▼
┌──────────┐
│  Usuário │
└──────────┘

// Quando proposta passa (votesFor > threshold):
// Backend worker detecta → Executa ação on-chain (ex: treasury.spend)
```

---

## 🔐 Arquitetura de Segurança

### Multi-Sig para Tesouro DAO

```
┌────────────────────────────────────────────────────────┐
│           TESOURO DAO (5.25M ZARI)                     │
│         Protegido por Multi-Sig 5-of-7                 │
└────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │Fundador │      │Fundador │      │Fundador │
   │   #1    │      │   #2    │      │   #3    │
   └─────────┘      └─────────┘      └─────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
   │Fundador │      │Fundador │      │Validador│      │Validador│
   │   #4    │      │   #5    │      │   #1    │      │   #2    │
   └─────────┘      └─────────┘      └─────────┘      └─────────┘

Qualquer transação do tesouro precisa de:
  ✅ MÍNIMO 5 assinaturas de 7 possíveis
  ✅ Timeout de 24h para emergências
  ✅ Registro on-chain de todas aprovações

Exemplo de uso:
  "Transferir 50k ZARI para Marketing"
  → Proposta criada
  → Fundador #1 assina
  → Fundador #2 assina
  → Fundador #3 assina
  → Fundador #4 assina
  → Validador #1 assina
  ✅ 5 assinaturas → APROVADO → Executa transação
```

---

## 📦 Distribuição de ZARI (21M Total)

```
┌────────────────────────────────────────────────────────────────┐
│                    SUPPLY INICIAL: 21.000.000 ZARI             │
└────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌──────────┐         ┌──────────┐         ┌──────────┐
  │Fundadores│         │Comunidade│         │Parcerias │
  │  10%     │         │  20%     │         │  10%     │
  │ 2,1M     │         │ 4,2M     │         │ 2,1M     │
  └──────────┘         └──────────┘         └──────────┘
      │                     │                     │
      │                     │                     │
      ▼                     ▼                     ▼
  Vesting:            Sem vesting           Vesting:
  6m cliff +          (liquidez             3m cliff +
  24m linear          imediata)             12m linear

                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌──────────┐         ┌──────────┐         ┌──────────┐
  │ Tesouro  │         │ Staking  │         │ Reservas │
  │  DAO     │         │ Rewards  │         │ Futuras  │
  │  25%     │         │  15%     │         │  20%     │
  │ 5,25M    │         │ 3,15M    │         │ 4,2M     │
  └──────────┘         └──────────┘         └──────────┘
      │                     │                     │
      │                     │                     │
      ▼                     ▼                     ▼
  Multi-sig           Distribuído          Lock 12m
  5-of-7              progressivo          depois uso
                      aos stakers          p/ SubDAOs
```

---

## 🚀 Timeline de Implementação (Visual)

```
MÊS 1: BLOCKCHAIN FOUNDATION
┌────────────────────────────────────────┐
│ Semana 1-2: Setup & Config             │
│  □ Adicionar pallet-assets             │
│  □ Configurar ZARI (Asset ID 1)        │
│  □ Genesis com 21M ZARI                │
├────────────────────────────────────────┤
│ Semana 3-4: Governança Básica          │
│  □ Adicionar pallet-treasury           │
│  □ Implementar multi-sig (5-of-7)      │
│  □ Deploy testnet                      │
└────────────────────────────────────────┘
                 ▼
MÊS 2: BACKEND & FRONTEND MVP
┌────────────────────────────────────────┐
│ Semana 5-6: Backend                    │
│  □ Extensão P2P para ZARI              │
│  □ POST /api/zari/buy                  │
│  □ Worker de sync                      │
├────────────────────────────────────────┤
│ Semana 7-8: Frontend                   │
│  □ Wallet multi-token                  │
│  □ /zari/purchase page                 │
│  □ Testes E2E                          │
└────────────────────────────────────────┘
                 ▼
MÊS 3: GOVERNANÇA & AUDIT
┌────────────────────────────────────────┐
│ Semana 9-10: DAO                       │
│  □ pallet-democracy                    │
│  □ API de propostas                    │
│  □ UI de votação                       │
├────────────────────────────────────────┤
│ Semana 11-12: Segurança                │
│  □ Audit interno completo              │
│  □ Bug bounty program                  │
│  □ Correções de bugs                   │
└────────────────────────────────────────┘
                 ▼
MÊS 4: LANÇAMENTO
┌────────────────────────────────────────┐
│ Semana 13: Final Polish                │
│  □ Marketing materials                 │
│  □ Whitepaper publicado                │
│  □ Deploy mainnet                      │
├────────────────────────────────────────┤
│ Semana 14: LANÇAMENTO PÚBLICO 🚀       │
│  ✅ Venda Fase 2 aberta                │
│  ✅ DAO operacional                    │
│  ✅ Suporte 24/7                       │
└────────────────────────────────────────┘
```

---

## 🔄 Estados de ZARI no Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                  CICLO DE VIDA DO ZARI                       │
└─────────────────────────────────────────────────────────────┘

1. GENESIS (Momento 0)
   ┌──────────────────┐
   │  21M ZARI criado │
   │  Asset ID: 1     │
   └────────┬─────────┘
            │
            ▼
   Distribuído para:
   • Tesouro DAO: 5.25M
   • Fundadores: 2.1M (locked)
   • Reservas: 6.3M (locked)
   • Venda Pool: 4.2M (disponível)
   • Staking Pool: 3.15M (para rewards)

2. VENDA (Fases 2A e 2B)
   ┌──────────────────┐
   │ Usuário compra   │
   │ com BZR          │
   └────────┬─────────┘
            │
            ▼
   Estado: LIQUID (pode transferir, votar, stakear)

3. STAKING (Opcional)
   ┌──────────────────┐
   │ Usuário faz      │
   │ stake de ZARI    │
   └────────┬─────────┘
            │
            ▼
   Estado: STAKED (locked por período)
   • Ganha peso de voto maior
   • Recebe rewards
   • Não pode transferir

4. VESTING (Fundadores/Parcerias)
   ┌──────────────────┐
   │ ZARI em vesting  │
   └────────┬─────────┘
            │
            ▼
   Estados progressivos:
   Month 0-6:  LOCKED (cliff)
   Month 7-30: VESTING (libera 4%/mês)
   Month 30+:  LIQUID (100% livre)

5. EM VOTAÇÃO
   ┌──────────────────┐
   │ Usuário vota em  │
   │ proposta         │
   └────────┬─────────┘
            │
            ▼
   Estado: VOTING_LOCKED (temporário)
   • Locked enquanto votação ativa
   • Libera quando votação termina
   • Peso proporcional ao stake
```

---

## 🛡️ Cenários de Segurança

### Cenário 1: Tentativa de Double-Spend

```
Atacante tenta comprar ZARI duas vezes com mesmo BZR:

Compra #1                    Compra #2 (simultânea)
    │                              │
    ▼                              ▼
Backend verifica saldo       Backend verifica saldo
    │                              │
    ├─ Saldo: 100 BZR              ├─ Saldo: 100 BZR
    │                              │
    ▼                              ▼
Inicia TX on-chain          Inicia TX on-chain
    │                              │
    ▼                              ▼
┌──────────────────────────────────────┐
│         BazariChain                  │
│  (Validação de Consensus)            │
├──────────────────────────────────────┤
│  TX#1: Transfer 100 BZR → OK         │
│  TX#2: Transfer 100 BZR → FAILED     │
│         (InsufficientBalance)        │
└──────────────────────────────────────┘
    │                              │
    ▼                              ▼
✅ Sucesso                      ❌ Erro
Ordem #1 confirmada            Ordem #2 cancelada
```

**Proteção:** Consensus do blockchain garante atomicidade

---

### Cenário 2: Ataque ao Tesouro DAO

```
Atacante compromete 1 chave do multi-sig:

┌─────────────────────────────────────┐
│  Atacante tem: 1 de 7 chaves        │
└─────────────────────────────────────┘
           │
           │ Tenta: Transferir 5M ZARI para si
           ▼
┌─────────────────────────────────────┐
│  Multi-Sig 5-of-7                   │
├─────────────────────────────────────┤
│  Assinaturas coletadas: 1/5         │
│  ❌ INSUFICIENTE                    │
└─────────────────────────────────────┘
           │
           ▼
    ❌ Transação não executa

⚠️ Alerta enviado aos outros 6 signatários
   "Tentativa de transação suspeita detectada"

✅ Fundos seguros
```

**Proteção:** Precisa comprometer MÍNIMO 5 de 7 chaves (muito difícil)

---

### Cenário 3: Bug no Código (Mint Infinito)

```
Hipotético: Bug permite mint de ZARI sem permissão

┌─────────────────────────────────────┐
│  Atacante tenta: Mint 1M ZARI       │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  pallet-assets                      │
│  ensure_origin(AdminOrigin)         │
├─────────────────────────────────────┤
│  Atacante NÃO tem permissão         │
│  ❌ BadOrigin Error                 │
└─────────────────────────────────────┘
           │
           ▼
    ❌ Transação revertida

// Se BUG existir (bypassa origin check):

┌─────────────────────────────────────┐
│  Monitoring detecta:                │
│  Supply mudou de 21M → 22M          │
│  ⚠️ ALERTA CRÍTICO                  │
└─────────────────────────────────────┘
           │
           ▼
    1. Circuit breaker: Pause mint/burn
    2. Investigação imediata
    3. Hard fork se necessário
    4. Bug bounty pago
```

**Proteção:**
1. Permission checks em múltiplas camadas
2. Monitoring de supply 24/7
3. Circuit breakers automáticos
4. Audit prévio

---

## 📊 Fluxo de Valor Econômico

```
┌────────────────────────────────────────────────────────────────┐
│                    ECONOMIA BAZARI                              │
└────────────────────────────────────────────────────────────────┘

Usuário compra produto (100 BZR)
    │
    ├─ 95 BZR → Vendedor
    │
    ├─ 3 BZR → Taxa da plataforma
    │      │
    │      ├─ 1.5 BZR → Tesouro DAO
    │      │               │
    │      │               ├─ Convertido em ZARI
    │      │               │   (compra de mercado)
    │      │               │
    │      │               └─ Distribuído:
    │      │                   • 50% → Staking rewards
    │      │                   • 30% → Desenvolvimento
    │      │                   • 20% → Marketing
    │      │
    │      └─ 1.5 BZR → Validadores
    │
    └─ 2 BZR → Burn (deflação)

RESULTADO:
• Vendedor ganha
• DAO financia projeto
• Holders de ZARI recebem rewards
• BZR fica mais escasso (deflação)
• Validadores incentivados
```

---

## 🔮 Visão de Futuro (1-2 anos)

```
HOJE (Pré-ZARI):
┌─────────────────┐
│  Bazari Chain   │  Centralizado (Sudo)
│  (2 validators) │  PoA
└─────────────────┘

FASE 1 (Mês 4 - Lançamento):
┌─────────────────┐
│  Bazari Chain   │  Multi-sig 5-of-7
│  (2 validators) │  PoA → Preparando PoS
│  + ZARI Token   │  Treasury ativa
│  + DAO Básica   │  Votação funcional
└─────────────────┘

FASE 2 (Mês 9):
┌─────────────────┐
│  Bazari Chain   │  Council eleito (7 membros)
│  (10 validators)│  PoS parcial
│  + ZARI         │  Sudo removido
│  + DAO Completa │  Governança descentralizada
└─────────────────┘

FASE 3 (Ano 2):
┌─────────────────┐
│  Bazari Chain   │  100+ validadores
│  (Parachain?)   │  Full PoS
│  + ZARI         │  Shared security (Polkadot)
│  + SubDAOs      │  DAOs regionais
│  + DeFi Module  │  DEX nativo ZARI/BZR
└─────────────────┘
```

---

*Documento criado em: 26/Out/2025*
*Versão: 1.0*
*Para: Planejamento Interno Bazari*
