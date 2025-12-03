# App Manifest Specification

**Versão:** 1.0.0
**Status:** Draft
**Data:** 2024-12-03

---

## Visão Geral

O App Manifest é um arquivo JSON que descreve um app no ecossistema Bazari. Ele contém metadados, permissões, assets, e configurações necessárias para publicação na App Store.

---

## Schema

### Arquivo: `bazari.manifest.json`

```json
{
  "$schema": "https://bazari.io/schemas/app-manifest.v1.json",

  "id": "com.exemplo.meu-app",
  "name": "Meu App",
  "slug": "meu-app",
  "version": "1.0.0",
  "bazariSdkVersion": "^0.1.0",

  "author": {
    "name": "Nome do Desenvolvedor",
    "email": "dev@exemplo.com",
    "url": "https://exemplo.com",
    "walletAddress": "5GrwvaEF..."
  },

  "description": {
    "short": "Descrição curta (max 80 chars)",
    "long": "Descrição completa com markdown...",
    "whatsNew": "### v1.0.0\n- Feature 1\n- Feature 2"
  },

  "category": "tools",
  "tags": ["tag1", "tag2"],

  "assets": {
    "icon": "./public/icon.svg",
    "iconSmall": "./public/icon-small.svg",
    "screenshots": ["./public/screenshots/1.png"],
    "preview": "./public/preview.mp4",
    "banner": "./public/banner.png"
  },

  "permissions": [
    {
      "id": "user.profile.read",
      "reason": "Para exibir seu nome",
      "optional": false
    }
  ],

  "hosting": {
    "type": "ipfs",
    "fallback": "https://app.exemplo.com"
  },

  "requirements": {
    "minBazariVersion": "3.0.0",
    "requiredRoles": [],
    "regions": []
  },

  "monetization": {
    "model": "free",
    "price": null,
    "currency": "BZR",
    "inAppPurchases": []
  },

  "support": {
    "email": "suporte@exemplo.com",
    "discord": "https://discord.gg/xxx",
    "docs": "https://docs.exemplo.com"
  },

  "privacy": {
    "policy": "https://exemplo.com/privacy",
    "dataCollected": [],
    "dataShared": false
  }
}
```

---

## Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Identificador único no formato reverse-domain |
| `name` | string | Nome do app (1-50 chars) |
| `slug` | string | Slug para URL (lowercase, hyphens) |
| `version` | string | Versão semver (X.Y.Z) |
| `description.short` | string | Descrição curta (max 80 chars) |
| `category` | string | Categoria do app |
| `assets.icon` | string | Caminho para ícone (512x512) |
| `permissions` | array | Lista de permissões necessárias |
| `author.name` | string | Nome do desenvolvedor |
| `author.email` | string | Email de contato |

---

## Campos Opcionais

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `bazariSdkVersion` | string | "latest" | Versão do SDK |
| `description.long` | string | - | Descrição completa (markdown) |
| `description.whatsNew` | string | - | Changelog da versão |
| `tags` | string[] | [] | Tags para busca |
| `assets.screenshots` | string[] | [] | Screenshots para store |
| `assets.preview` | string | - | Vídeo de preview |
| `hosting.type` | string | "ipfs" | Tipo de hospedagem |
| `hosting.fallback` | string | - | URL de fallback |
| `monetization` | object | free | Configuração de monetização |
| `requirements.minBazariVersion` | string | - | Versão mínima do Bazari |
| `requirements.requiredRoles` | string[] | [] | Roles necessárias |
| `privacy.policy` | string | - | URL da política de privacidade |

---

## Categorias Válidas

```typescript
type AppCategory =
  | 'finance'       // Wallet, P2P, etc
  | 'social'        // Feed, Chat, etc
  | 'commerce'      // Marketplace, Stores
  | 'tools'         // Utilities
  | 'governance'    // DAO, Voting
  | 'entertainment' // Games, VR
```

---

## Permissões Disponíveis

### User

| ID | Descrição | Risco |
|----|-----------|-------|
| `user.profile.read` | Ler nome, avatar, handle | Baixo |
| `user.profile.write` | Modificar perfil | Médio |

### Wallet

| ID | Descrição | Risco |
|----|-----------|-------|
| `wallet.balance.read` | Ver saldo | Baixo |
| `wallet.history.read` | Ver histórico | Médio |
| `wallet.transfer.request` | Solicitar transferência | Alto |

### Commerce

| ID | Descrição | Risco |
|----|-----------|-------|
| `products.read` | Listar produtos | Baixo |
| `products.write` | Gerenciar produtos | Médio |
| `orders.read` | Ver pedidos | Médio |
| `orders.write` | Gerenciar pedidos | Alto |

### Social

| ID | Descrição | Risco |
|----|-----------|-------|
| `feed.read` | Ler feed | Baixo |
| `feed.write` | Postar | Alto |
| `messages.read` | Ler mensagens | Alto |
| `messages.write` | Enviar mensagens | Alto |

### System

| ID | Descrição | Risco |
|----|-----------|-------|
| `notifications.send` | Enviar notificações | Baixo |
| `storage.app` | Armazenar dados | Baixo |
| `camera` | Acessar câmera | Médio |
| `location` | Acessar GPS | Médio |

### Blockchain

| ID | Descrição | Risco |
|----|-----------|-------|
| `blockchain.read` | Consultar blockchain | Baixo |
| `blockchain.sign` | Assinar transações | Crítico |

---

## Modelos de Monetização

### Free
```json
{
  "monetization": {
    "model": "free"
  }
}
```

### Paid
```json
{
  "monetization": {
    "model": "paid",
    "price": 50,
    "currency": "BZR",
    "trial": {
      "enabled": true,
      "days": 7
    }
  }
}
```

### Freemium
```json
{
  "monetization": {
    "model": "freemium",
    "inAppPurchases": [
      {
        "id": "premium",
        "name": "Premium",
        "price": 20,
        "type": "subscription",
        "period": "monthly"
      }
    ]
  }
}
```

---

## Assets

### Ícone Principal
- **Formato:** SVG ou PNG
- **Tamanho:** 512x512 pixels
- **Background:** Transparente ou com cor
- **Uso:** App Store, Dashboard

### Ícone Pequeno
- **Formato:** SVG ou PNG
- **Tamanho:** 64x64 pixels
- **Uso:** Listas, notificações

### Screenshots
- **Formato:** PNG ou JPG
- **Tamanho:** 1280x720 ou 720x1280
- **Quantidade:** 1-5 screenshots
- **Uso:** Página do app na Store

### Preview Video
- **Formato:** MP4
- **Duração:** Máximo 30 segundos
- **Tamanho:** Máximo 10MB

---

## Validação

O CLI valida o manifest antes de publicar:

```bash
bazari validate

# Checklist:
# ✓ id: formato válido
# ✓ version: semver válido
# ✓ description.short: <= 80 chars
# ✓ category: valor válido
# ✓ assets.icon: arquivo existe
# ✓ permissions: IDs válidos
# ⚠️ screenshots: apenas 1 (recomendado 3-5)
```

---

## Exemplo Completo

```json
{
  "$schema": "https://bazari.io/schemas/app-manifest.v1.json",

  "id": "com.bazari.analytics-pro",
  "name": "Analytics Pro",
  "slug": "analytics-pro",
  "version": "1.2.0",
  "bazariSdkVersion": "^0.1.0",

  "author": {
    "name": "Bazari Labs",
    "email": "apps@bazari.io",
    "url": "https://bazari.io",
    "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
  },

  "description": {
    "short": "Métricas avançadas para seu perfil e vendas",
    "long": "# Analytics Pro\n\nDashboard completo com:\n- Métricas de engajamento\n- Análise de vendas\n- Insights de crescimento\n- Exportação de relatórios",
    "whatsNew": "### v1.2.0\n- Novo gráfico de funil\n- Exportação para CSV\n- Correção de bugs"
  },

  "category": "tools",
  "tags": ["analytics", "métricas", "dashboard", "insights"],

  "assets": {
    "icon": "./public/icon.svg",
    "iconSmall": "./public/icon-64.svg",
    "screenshots": [
      "./public/screenshots/dashboard.png",
      "./public/screenshots/reports.png",
      "./public/screenshots/charts.png"
    ],
    "preview": "./public/preview.mp4",
    "banner": "./public/banner.png"
  },

  "permissions": [
    {
      "id": "user.profile.read",
      "reason": "Identificar seu perfil no dashboard"
    },
    {
      "id": "feed.read",
      "reason": "Calcular métricas de engajamento"
    },
    {
      "id": "orders.read",
      "reason": "Analisar suas vendas",
      "optional": true
    },
    {
      "id": "storage.app",
      "reason": "Salvar preferências localmente"
    }
  ],

  "hosting": {
    "type": "ipfs",
    "fallback": "https://analytics.bazari.io"
  },

  "requirements": {
    "minBazariVersion": "3.0.0",
    "requiredRoles": [],
    "regions": ["BR", "PT", "US"]
  },

  "monetization": {
    "model": "freemium",
    "inAppPurchases": [
      {
        "id": "pro_monthly",
        "name": "Pro Mensal",
        "description": "Acesso a todas as métricas avançadas",
        "price": 25,
        "currency": "BZR",
        "type": "subscription",
        "period": "monthly"
      },
      {
        "id": "pro_yearly",
        "name": "Pro Anual",
        "description": "Economize 20% com o plano anual",
        "price": 240,
        "currency": "BZR",
        "type": "subscription",
        "period": "yearly"
      }
    ]
  },

  "support": {
    "email": "suporte@bazari.io",
    "discord": "https://discord.gg/bazari",
    "docs": "https://docs.bazari.io/apps/analytics-pro"
  },

  "privacy": {
    "policy": "https://bazari.io/privacy",
    "dataCollected": ["usage_analytics", "crash_reports"],
    "dataShared": false
  }
}
```

---

**Documento:** APP-MANIFEST-SPEC.md
**Versão:** 1.0.0
