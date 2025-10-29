# Bazari - Documento Executivo
## 04. Módulos do Ecossistema Bazari

---

## Índice
1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Marketplace](#2-marketplace)
3. [BazChat](#3-bazchat)
4. [Wallet](#4-wallet)
5. [Minhas Lojas](#5-minhas-lojas)
6. [Meu Marketplace](#6-meu-marketplace)
7. [Virar Entregador](#7-virar-entregador)
8. [P2P (Peer-to-Peer Exchange)](#8-p2p-peer-to-peer-exchange)
9. [DAO (Governança)](#9-dao-governança)
10. [Feed Social](#10-feed-social)
11. [Perfil Social](#11-perfil-social)
12. [Diagrama de Interconexão](#12-diagrama-de-interconexão)

---

## 1. Visão Geral da Arquitetura

### 1.1 Filosofia de Design

O ecossistema Bazari não é uma única aplicação, mas um **conjunto de módulos interconectados** que formam uma experiência coesa. Cada módulo:

- ✅ É **autônomo** (pode funcionar independentemente)
- ✅ É **componível** (se integra naturalmente com outros módulos)
- ✅ **Consulta o mesmo estado on-chain** (BazariChain)
- ✅ Pode ter **múltiplas implementações** (frontends diferentes)

```
┌─────────────────────────────────────────────────┐
│             CAMADA DE APLICAÇÃO                 │
│  (Módulos Frontends - Web/Mobile/Desktop)      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Marketplace │ BazChat │ Wallet │ P2P │ DAO    │
│     │            │         │       │       │    │
│     └────────────┴─────────┴───────┴───────┘    │
│                       │                          │
├───────────────────────┼──────────────────────────┤
│               CAMADA DE DADOS                    │
│              BazariChain (Substrate)             │
│  ┌──────────────────────────────────────────┐   │
│  │ Pallets: Order, Escrow, Attestation,     │   │
│  │ Fulfillment, Affiliate, Reputation, DAO  │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│          CAMADA DE INFRAESTRUTURA               │
│  IPFS (mídia) │ libp2p (p2p) │ Storage (db)    │
└─────────────────────────────────────────────────┘
```

---

## 2. Marketplace

### 2.1 Descrição

O **Marketplace** é o módulo principal onde usuários **descobrem, compram e vendem produtos**. É a interface de entrada para a maioria dos usuários.

**Funcionalidades**:
- Navegação por categorias (Eletrônicos, Moda, Casa, Alimentos, Serviços)
- Busca (texto, filtros, ordenação)
- Página de produto (fotos, descrição, avaliações, PoC Score do vendedor)
- Carrinho de compras
- Checkout (criação de Order + depósito de Escrow)
- Rastreamento de pedido (timeline com provas on-chain)

---

### 2.2 Conexão com Proof of Commerce

```
Usuário busca "Tênis Nike"
    ↓
Marketplace consulta on-chain:
  - Produtos listados (pallet-product)
  - SellerScore de cada lojista (pallet-reputation)
  - Algoritmo de ranking (open source)
    ↓
Exibe resultados ordenados
    ↓
Usuário clica "Comprar"
    ↓
Marketplace chama Wallet:
  - Cria Order on-chain (pallet-order::create_order)
  - Deposita escrow (pallet-escrow::deposit)
    ↓
Order ID criado (ex.: 0xABC123)
    ↓
Usuário é redirecionado para timeline de rastreamento
```

**Inovação vs. Marketplaces Tradicionais**:

| Feature | Marketplace Tradicional | Bazari Marketplace |
|---------|-------------------------|--------------------|
| Busca | Algoritmo secreto | Código aberto auditável |
| Ranking | Baseado em leilão de anúncios | Baseado em reputação PoC + qualidade |
| Pagamento | Fiat (cartão) via gateway | Cripto (BZR) via escrow on-chain |
| Rastreamento | Sistema interno opaco | Provas on-chain imutáveis (attestations) |
| Disputa | Atendimento centralizado | Júri descentralizado |

---

### 2.3 Exemplo de Fluxo UX

**Cenário**: Maria quer comprar um vestido.

1. **Descoberta**
   ```
   Maria abre Marketplace → categoria "Moda Feminina"
   Filtros: Preço R$ 50-150, Tamanho M, Cor Verde
   Ordenação: "Melhor reputação"
   ```

2. **Análise de Produto**
   ```
   Produto: Vestido Verde - R$ 89
   Seller: @ModaAutoral (SellerScore: 850/1000)
   Avaliações: 4.8/5 (127 vendas)
   Localização: São Paulo - SP
   Frete: R$ 12 (entrega em 1 dia por Courier Score 920)
   ```

3. **Compra**
   ```
   Maria clica "Comprar Agora"
   Wallet abre modal:
     Total: 89 + 12 = 101 BZR
     Saldo: 250 BZR ✅
     [Confirmar Compra]
   ```

4. **Proof of Commerce Inicia**
   ```
   Order #0xABC criado
   Escrow travado: 101 BZR
   Seller notificado via BazChat
   Timeline exibida:
     ✅ Pedido criado (agora)
     ⏳ Aguardando aceitação do vendedor
   ```

---

### 2.4 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Wallet** | Marketplace chama Wallet para transações on-chain |
| **BazChat** | Botão "Falar com vendedor" abre chat |
| **Minhas Lojas** | Vendedor gerencia produtos via painel |
| **Virar Entregador** | Couriers veem pedidos disponíveis no Marketplace |
| **Feed Social** | Produtos podem ser compartilhados no Feed |
| **DAO** | Usuários podem propor mudanças no algoritmo de ranking |

---

## 3. BazChat

### 3.1 Descrição

**BazChat** é o módulo de **mensageria P2P** construído sobre libp2p. Ele serve múltiplas funções:

1. **Chat** entre Buyer/Seller/Courier
2. **Co-assinatura de provas** (Handoff, Delivery)
3. **Negociação** (oferta/contraoferta)
4. **Suporte comunitário** (chat de grupo para aprendizado)

**Características Técnicas**:
- Protocolo: libp2p/gossipsub
- Encriptação: E2EE (end-to-end encryption) com chaves das wallets
- Storage: Mensagens em local storage (não vão para blockchain)
- Mídia: Fotos/vídeos via IPFS

---

### 3.2 Conexão com Proof of Commerce

**Uso Principal: Co-Assinatura de Provas**

```
┌──────────────────────────────────────────────────┐
│        HANDOFF: Seller entrega para Courier      │
├──────────────────────────────────────────────────┤
│                                                  │
│  BazChat abre tela especial:                     │
│    [Câmera]  Tire foto do pacote lacrado         │
│    [Geo]     Localização capturada: Loja XYZ     │
│    [Peso]    1.2 kg (opcional, se tem balança)   │
│    [QR Code] Código efêmero para validação       │
│                                                  │
│  Seller vê preview:                              │
│    [Assinar Handoff] ← Clica aqui                │
│                                                  │
│  Courier vê preview:                             │
│    [Assinar Handoff] ← Clica aqui                │
│                                                  │
│  Quando AMBOS assinam:                           │
│    → JSON do HandoffProof é gerado               │
│    → Hash é ancorado on-chain (pallet-attestation)│
│    → Mídia sobe para IPFS                        │
│    → Order muda para IN_TRANSIT                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Mesmo processo para DeliveryProof** (Courier + Buyer).

---

### 3.3 Features Sociais

**Chat 1-on-1**:
```
Buyer: Oi, o vestido tem na cor azul?
Seller: Olá! Sim, tenho azul tamanho M e G. Qual prefere?
Buyer: M, por favor. Pode enviar amanhã?
Seller: Consigo! Vou alterar o pedido para azul e confirmo em 10 min.
```

**Chat de Grupo** (ex.: "Vendedores de Artesanato MG"):
```
User1: Alguém sabe como configurar campanha de afiliados?
User2: Sim! Vai em Minhas Lojas → Campanhas → Criar Nova
User3: Compartilho tutorial: ipfs://QmTutorial...
```

**Notificações Inteligentes**:
```
🔔 @ModaAutoral aceitou seu pedido #0xABC
🔔 Entregador @Motoboy123 foi selecionado
🔔 📦 Handoff confirmado! Seu pedido está a caminho
🔔 Courier está a 2km de você (atualização de geo via libp2p)
🔔 📬 Pedido entregue! Confirme o recebimento no BazChat
```

---

### 3.4 Privacidade e Segurança

**Encriptação E2E**:
```rust
// Mensagem enviada por Seller para Buyer
let shared_secret = ecdh(seller_privkey, buyer_pubkey);
let encrypted_msg = aes_gcm_encrypt(message, shared_secret);

// Publicado via gossipsub
topic: /bazari/order/0xABC
payload: encrypted_msg

// Somente Buyer consegue decriptar
let decrypted = aes_gcm_decrypt(encrypted_msg, shared_secret);
```

**Sem Servidor Central**:
- Nenhum servidor "lê" suas mensagens
- Nem mesmo desenvolvedores Bazari têm acesso
- Logs de mensagens ficam apenas nos dispositivos dos participantes

**Integração com PoC**:
- Provas co-assinadas têm **carimbo de tempo on-chain** (imutável)
- Mensagens comuns **não vão para blockchain** (privacidade)
- Mídia sensível pode ser armazenada em IPFS privado (só quem tem CID acessa)

---

### 3.5 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Marketplace** | Botão "Falar com vendedor" em qualquer produto |
| **Wallet** | BazChat usa identidade da Wallet (account_id) |
| **Minhas Lojas** | Vendedor responde dúvidas de múltiplos compradores |
| **Virar Entregador** | Courier coordena retirada/entrega via chat |
| **Perfil Social** | Mensagens podem referenciar posts do Feed |

---

## 4. Wallet

### 4.1 Descrição

**Wallet** é o módulo de **gestão de ativos cripto**. É a ponte entre o usuário e a blockchain.

**Funcionalidades**:
- Criar/Importar conta (mnemônico de 12/24 palavras)
- Ver saldo (BZR, outros tokens)
- Enviar/Receber (transferências on-chain)
- Assinar transações (criação de orders, atestados, votos DAO)
- Histórico (todas as transações da conta)
- Integração com hardware wallets (Ledger, Trezor - Fase 2)

---

### 4.2 Conexão com Proof of Commerce

**Wallet é o Ponto de Controle de Toda Atividade On-Chain**:

```rust
// Exemplos de transações que Wallet assina:

// 1. Criar Order (Buyer)
pallet_order::create_order(
    origin: signed(buyer_account),
    product_id,
    escrow_amount: 100 BZR
)

// 2. Depositar Stake (Courier)
pallet_fulfillment::deposit_stake(
    origin: signed(courier_account),
    order_id,
    stake: 20 BZR
)

// 3. Submeter Attestation (Seller + Courier)
pallet_attestation::submit_attestation(
    origin: signed(seller_account),  // pode ser qualquer dos signers
    order_id,
    step: HANDOFF,
    payload_hash,
    signatures: [
        (seller_account, seller_sig),
        (courier_account, courier_sig)
    ]
)

// 4. Votar em Proposta DAO
pallet_dao::vote(
    origin: signed(token_holder),
    proposal_id,
    vote: Aye | Nay,
    voting_power: amount_of_BZR_staked
)
```

---

### 4.3 Interface UX

**Tela Principal**:
```
┌────────────────────────────────────────┐
│            Bazari Wallet               │
├────────────────────────────────────────┤
│                                        │
│  Conta: 5FHneW... [Copiar] [QR]       │
│                                        │
│  💰 Saldo Total                        │
│      1.247,50 BZR                      │
│      ≈ R$ 6.237,50 (cotação P2P)      │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ [Enviar] [Receber] [Histórico]  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  🔒 Fundos Bloqueados                 │
│      Escrows: 150 BZR (3 pedidos)     │
│      Stakes: 60 BZR (como entregador) │
│                                        │
│  📊 Reputações                         │
│      Seller Score:  850/1000          │
│      Courier Score: 920/1000          │
│      Buyer Score:   750/1000          │
│                                        │
└────────────────────────────────────────┘
```

**Fluxo de Transação**:
```
Usuário clica [Enviar]
    ↓
Modal abre:
  Para: 5Destinatario... (ou escaneia QR)
  Quantidade: 50 BZR
  Taxa: 0.01 BZR (gas fee)
  [Confirmar]
    ↓
Wallet gera transação:
  balances::transfer(dest, 50 BZR)
    ↓
Usuário vê preview:
  De: 5FHneW...
  Para: 5Dest...
  Valor: 50 BZR
  Taxa: 0.01 BZR
  ─────────────
  Total: 50.01 BZR
  [Assinar com Senha/Biometria]
    ↓
Transação broadcast para rede
    ↓
Confirmação em ~12s (2 blocos)
    ↓
Notificação: ✅ Enviado! TxHash: 0xTx123...
```

---

### 4.4 Segurança

**Custódia**:
- ✅ **Non-custodial**: Usuário controla chaves privadas
- ❌ Bazari **nunca** tem acesso às chaves
- ✅ Mnemônico pode recuperar conta em qualquer wallet compatível (Polkadot.js, Talisman, SubWallet)

**Proteções**:
```
Chave privada encriptada com senha forte
    ↓
Armazenada em Keychain (iOS) / Keystore (Android) / Encrypted storage (Web)
    ↓
Assinatura requer autenticação:
  • Senha (padrão)
  • Biometria (Face ID, Touch ID) - opcional
  • Hardware wallet (Ledger via USB/Bluetooth) - Fase 2
```

**Multi-Sig** (Fase 2, para empresas):
```rust
// Conta multi-sig requer 2 de 3 assinaturas
let multisig_account = create_multisig([alice, bob, charlie], threshold: 2);

// Transação de grande valor (ex.: 10.000 BZR)
pallet_multisig::as_multi(
    signatories: [alice, bob, charlie],
    threshold: 2,
    call: balances::transfer(dest, 10_000 BZR)
);

// Alice e Bob assinam → transação executa
// Se só Alice assinar → fica pendente
```

---

### 4.5 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Todos** | Wallet é usado por **todos os módulos** para assinar transações |
| **Marketplace** | Checkout usa Wallet para escrow |
| **BazChat** | Co-assinaturas de provas via Wallet |
| **P2P** | Wallet gerencia ordens de compra/venda de BZR ↔ Fiat |
| **DAO** | Wallet trava BZR para voting power |

---

## 5. Minhas Lojas

### 5.1 Descrição

**Minhas Lojas** é o módulo de **gestão para vendedores**. É o painel de controle para quem vende no Bazari.

**Funcionalidades**:
- Listar produtos (título, descrição, fotos, preço, estoque)
- Gerenciar pedidos (aceitar, cancelar, ver timeline)
- Campanhas de afiliados (criar, configurar comissões)
- Analytics (vendas, receita, produtos mais vendidos)
- Reputação (ver SellerScore, histórico de avaliações)
- Configurações (política de devolução, prazo de envio)

---

### 5.2 Conexão com Proof of Commerce

**Ciclo de Vida do Produto**:

```
Vendedor cria produto:
  Título: "Camiseta Artesanal - Tie Dye"
  Descrição: "Camiseta 100% algodão, tingida à mão..."
  Fotos: [img1.jpg, img2.jpg]
  Preço: 45 BZR
  Estoque: 10 unidades
  Categoria: Moda > Camisetas
    ↓
Minhas Lojas chama:
  pallet_product::create_product(
      seller_account,
      metadata_cid: "QmProduct123" (JSON no IPFS),
      price: 45 BZR,
      stock: 10
  )
    ↓
Product ID on-chain: #0xProd456
    ↓
Aparece no Marketplace para todos
```

**Gestão de Pedidos**:

```
Vendedor vê painel:

┌────────────────────────────────────────┐
│         Pedidos Pendentes              │
├────────────────────────────────────────┤
│                                        │
│  Order #0xABC - R$ 89                  │
│    Produto: Vestido Verde              │
│    Comprador: @Maria (BuyerScore 750)  │
│    [Aceitar] [Recusar]                 │
│                                        │
│  Order #0xDEF - R$ 120                 │
│    Produto: Bolsa Artesanal            │
│    Comprador: @João (BuyerScore 890)   │
│    [Aceitar] [Recusar]                 │
│                                        │
└────────────────────────────────────────┘

Vendedor clica [Aceitar] em #0xABC
    ↓
Minhas Lojas chama:
  pallet_order::accept_order(seller_account, order_id)
    ↓
Order muda para ACCEPTED
    ↓
Notificação enviada:
  • Para Buyer: "Seu pedido foi aceito!"
  • Para Couriers próximos: "Novo pedido disponível em São Paulo"
```

---

### 5.3 Campanhas de Afiliados

**Criação de Campanha**:

```
Vendedor quer incentivar compartilhamentos
    ↓
Minhas Lojas > Campanhas > [Nova Campanha]
    ↓
Formulário:
  Produto(s): Vestido Verde, Vestido Azul
  Taxa de comissão total: 5%
  Decay por nível: 50% (nível 2 recebe metade do nível 1)
  Máx. hops: 5
  Stake mínimo do afiliado: 10 BZR
  Duração: 30 dias
    ↓
Minhas Lojas chama:
  pallet_affiliate::create_campaign(
      seller_account,
      products: [0xProd456, 0xProd789],
      rate: 500,  // 5% em basis points
      max_hops: 5,
      decay: 50,
      min_stake: 10 BZR,
      duration: 30 * DAYS
  )
    ↓
Campaign ID: #0xCampaign123
Root do DAG publicado on-chain
    ↓
Vendedor pode compartilhar link:
  bazari.app/product/0xProd456?campaign=0xCampaign123
```

**Quando Alguém Compartilha**:
```
Afiliado1 pega link e compartilha no Instagram
    ↓
Afiliado2 vê post, abre link, pega link de afiliado dele
    ↓
Afiliado2 compartilha no WhatsApp
    ↓
Comprador clica no link de Afiliado2 e compra
    ↓
Order criado com AffiliatePath: [Afiliado1, Afiliado2]
    ↓
Ao finalizar, split automático:
  Seller: 42.75 BZR (45 - 5%)
  Afiliado1 (nível 1): 1.50 BZR (3.33% do total)
  Afiliado2 (nível 2): 0.75 BZR (1.67% do total)
```

---

### 5.4 Analytics

**Dashboard de Vendedor**:

```
┌────────────────────────────────────────┐
│            Analytics                   │
├────────────────────────────────────────┤
│                                        │
│  📊 Últimos 30 dias                    │
│                                        │
│  Vendas:   47 pedidos                  │
│  Receita:  4.230 BZR (+ 18% vs. mês anterior) │
│  Ticket médio: 90 BZR                  │
│  Taxa de conversão: 12% (visitantes → compras)│
│                                        │
│  🏆 Produtos mais vendidos             │
│    1. Vestido Verde (18 vendas)        │
│    2. Bolsa Artesanal (12 vendas)      │
│    3. Camiseta Tie Dye (9 vendas)      │
│                                        │
│  ⭐ Reputação                           │
│    SellerScore: 850/1000 (↑ 20 pts)   │
│    Avaliações: 4.8/5 (127 reviews)     │
│    Taxa de disputa: 0.8% (baixa)       │
│                                        │
│  🌐 Afiliados                           │
│    Conversões por afiliados: 23 (48%)  │
│    Top afiliado: @Influencer (12 vendas)│
│                                        │
└────────────────────────────────────────┘
```

---

### 5.5 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Marketplace** | Produtos criados em Minhas Lojas aparecem no Marketplace |
| **BazChat** | Vendedor responde dúvidas via chat integrado |
| **Wallet** | Receita de vendas vai diretamente para Wallet |
| **Feed Social** | Vendedor pode postar sobre novos produtos |
| **DAO** | Vendedor pode propor mudanças (ex.: reduzir taxa) |

---

## 6. Meu Marketplace

### 6.1 Descrição

**Meu Marketplace** é o módulo que permite **vendedores criarem seu próprio storefront customizado**.

**Diferença de Minhas Lojas**:
- **Minhas Lojas**: Backend/painel de controle (gerenciamento)
- **Meu Marketplace**: Frontend/vitrine (para clientes)

**Funcionalidades**:
- Design customizado (logo, cores, banner)
- Domínio próprio (ex.: modaautoral.bazari.app ou modaautoral.com)
- Catálogo filtrado (só produtos deste vendedor)
- Página "Sobre" (história da marca, valores)
- Integração com redes sociais

---

### 6.2 Conexão com Proof of Commerce

**Meu Marketplace consome os mesmos dados on-chain que o Marketplace global**:

```
modaautoral.bazari.app
    ↓
Frontend customizado (Next.js/React)
    ↓
Consulta BazariChain:
  pallet_product::get_products_by_seller(seller_account)
    ↓
Retorna lista de produtos deste vendedor
    ↓
Renderiza com design personalizado
```

**Vantagem**:
- ✅ Vendedor tem **controle total** sobre aparência
- ✅ **Reputação on-chain** continua válida (SellerScore visível)
- ✅ Checkout usa **mesmo protocolo PoC** (não muda nada no backend)

---

### 6.3 Exemplo de Customização

**Vendedor: "Artesanato Mineiro"**

```
┌────────────────────────────────────────┐
│   🏔️ Artesanato Mineiro (Logo)        │
│   "Tradição das Montanhas"             │
├────────────────────────────────────────┤
│                                        │
│  [Banner: Foto de Minas Gerais]       │
│                                        │
│  🏺 Nossos Produtos                    │
│    ┌────┬────┬────┬────┐              │
│    │Vaso│Pot │Bol │Jar │              │
│    │R$45│R$30│R$25│R$60│              │
│    └────┴────┴────┴────┘              │
│                                        │
│  📖 Sobre Nós                          │
│    "Somos uma cooperativa de 20..."   │
│                                        │
│  ⭐ SellerScore: 920/1000              │
│    4.9/5 - 342 vendas                 │
│                                        │
│  📱 Redes Sociais                      │
│    Instagram | Facebook | WhatsApp     │
│                                        │
└────────────────────────────────────────┘
```

**Domínio Próprio**:
```
Vendedor configura DNS:
  artesanatomineiro.com → CNAME modaautoral.bazari.app

Resultado:
  Clientes acessam artesanatomineiro.com
  Mas checkout usa BazariChain
  Vendedor mantém SEO e branding próprios
```

---

### 6.4 Templates Prontos

**Para Facilitar Adoção**:

| Template | Descrição | Ideal Para |
|----------|-----------|------------|
| **Minimalista** | Limpo, foco em fotos | Fotografia, Arte |
| **Vintage** | Cores terrosas, tipografia clássica | Artesanato, Antiguidades |
| **Tech** | Dark mode, geometria | Eletrônicos, Gadgets |
| **Orgânico** | Verde, natureza | Alimentos orgânicos, Cosméticos naturais |
| **Fashion** | Grid de fotos, hover effects | Moda, Acessórios |

---

### 6.5 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Minhas Lojas** | Meu Marketplace é a "vitrine" do que é gerenciado em Minhas Lojas |
| **Marketplace** | Produtos aparecem em ambos (global e storefront próprio) |
| **Feed Social** | Posts do Feed podem linkar para Meu Marketplace |
| **BazChat** | Chat embarcado no storefront |

---

## 7. Virar Entregador

### 7.1 Descrição

**Virar Entregador** é o módulo para quem quer **oferecer serviços de entrega** e participar do PoC como Courier.

**Funcionalidades**:
- Cadastro como entregador (perfil, veículo, disponibilidade)
- Ver pedidos disponíveis (matching geográfico)
- Candidatar-se a entregas (oferta de preço e prazo)
- Rastreamento de rotas (otimização)
- Earnings (histórico de entregas e ganhos)
- CourierScore (reputação)

---

### 7.2 Conexão com Proof of Commerce

**Fluxo Completo de um Courier**:

```
João se cadastra como entregador:
  Nome: @Motoboy_JP
  Veículo: Moto
  Região: Zona Leste SP
  Disponibilidade: 8h-18h (Seg-Sex)
  Stake inicial depositado: 50 BZR
    ↓
Virar Entregador chama:
  pallet_fulfillment::register_courier(
      account: joao_account,
      profile_cid: "QmCourierProfile",
      initial_stake: 50 BZR
  )
    ↓
CourierScore inicial: 500/1000 (padrão para novos)
    ↓
João fica "disponível" no pool de couriers
```

**Matching de Pedidos**:

```
Order #0xABC criado (Produto em SP - Zona Leste)
    ↓
Sistema envia notificação push para couriers:
  • Dentro de raio de 10 km da loja
  • Com CourierScore >= 400
  • Disponíveis no horário
    ↓
João recebe notificação:
  🚚 Novo Pedido Disponível
  Retirar: Loja ModaAutoral (3 km de você)
  Entregar: Bairro X (5 km da loja)
  Frete sugerido: R$ 12
  Prazo: Até 18h hoje
  [Ver Detalhes] [Candidatar-se]
    ↓
João clica [Candidatar-se]
    ↓
Formulário:
  Minha oferta de frete: R$ 10 (pode oferecer menos para competir)
  Prazo: Entrego até 17h
  [Confirmar]
    ↓
Virar Entregador chama:
  pallet_fulfillment::apply_as_courier(
      joao_account,
      order_id: 0xABC,
      bid: 10 BZR,
      delivery_time: 17h
  )
    ↓
Seller vê candidaturas:
  • @Motoboy_JP: R$ 10, até 17h (CourierScore 820)
  • @Bike_Delivery: R$ 8, até 19h (CourierScore 650)
    ↓
Seller escolhe @Motoboy_JP (melhor reputação e prazo)
    ↓
João é notificado:
  ✅ Você foi selecionado!
  Stake de 20 BZR será travado (20% do valor do pedido de 100 BZR)
  [Aceitar] [Recusar]
    ↓
João aceita:
  pallet_fulfillment::deposit_stake(joao_account, 0xABC, 20 BZR)
    ↓
Order muda para COURIER_ASSIGNED
```

**Handoff e Delivery**:

```
João chega na loja
    ↓
BazChat abre tela de Handoff
    ↓
João e Seller tiram foto do pacote, ambos assinam
    ↓
HandoffProof ancorado on-chain
    ↓
João inicia entrega (rota otimizada exibida no app)
    ↓
João chega no endereço do Buyer
    ↓
BazChat abre tela de Delivery
    ↓
João e Buyer tiram foto, assinatura digital, ambos assinam
    ↓
DeliveryProof ancorado on-chain
    ↓
Order finaliza automaticamente:
  • João recebe 10 BZR (frete) + 20 BZR (stake devolvido)
  • CourierScore +15 pontos
  • Notificação: "Entrega concluída com sucesso! 💰 30 BZR recebidos"
```

---

### 7.3 Earnings Dashboard

```
┌────────────────────────────────────────┐
│       Meus Ganhos (João)               │
├────────────────────────────────────────┤
│                                        │
│  💰 Hoje                               │
│     8 entregas - 92 BZR ganhos         │
│                                        │
│  📊 Esta Semana                        │
│     47 entregas - 520 BZR              │
│     Média: 11 BZR/entrega              │
│                                        │
│  🏆 CourierScore: 920/1000             │
│     ↑ +35 pontos neste mês             │
│     Taxa de sucesso: 98%               │
│     Avaliações: 4.9/5 (156 entregas)   │
│                                        │
│  📍 Rotas Mais Rentáveis               │
│     1. Centro → Zona Leste (R$ 15)     │
│     2. Shopping → Bairro Y (R$ 12)     │
│                                        │
│  🎯 Meta do Mês                        │
│     200 entregas (faltam 23)           │
│     Bônus se alcançar: +50 BZR         │
│                                        │
└────────────────────────────────────────┘
```

---

### 7.4 Gamificação

**Ranks de Courier**:

| CourierScore | Rank | Benefícios |
|--------------|------|------------|
| 0-200 | Novato | Stake alto, pedidos limitados |
| 200-500 | Bronze | Stake médio, acesso a mais pedidos |
| 500-750 | Prata | Stake reduzido, prioridade em matching |
| 750-900 | Ouro | Stake baixo, bônus por entrega, destaque |
| 900-1000 | Diamante | Stake mínimo, rotas premium, bônus 2x |

**Conquistas**:
- 🏅 "Primeira Entrega" (+10 pontos)
- 🚀 "100 Entregas" (+50 pontos + badge)
- ⚡ "Entrega Relâmpago" (< 1h) (+20 pontos)
- 🌟 "Sem Disputas (100 entregas)" (+100 pontos)

---

### 7.5 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Marketplace** | Couriers veem pedidos disponíveis no Marketplace |
| **BazChat** | Coordenação de retirada/entrega via chat |
| **Wallet** | Ganhos vão direto para Wallet |
| **Feed Social** | Courier pode compartilhar conquistas |
| **DAO** | Courier pode votar em propostas (ex.: mudar taxa de frete) |

---

## 8. P2P (Peer-to-Peer Exchange)

### 8.1 Descrição

**P2P Exchange** é o módulo para **comprar e vender BZR por moeda fiat** (Real, Dólar, etc.) sem intermediários centralizados.

**Funcionalidades**:
- Criar ordem de compra/venda (P2P order book)
- Matching automático (melhores ofertas)
- Escrow automático (BZR fica travado até confirmação de pagamento fiat)
- Métodos de pagamento (PIX, TED, PayPal, etc.)
- Reputação de traders (P2PScore)
- Resolução de disputas (júri, se necessário)

---

### 8.2 Conexão com Proof of Commerce

**P2P usa a mesma lógica de Escrow e Attestations do PoC**:

```
Alice quer vender 100 BZR por R$ 500 (taxa: 5 BRL/BZR)
    ↓
Alice cria ordem:
  pallet_p2p::create_sell_order(
      alice_account,
      amount: 100 BZR,
      fiat_currency: BRL,
      rate: 5,
      payment_methods: [PIX, TED],
      escrow: 100 BZR  // travado
  )
    ↓
Bob quer comprar BZR e vê ordem de Alice
    ↓
Bob aceita:
  pallet_p2p::accept_order(bob_account, order_id)
    ↓
Sistema mostra instruções:
  Bob, transfira R$ 500 via PIX para:
  Chave PIX de Alice: alice@email.com
  Ordem: #0xP2P123
    ↓
Bob faz PIX e clica [Confirmei Pagamento]
    ↓
Alice recebe notificação:
  "Bob afirma ter enviado R$ 500. Confirme o recebimento."
    ↓
Alice checa conta bancária, vê R$ 500 chegando
    ↓
Alice clica [Confirmo Recebimento]
    ↓
Sistema libera escrow:
  • Bob recebe 100 BZR
  • Alice recebe stake de volta + reputação +5
  • Evento: P2PTradeCompleted
```

**Se Houver Disputa**:
```
Alice não confirma recebimento (mesmo tendo recebido R$ 500)
    ↓
Bob espera 24h (timeout)
    ↓
Bob abre disputa:
  pallet_p2p::open_dispute(bob_account, order_id, evidence: "comprovante_pix.pdf")
    ↓
Júri analisa:
  • Comprovante PIX mostra transferência para chave de Alice
  • Timestamp correto
  • Valor correto (R$ 500)
    ↓
Ruling: Release para Bob
    ↓
Alice perde reputação (-50 pts) + possível slashing
```

---

### 8.3 Order Book P2P

**Tela de Compra de BZR**:

```
┌────────────────────────────────────────┐
│         Comprar BZR (P2P)              │
├────────────────────────────────────────┤
│                                        │
│  Eu quero comprar: [____] BZR          │
│  Pagando em: [▼ BRL (Real)]           │
│                                        │
│  📊 Melhores Ofertas                   │
│  ┌──────────────────────────────────┐ │
│  │ Vendedor      │Taxa│Limite│Score│ │
│  ├──────────────────────────────────┤ │
│  │ @Alice        │5.0 │100BZR│890  │ │
│  │ Métodos: PIX, TED                │ │
│  │ [Comprar]                         │ │
│  ├──────────────────────────────────┤ │
│  │ @Carlos       │5.1 │500BZR│920  │ │
│  │ Métodos: PIX                     │ │
│  │ [Comprar]                         │ │
│  ├──────────────────────────────────┤ │
│  │ @Dana         │5.2 │50BZR │750  │ │
│  │ Métodos: TED, PayPal             │ │
│  │ [Comprar]                         │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Ou crie sua própria ordem:            │
│  [Criar Ordem de Compra]               │
│                                        │
└────────────────────────────────────────┘
```

---

### 8.4 Reputação P2P

**P2PScore** é separado de SellerScore/CourierScore, mas usa mesma lógica:

```rust
struct P2PScore {
    trades_completed: u32,      // +10 por trade
    avg_confirmation_time: u64, // mais rápido = mais pontos
    disputes_opened_against: u32, // -50 por disputa perdida
    volume_traded: Balance,     // +1 ponto por 1000 BZR negociados
}
```

**Benefícios de Score Alto**:
- Limites maiores (traders novatos têm limite de 100 BZR/dia)
- Taxas menores (DAO pode dar desconto para high-volume traders)
- Destaque no order book

---

### 8.5 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Wallet** | BZR comprado via P2P vai direto para Wallet |
| **Marketplace** | Usuário compra BZR via P2P e usa no Marketplace |
| **BazChat** | Chat para coordenar pagamento fiat |
| **DAO** | DAO define parâmetros (fees do P2P, timeouts) |

---

## 9. DAO (Governança)

### 9.1 Descrição

**DAO** (Decentralized Autonomous Organization) é o módulo de **governança comunitária**. Token holders de BZR decidem o futuro do protocolo.

**Funcionalidades**:
- Propor mudanças (parâmetros, features, treasury)
- Votar em propostas (peso proporcional ao stake)
- Ver propostas ativas/históricas
- Delegar votos (liquid democracy - Fase 2)
- Executar propostas aprovadas (automático via runtime)

---

### 9.2 Conexão com Proof of Commerce

**DAO NÃO decide pedidos individuais** (isso seria centralização). DAO decide **regras gerais**:

**Exemplos de Propostas**:

| Proposta | Descrição | Parâmetro On-Chain |
|----------|-----------|-------------------|
| "Reduzir taxa DAO de 2% para 1.5%" | Menos custo para vendedores | `FeeConfig::dao_fee_percent` |
| "Aumentar timeout de delivery de 7 para 10 dias" | Mais flexibilidade para entregas longas | `OrderConfig::delivery_timeout` |
| "Adicionar nova categoria: NFTs" | Expandir marketplace | `pallet_product::categories` |
| "Alocar 10.000 BZR do Tesouro para marketing" | Crescimento do protocolo | `Treasury::spend()` |
| "Upgrade de runtime (adicionar ZK-PoD)" | Nova funcionalidade | `System::set_code()` |

---

### 9.3 Fluxo de Proposta

```
Usuário tem ideia: "Vamos reduzir taxa para atrair mais vendedores"
    ↓
Cria proposta:
  pallet_dao::propose(
      proposer: user_account,
      title: "Reduzir taxa DAO para 1.5%",
      description: "Argumentação...",
      proposed_change: SetFeeConfig { dao_fee_percent: 150 },  // 1.5% em basis points
      deposit: 100 BZR  // stake para evitar spam
  )
    ↓
Proposta entra em período de discussão (7 dias):
  • Comunidade debate no Forum (off-chain)
  • Proposer pode editar
    ↓
Após 7 dias, votação inicia (duração: 14 dias):
  pallet_dao::vote(
      voter: alice_account,
      proposal_id,
      vote: Aye,
      voting_power: 500 BZR  // Alice tem 500 BZR staked
  )
    ↓
Todos token holders com stake votam (Aye/Nay)
    ↓
Fim da votação:
  Total Aye: 15.000 BZR
  Total Nay: 3.000 BZR
  Quórum: 10% do supply (atingido)
  Supermaioria: 2/3 (15k / 18k = 83% > 66% ✅)
    ↓
Proposta APROVADA
    ↓
Execução automática (após timelock de 48h):
  FeeConfig::dao_fee_percent = 150
    ↓
Notificação para todos:
  "✅ Proposta #42 executada! Taxa DAO agora é 1.5%"
```

---

### 9.4 Tipos de Propostas

| Tipo | Quórum | Supermaioria | Timelock | Exemplos |
|------|--------|--------------|----------|----------|
| **Paramétrica** | 10% | 2/3 | 48h | Taxas, timeouts, stakes |
| **Treasury** | 15% | 2/3 | 7 dias | Gastos do tesouro |
| **Upgrade** | 20% | 3/4 | 14 dias | Mudança de runtime (código) |
| **Emergencial** | 5% | 3/4 | 0h | Pausar protocolo (só em catástrofe) |

---

### 9.5 Delegação (Liquid Democracy - Fase 2)

**Problema**: Nem todo token holder tem tempo/conhecimento para votar.

**Solução**:
```rust
// Alice delega seus votos para Bob (especialista em economia)
pallet_dao::delegate(
    alice_account,
    delegate_to: bob_account,
    scope: Economics  // só propostas econômicas
);

// Quando houver proposta econômica:
// Voto de Bob conta como 500 (stake de Bob) + 300 (delegado por Alice)

// Alice pode remover delegação a qualquer momento
// Alice pode votar diretamente (override da delegação)
```

---

### 9.6 Interface DAO

**Tela de Propostas**:

```
┌────────────────────────────────────────┐
│         Governança Bazari DAO          │
├────────────────────────────────────────┤
│                                        │
│  🗳️ Propostas Ativas                   │
│                                        │
│  #42: Reduzir taxa DAO para 1.5%       │
│    Status: 🟢 Votação (faltam 8 dias)  │
│    Aye: 15.000 BZR (83%)               │
│    Nay: 3.000 BZR (17%)                │
│    [Votar Sim] [Votar Não] [Detalhes] │
│                                        │
│  #43: Adicionar categoria NFTs         │
│    Status: 🟡 Discussão (faltam 3 dias)│
│    [Ver Discussão] [Comentar]          │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  ✅ Propostas Aprovadas Recentes       │
│    #40: Aumentar timeout delivery      │
│    #38: Marketing budget 10k BZR       │
│                                        │
│  ❌ Propostas Rejeitadas               │
│    #41: Remover taxa de afiliados      │
│                                        │
│  [Criar Nova Proposta]                 │
│                                        │
└────────────────────────────────────────┘
```

---

### 9.7 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Todos** | DAO define parâmetros que afetam todos os módulos |
| **Wallet** | Votação requer stake de BZR (travado durante votação) |
| **Feed Social** | Propostas podem ser compartilhadas/discutidas no Feed |
| **BazChat** | Chat de discussão por proposta |

---

## 10. Feed Social

### 10.1 Descrição

**Feed Social** é o módulo de **rede social descentralizada** integrado ao ecossistema Bazari. Inspiração: Twitter/Instagram, mas com identidade vinculada a reputação on-chain.

**Funcionalidades**:
- Postar atualizações (texto, fotos, vídeos)
- Compartilhar produtos (links para Marketplace)
- Curtir/comentar/repost
- Seguir vendedores/entregadores/afiliados
- Feed algorítmico + cronológico
- Hashtags (#artesanato, #modaSustentavel)

---

### 10.2 Conexão com Proof of Commerce

**Feed Social é a Camada de Descoberta Orgânica**:

```
Vendedor @ModaAutoral posta:
  "🎉 Novo produto! Vestido sustentável feito com tecido reciclado.
   Compre aqui: bazari.app/product/0xVest123
   #ModaSustentavel #Bazari"
    ↓
Post inclui:
  • Foto do vestido
  • Link para produto (deeplink para Marketplace)
  • SellerScore visível (850/1000) - badge de confiança
    ↓
Seguidores veem no feed:
  • @Maria curte e compartilha
  • @João comenta: "Lindo! Qual o prazo de entrega?"
  • @Influencer repostou (tem 50k seguidores)
    ↓
Cliques no link vão para Marketplace com affiliate_id do @Influencer
    ↓
Se alguém comprar, @Influencer recebe comissão automaticamente
```

**Badges de Reputação**:
```
@ModaAutoral ⭐ Seller Gold (SellerScore 850)
@Motoboy_JP 🚚 Courier Diamante (CourierScore 920)
@Influencer 🔗 Top Afiliado (AffiliateScore 780)
```

---

### 10.3 Algoritmo de Feed

**Transparente e Customizável**:

```rust
// Usuário pode escolher:
enum FeedAlgorithm {
    Chronological,   // Mais recente primeiro
    Reputation,      // Posts de contas com alta reputação
    Engagement,      // Mais curtidas/comentários
    Personalized,    // Baseado em quem você segue + interesses
}

// Score de cada post:
fn calculate_post_score(post: &Post, viewer: &AccountId) -> f64 {
    let author_rep = get_total_score(post.author) as f64 / 1000.0;
    let engagement = (post.likes + post.comments * 2 + post.reposts * 3) as f64;
    let recency = 1.0 / (1.0 + (now() - post.created_at) as f64 / HOUR);
    let follows_author = viewer.follows(post.author) as u8 as f64;

    author_rep * 0.3
        + engagement.ln() * 0.3
        + recency * 0.2
        + follows_author * 0.2
}
```

---

### 10.4 Moderação Comunitária

**Sem Censura Central, Mas Com Controle de Spam**:

```
Post com spam/scam pode ser reportado:
  10+ reports de contas com score > 500
      ↓
  Post entra em revisão comunitária (similar a júri)
      ↓
  5 moderadores aleatórios (VRF) analisam
      ↓
  Se 3/5 concordam que é spam:
      Post é "downranked" (não deletado, mas fica invisível no feed principal)
      Autor perde -20 pontos de reputação
```

---

### 10.5 Monetização Nativa

**Criadores de Conteúdo Podem Ganhar BZR**:

**A) Afiliação Embutida**:
```
Todo link de produto no Feed Social automaticamente vira link de afiliado
    ↓
Se alguém comprar via seu link:
  Você recebe comissão (configurada pelo vendedor)
```

**B) Tips (Gorjetas)**:
```
Usuário gostou do post:
  [❤️ Curtir]  [💬 Comentar]  [💰 Dar Tip]
      ↓
  Modal: Enviar quantos BZR? [____]
      ↓
  Transferência direta para wallet do autor
```

**C) Posts Patrocinados (Opcional)**:
```
Vendedor pode "impulsionar" post:
  Paga 10 BZR para aumentar alcance
      ↓
  DAO recebe taxa de 10%
  90% vai para pool de "Creators Fund" (distribuído para top criadores)
```

---

### 10.6 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Marketplace** | Posts podem linkar produtos diretamente |
| **Minhas Lojas** | Vendedor posta novos produtos automaticamente |
| **Virar Entregador** | Courier posta conquistas ("100 entregas! 🏆") |
| **DAO** | Propostas DAO podem ser discutidas no Feed |
| **Perfil Social** | Posts aparecem no perfil do autor |

---

## 11. Perfil Social

### 11.1 Descrição

**Perfil Social** é a página pública de cada usuário, agregando **reputação on-chain + atividade social**.

**Funcionalidades**:
- Ver reputações (SellerScore, CourierScore, BuyerScore)
- Histórico de atividades (vendas, entregas, compras) - anonimizado ou público (escolha do usuário)
- Posts do Feed Social
- Produtos à venda (se for vendedor)
- Avaliações recebidas
- Badges/Conquistas

---

### 11.2 Conexão com Proof of Commerce

**Perfil é a "Carteira de Identidade On-Chain"**:

```
Perfil: @ModaAutoral (5SellerABC...)

┌────────────────────────────────────────┐
│         @ModaAutoral                   │
│  "Moda sustentável e artesanal"        │
├────────────────────────────────────────┤
│                                        │
│  📊 Reputações                         │
│    ⭐ Seller Score: 850/1000 (Gold)    │
│    🏆 342 vendas concluídas            │
│    ⚡ Membro desde: Jan/2025           │
│                                        │
│  🎖️ Badges                             │
│    ✅ Verificado pela Cooperativa X    │
│    🌱 Carbono Neutro (entregas eco)    │
│    💎 Top 1% Vendedores                │
│                                        │
│  ⭐ Avaliações (4.9/5)                 │
│    "Produto excelente, entrega rápida!"│
│    "Atendimento impecável"             │
│    [Ver todas]                         │
│                                        │
│  🏪 Produtos à Venda (8)               │
│    [Ver Loja]                          │
│                                        │
│  📰 Posts Recentes                     │
│    [Ver todos no Feed]                 │
│                                        │
│  📈 Estatísticas Públicas              │
│    Valor médio de venda: 87 BZR        │
│    Taxa de resposta: 95%               │
│    Tempo médio de envio: 1.2 dias      │
│                                        │
└────────────────────────────────────────┘
```

---

### 11.3 Privacidade Configurável

**Usuário Controla o Que é Público**:

```rust
struct PrivacySettings {
    show_total_sales: bool,        // Mostrar volume total de vendas?
    show_buyer_history: bool,      // Mostrar histórico de compras? (padrão: privado)
    show_location_region: bool,    // Mostrar região (não endereço)?
    show_social_links: bool,       // Instagram, Twitter, etc.?
    allow_direct_messages: enum {  // Quem pode mandar DM?
        Everyone,
        FollowersOnly,
        RepScoreAbove(u32),        // Só contas com score > X
        None,
    }
}
```

---

### 11.4 Verificação de Identidade (Opcional)

**DID/VC (Decentralized Identifiers / Verifiable Credentials)**:

```
Vendedor pode ter verificações:
  ✅ CPF/CNPJ verificado por Autoridade X (VC emitido)
  ✅ Endereço físico confirmado (entregador visitou)
  ✅ Membro de cooperativa (badge emitido pela coop)

Comprador vê:
  @ModaAutoral ✅ (3 verificações)
      ↓
  Clica para ver detalhes:
    • CPF verificado por Brasil.ID (DID)
    • Endereço em São Paulo confirmado
    • Membro da Cooperativa Artesanato MG
```

**Benefícios**:
- Aumenta confiança (mais vendas)
- Permite acesso a features premium (ex.: limites maiores)
- Mas continua opcional (preserva privacidade de quem quer anonimato)

---

### 11.5 Integração com Outros Módulos

| Módulo | Integração |
|--------|-----------|
| **Marketplace** | Perfil do vendedor é linkado na página do produto |
| **Feed Social** | Posts do usuário aparecem no perfil |
| **BazChat** | Botão "Enviar Mensagem" abre chat |
| **Minhas Lojas** | Produtos do vendedor listados no perfil |
| **Virar Entregador** | CourierScore e estatísticas de entrega visíveis |
| **DAO** | Histórico de votação e propostas criadas |

---

## 12. Diagrama de Interconexão

### 12.1 Mapa Completo do Ecossistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     ECOSSISTEMA BAZARI                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ MARKETPLACE  │◄───┤   BAZCHAT    │───►│    WALLET    │     │
│  │              │    │              │    │              │     │
│  │ • Busca      │    │ • Chat P2P   │    │ • Saldos     │     │
│  │ • Produtos   │    │ • Co-assinar │    │ • Transações │     │
│  │ • Checkout   │    │ • Notifs     │    │ • Stakes     │     │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│         │                   │                   │              │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌─────────────────────────────────────────────────┐          │
│  │          BAZARICHAIN (Substrate)                │          │
│  │  ┌───────────────────────────────────────────┐ │          │
│  │  │ Pallets: Order, Escrow, Attestation,     │ │          │
│  │  │ Fulfillment, Reputation, DAO, P2P        │ │          │
│  │  └───────────────────────────────────────────┘ │          │
│  └─────────────────────────────────────────────────┘          │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │MINHAS LOJAS  │    │MEU MARKETPLACE│   │VIRAR ENTREGADOR│   │
│  │              │    │              │    │              │     │
│  │ • Produtos   │───►│ • Storefront │    │ • Matching   │     │
│  │ • Pedidos    │    │ • Custom DNS │    │ • Earnings   │     │
│  │ • Analytics  │    │ • Branding   │    │ • Score      │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                                        │              │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌──────────────┐                        ┌──────────────┐     │
│  │  FEED SOCIAL │◄──────────────────────►│PERFIL SOCIAL │     │
│  │              │                        │              │     │
│  │ • Posts      │                        │ • Reputação  │     │
│  │ • Hashtags   │                        │ • Badges     │     │
│  │ • Afiliação  │                        │ • Histórico  │     │
│  └──────┬───────┘                        └──────┬───────┘     │
│         │                                        │              │
│         └────────────┬───────────────────────────┘              │
│                      ▼                                          │
│               ┌──────────────┐                                 │
│               │      DAO     │                                 │
│               │              │                                 │
│               │ • Propostas  │                                 │
│               │ • Votação    │                                 │
│               │ • Execução   │                                 │
│               └──────────────┘                                 │
│                      ▲                                          │
│                      │                                          │
│               ┌──────────────┐                                 │
│               │     P2P      │                                 │
│               │              │                                 │
│               │ • BZR↔Fiat   │                                 │
│               │ • Order Book │                                 │
│               │ • Escrow     │                                 │
│               └──────────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

INFRAESTRUTURA SUBJACENTE:
├─ IPFS (armazenamento de mídias)
├─ libp2p (mensageria P2P)
├─ Substrate (blockchain framework)
└─ PostgreSQL/MongoDB (indexação off-chain para busca rápida)
```

---

### 12.2 Fluxo Completo de Valor

```
USUÁRIO COMPRA BZR (P2P)
    ↓
BUSCA PRODUTO (Marketplace)
    ↓
COMPRA (Wallet cria Order + Escrow)
    ↓
VENDEDOR ACEITA (Minhas Lojas)
    ↓
ENTREGADOR ASSUME (Virar Entregador)
    ↓
HANDOFF (BazChat: Seller + Courier)
    ↓
DELIVERY (BazChat: Courier + Buyer)
    ↓
FINALIZE (PoCEngine: Split automático)
    ↓
AVALIAÇÃO (Perfil Social: Buyer avalia)
    ↓
COMPARTILHAMENTO (Feed Social: Buyer posta foto do produto)
    ↓
VIRALIZAÇÃO (Afiliados compartilham)
    ↓
GOVERNANÇA (DAO: Comunidade ajusta taxas)
    ↓
CICLO REINICIA COM MAIS USUÁRIOS
```

---

## Conclusão

O ecossistema Bazari é **modular, interconectado e governado pela comunidade**. Cada módulo:

- ✅ Serve um propósito claro
- ✅ Se integra naturalmente com outros
- ✅ Consulta o mesmo estado on-chain (BazariChain)
- ✅ Pode evoluir independentemente (via DAO)

**Próximos passos**: Entender a arquitetura técnica detalhada e o roadmap de implementação.

---

## Próximos Documentos

- **[05-arquitetura-implementacao.md](./05-arquitetura-implementacao.md)**: Arquitetura técnica completa, pallets Substrate, schemas
- **[06-roadmap-evolucao.md](./06-roadmap-evolucao.md)**: Roadmap de 3 fases e evolução futura (ZK-PoD, BLS, IA)

---

**Bazari** — Um ecossistema onde cada módulo fortalece os outros, criando um efeito de rede imparável.
