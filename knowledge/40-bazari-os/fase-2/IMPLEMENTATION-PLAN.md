# Plano de Implementação - BazariOS Fase 2

**Objetivo:** Transformar Bazari em plataforma aberta para desenvolvedores e lojistas
**Modelo:** Híbrido (Plugins Low-Code + Apps Pro-Code)

---

## Instruções para Claude Code

### Antes de cada implementação:

1. **Ler** o documento completo indicado
2. **Identificar** todas as tasks/arquivos a criar/modificar
3. **Verificar** dependências (migrations, packages, etc.)
4. **Implementar** na ordem do documento
5. **Testar** cada parte antes de prosseguir
6. **Commitar** ao finalizar cada task major

### Regras:

- Não pular etapas
- Seguir exatamente o que está documentado
- Perguntar se algo estiver ambíguo
- Usar TODO list para tracking de progresso
- Commits descritivos: `feat(plugins): add PluginDefinition model`

---

## Sprint 1: Sistema de Plugins (P0) - Prioridade Máxima

> **Público:** Lojistas (90% dos usuários)
> **Impacto:** Altíssimo

### 1.1 Plugin System Base

**Documento:** `07-PLUGIN-SYSTEM.md`

**Prompt para Claude Code:**
```
Implementar o sistema base de plugins conforme documentado em:
knowledge/40-bazari-os/fase-2/07-PLUGIN-SYSTEM.md

Tasks:
1. Adicionar models no Prisma (PluginDefinition, PluginInstance, enums)
2. Rodar prisma migrate dev --name add_plugin_system
3. Criar apps/api/src/routes/plugins.ts com todos os endpoints
4. Criar apps/api/src/services/pluginHooks.ts
5. Criar apps/web/src/components/plugins/PluginRenderer.tsx
6. Criar apps/web/src/components/plugins/widgets/LoyaltyWidget.tsx
7. Integrar PluginRenderer na página da loja (StorePublicPage)
8. Testar endpoints via curl/Postman
9. Commitar: "feat(plugins): implement plugin system base"
```

**Checklist:**
- [ ] Models Prisma criados
- [ ] Migration executada
- [ ] Endpoints CRUD funcionando
- [ ] PluginRenderer renderizando
- [ ] Hook onPurchase disparando
- [ ] Commit feito

**Verificação:**
```bash
# Testar endpoint de listagem
curl http://localhost:3000/api/plugins

# Testar health
curl http://localhost:3000/api/health
```

---

### 1.2 Plugin Templates

**Documento:** `08-PLUGIN-TEMPLATES.md`

**Prompt para Claude Code:**
```
Implementar os templates de plugins oficiais conforme documentado em:
knowledge/40-bazari-os/fase-2/08-PLUGIN-TEMPLATES.md

Tasks:
1. Criar widgets React:
   - apps/web/src/components/plugins/widgets/LoyaltyRedeemBox.tsx
   - apps/web/src/components/plugins/widgets/CashbackBadge.tsx
   - apps/web/src/components/plugins/widgets/CashbackPreview.tsx
   - apps/web/src/components/plugins/widgets/CouponBanner.tsx
   - apps/web/src/components/plugins/widgets/CouponInput.tsx
   - apps/web/src/components/plugins/widgets/DeliveryTracker.tsx
2. Criar hooks de processamento:
   - apps/api/src/services/plugins/loyaltyHooks.ts
   - apps/api/src/services/plugins/cashbackHooks.ts
3. Criar seed de plugins oficiais:
   - apps/api/prisma/seeds/plugins.ts
4. Adicionar model LoyaltyPoints e PendingCashback no Prisma
5. Rodar migration
6. Executar seed
7. Commitar: "feat(plugins): add official plugin templates"
```

**Checklist:**
- [ ] 5 widgets criados (Loyalty, Cashback, Coupons, Delivery, Reviews)
- [ ] Hooks implementados
- [ ] Seed criado e executado
- [ ] 5 plugins oficiais no banco
- [ ] Commit feito

**Verificação:**
```bash
# Verificar plugins no banco
curl http://localhost:3000/api/plugins

# Deve retornar: loyalty-program, cashback, coupons, delivery-tracking, reviews
```

---

### 1.3 Seller Plugins UI

**Documento:** `09-SELLER-PLUGINS-UI.md`

**Prompt para Claude Code:**
```
Implementar a interface de plugins para lojistas conforme documentado em:
knowledge/40-bazari-os/fase-2/09-SELLER-PLUGINS-UI.md

Tasks:
1. Criar páginas:
   - apps/web/src/pages/seller/SellerPluginsPage.tsx (lista instalados)
   - apps/web/src/pages/seller/PluginCatalogPage.tsx (catálogo)
2. Criar componentes:
   - apps/web/src/components/plugins/PluginConfigModal.tsx
   - apps/web/src/components/plugins/JsonSchemaForm.tsx
   - apps/web/src/components/plugins/BrandingForm.tsx
3. Adicionar rotas no React Router
4. Adicionar link no menu do seller dashboard
5. Testar fluxo completo: instalar, configurar, ativar/desativar, desinstalar
6. Commitar: "feat(plugins): add seller plugins management UI"
```

**Checklist:**
- [ ] Página de plugins instalados funcionando
- [ ] Catálogo de plugins funcionando
- [ ] Modal de configuração com JSON Schema Form
- [ ] Instalar/Desinstalar funcionando
- [ ] Toggle ativar/desativar funcionando
- [ ] Commit feito

**Verificação:**
```
1. Acessar /app/seller/plugins
2. Clicar em "Explorar Plugins"
3. Instalar "Programa de Fidelidade"
4. Configurar pontos por BZR
5. Verificar widget na página da loja
```

---

## Sprint 2: Apps Pro-Code (P1)

> **Público:** Desenvolvedores (10% dos usuários)
> **Impacto:** Alto

### 2.1 IPFS Upload Real

**Documento:** `01-IPFS-UPLOAD.md`

**Prompt para Claude Code:**
```
Implementar upload real de bundles para IPFS conforme documentado em:
knowledge/40-bazari-os/fase-2/01-IPFS-UPLOAD.md

Tasks:
1. Adicionar @fastify/multipart no apps/api
2. Registrar plugin multipart no server.ts
3. Criar endpoint POST /developer/apps/:id/bundle em routes/developer.ts
4. Modificar CLI packages/bazari-cli/src/commands/publish.ts:
   - Criar tarball do dist/
   - Upload via API
   - Usar CID real retornado
5. Adicionar dependências: archiver, form-data
6. Testar fluxo completo: bazari build && bazari publish
7. Commitar: "feat(developer): implement real IPFS bundle upload"
```

**Checklist:**
- [ ] Endpoint de upload funcionando
- [ ] CLI criando tarball
- [ ] CLI fazendo upload real
- [ ] CID real sendo retornado
- [ ] Bundle acessível via IPFS gateway
- [ ] Commit feito

**Verificação:**
```bash
# Criar app de teste
cd /tmp && npx @bazari/cli create test-app
cd test-app

# Build e publish
bazari build
bazari publish

# Verificar CID (deve começar com Qm ou bafy)
# curl https://ipfs.io/ipfs/Qm...
```

---

### 2.2 Smart Contracts ink!

**Documento:** `02-INK-CONTRACTS.md`

**Prompt para Claude Code:**
```
Implementar templates de smart contracts ink! conforme documentado em:
knowledge/40-bazari-os/fase-2/02-INK-CONTRACTS.md

IMPORTANTE: Este trabalho é em /root/bazari-chain, não em /root/bazari

Tasks:
1. Criar estrutura de diretórios:
   - /root/bazari-chain/contracts/loyalty/
   - /root/bazari-chain/contracts/escrow/
   - /root/bazari-chain/contracts/revenue-split/
   - /root/bazari-chain/contracts/factory/
2. Criar Cargo.toml para cada contrato
3. Criar lib.rs para cada contrato (código no documento)
4. Criar testes básicos
5. Compilar contratos: cargo +nightly contract build
6. Adicionar ContractsClient ao SDK em /root/bazari:
   - packages/bazari-app-sdk/src/client/contracts.ts
7. Commitar em ambos os repos

Commits:
- bazari-chain: "feat(contracts): add ink! contract templates"
- bazari: "feat(sdk): add ContractsClient for ink! interaction"
```

**Checklist:**
- [ ] 4 contratos criados (Loyalty, Escrow, RevenueSplit, Factory)
- [ ] Contratos compilando sem erros
- [ ] Testes passando
- [ ] ContractsClient no SDK
- [ ] Commits feitos

**Verificação:**
```bash
cd /root/bazari-chain/contracts/loyalty
cargo +nightly contract build --release

# Deve gerar .contract file
ls target/ink/
```

---

### 2.3 Developer Documentation

**Documento:** `03-DEVELOPER-DOCS.md`

**Prompt para Claude Code:**
```
Implementar documentação e tutoriais para desenvolvedores conforme documentado em:
knowledge/40-bazari-os/fase-2/03-DEVELOPER-DOCS.md

Tasks:
1. Criar estrutura de docs (se usar Docusaurus/VitePress)
2. Criar tutoriais:
   - Getting Started
   - Criando seu primeiro app
   - Usando o SDK
   - Deploy de contratos ink!
3. Criar exemplos de código
4. Publicar em docs.bazari.io (ou subpath)
5. Commitar: "docs(developer): add developer documentation"
```

**Checklist:**
- [ ] Site de docs funcionando
- [ ] Tutorial Getting Started
- [ ] Referência do SDK
- [ ] Exemplos de código
- [ ] Commit feito

---

## Sprint 3: Extras (P2-P3)

> **Público:** Desenvolvedores avançados
> **Impacto:** Médio-Baixo

### 3.1 Design System

**Documento:** `04-DESIGN-SYSTEM.md`

**Prompt para Claude Code:**
```
Implementar design system para desenvolvedores conforme documentado em:
knowledge/40-bazari-os/fase-2/04-DESIGN-SYSTEM.md

Tasks:
1. Criar package @bazari/ui-kit ou exportar componentes existentes
2. Documentar componentes disponíveis
3. Criar Storybook (opcional)
4. Publicar no npm (ou deixar preparado)
5. Commitar: "feat(ui): add @bazari/ui-kit design system"
```

---

### 3.2 GPS/Maps SDK

**Documento:** `05-GPS-MAPS-SDK.md`

**Prompt para Claude Code:**
```
Implementar SDK de GPS e mapas conforme documentado em:
knowledge/40-bazari-os/fase-2/05-GPS-MAPS-SDK.md

Tasks:
1. Adicionar módulo location ao SDK
2. Implementar getCurrentPosition, watchPosition
3. Adicionar componentes de mapa (se aplicável)
4. Documentar uso
5. Commitar: "feat(sdk): add location/maps module"
```

---

### 3.3 Navigation Integration

**Documento:** `06-NAVIGATION.md`

**Prompt para Claude Code:**
```
Implementar integração de navegação conforme documentado em:
knowledge/40-bazari-os/fase-2/06-NAVIGATION.md

Tasks:
1. Revisar rotas existentes
2. Integrar novas telas ao fluxo
3. Adicionar deep links se necessário
4. Commitar: "feat(navigation): integrate phase 2 screens"
```

---

## Resumo de Ordem de Execução

| Ordem | Sprint | Documento | Prioridade | Esforço |
|-------|--------|-----------|------------|---------|
| 1 | 1.1 | 07-PLUGIN-SYSTEM.md | P0 | Médio |
| 2 | 1.2 | 08-PLUGIN-TEMPLATES.md | P0 | Médio |
| 3 | 1.3 | 09-SELLER-PLUGINS-UI.md | P0 | Médio |
| 4 | 2.1 | 01-IPFS-UPLOAD.md | P1 | Baixo |
| 5 | 2.2 | 02-INK-CONTRACTS.md | P1 | Alto |
| 6 | 2.3 | 03-DEVELOPER-DOCS.md | P1 | Médio |
| 7 | 3.1 | 04-DESIGN-SYSTEM.md | P2 | Baixo |
| 8 | 3.2 | 05-GPS-MAPS-SDK.md | P3 | Médio |
| 9 | 3.3 | 06-NAVIGATION.md | -- | Baixo |

---

## Dependências Entre Tasks

```
07-PLUGIN-SYSTEM.md
        │
        ▼
08-PLUGIN-TEMPLATES.md ──────┐
        │                    │
        ▼                    ▼
09-SELLER-PLUGINS-UI.md   (pode rodar em paralelo com P1)
                             │
                             ▼
                    01-IPFS-UPLOAD.md
                             │
                             ▼
                    02-INK-CONTRACTS.md
                             │
                             ▼
                    03-DEVELOPER-DOCS.md
                             │
                             ▼
                    04, 05, 06 (independentes)
```

---

## Comandos Úteis

```bash
# Rodar API em dev
cd /root/bazari && pnpm --filter @bazari/api dev

# Rodar Web em dev
cd /root/bazari && pnpm --filter @bazari/web dev

# Rodar migration
cd /root/bazari/apps/api && pnpm prisma migrate dev

# Gerar Prisma client
cd /root/bazari/apps/api && pnpm prisma generate

# Build completo
cd /root/bazari && pnpm build

# Testar CLI
cd /root/bazari/packages/bazari-cli && pnpm build && node dist/index.js --help
```

---

**Versão:** 1.0.0
**Data:** 2024-12-08
**Autor:** BazariOS Team
