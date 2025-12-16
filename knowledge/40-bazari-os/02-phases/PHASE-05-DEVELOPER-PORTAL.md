# Fase 5: Developer Portal - Portal do Desenvolvedor

**Status:** Pendente
**Prioridade:** Média
**Dependências:** Fases 1-4
**Estimativa:** ~12 tasks

---

## Objetivo

Criar o portal web onde desenvolvedores podem gerenciar seus apps, ver analytics, e submeter para a App Store. Inclui também a CLI `@bazari.libervia.xyz/cli` para criar e publicar apps.

---

## Resultado Esperado

Ao final desta fase:
- Portal web para desenvolvedores em `/app/developer`
- CLI para criar, testar e publicar apps
- Sistema de submissão e review
- Dashboard de analytics por app

---

## Pré-requisitos

- Fase 4 completa (SDK)
- Entendimento do fluxo de publicação

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPER EXPERIENCE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   CLI       │    │   Portal    │    │   Review    │         │
│  │  @bazari.libervia.xyz/cli│───▶│   Web UI    │───▶│   System    │         │
│  │             │    │             │    │             │         │
│  │  - create   │    │  - My Apps  │    │  - Queue    │         │
│  │  - dev      │    │  - Analytics│    │  - Approve  │         │
│  │  - build    │    │  - Submit   │    │  - Reject   │         │
│  │  - publish  │    │  - Settings │    │  - Feedback │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            ▼                                     │
│                   ┌─────────────┐                                │
│                   │  App Store  │                                │
│                   │   Backend   │                                │
│                   └─────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tasks

### Task 5.1: Criar schema de banco para apps de terceiros

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/api/prisma/schema.prisma` (adicionar)

**Código:**
```prisma
// === APP STORE ===

model ThirdPartyApp {
  id          String   @id @default(cuid())

  // Identificação
  appId       String   @unique // ex: "com.dev.myapp"
  name        String
  slug        String   @unique

  // Desenvolvedor
  developerId String
  developer   User     @relation(fields: [developerId], references: [id])

  // Metadados
  description String
  longDescription String?
  category    String
  tags        String[]
  icon        String
  color       String
  screenshots String[]

  // Técnico
  currentVersion String
  sdkVersion     String
  bundleUrl      String    // URL do bundle (IPFS ou CDN)
  bundleHash     String    // Hash para verificação

  // Permissões
  permissions Json      // Array de { id, reason, optional }

  // Status
  status      AppStatus @default(DRAFT)
  featured    Boolean   @default(false)

  // Métricas
  installCount Int      @default(0)
  rating       Float?
  ratingCount  Int      @default(0)

  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  publishedAt DateTime?

  // Relações
  versions    AppVersion[]
  reviews     AppReview[]
  submissions AppSubmission[]

  @@index([developerId])
  @@index([category])
  @@index([status])
}

model AppVersion {
  id        String   @id @default(cuid())
  appId     String
  app       ThirdPartyApp @relation(fields: [appId], references: [id])

  version   String
  changelog String?
  bundleUrl String
  bundleHash String

  status    VersionStatus @default(PENDING)

  createdAt DateTime @default(now())
  reviewedAt DateTime?
  reviewedBy String?
  reviewNotes String?

  @@unique([appId, version])
}

model AppSubmission {
  id        String   @id @default(cuid())
  appId     String
  app       ThirdPartyApp @relation(fields: [appId], references: [id])

  version   String
  notes     String?

  status    SubmissionStatus @default(PENDING)

  submittedAt DateTime @default(now())
  reviewedAt  DateTime?
  reviewedBy  String?
  reviewNotes String?

  @@index([appId])
  @@index([status])
}

model AppReview {
  id        String   @id @default(cuid())
  appId     String
  app       ThirdPartyApp @relation(fields: [appId], references: [id])

  userId    String
  user      User     @relation(fields: [userId], references: [id])

  rating    Int      // 1-5
  comment   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([appId, userId])
  @@index([appId])
}

enum AppStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  PUBLISHED
  REJECTED
  SUSPENDED
  DEPRECATED
}

enum VersionStatus {
  PENDING
  APPROVED
  REJECTED
}

enum SubmissionStatus {
  PENDING
  IN_REVIEW
  APPROVED
  REJECTED
  CANCELLED
}
```

**Critérios de Aceite:**
- [ ] Schema adicionado ao Prisma
- [ ] Migration gerada
- [ ] Enums criados

---

### Task 5.2: Criar API routes para Developer Portal

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/api/src/routes/developer.ts`

**Código:**
```typescript
import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const app = new Hono();

// Middleware de auth em todas as rotas
app.use('/*', authMiddleware);

// GET /developer/apps - Listar apps do desenvolvedor
app.get('/apps', async (c) => {
  const userId = c.get('userId');

  const apps = await prisma.thirdPartyApp.findMany({
    where: { developerId: userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { reviews: true },
      },
    },
  });

  return c.json({ apps });
});

// GET /developer/apps/:id - Detalhes de um app
app.get('/apps/:id', async (c) => {
  const userId = c.get('userId');
  const appId = c.req.param('id');

  const app = await prisma.thirdPartyApp.findFirst({
    where: { id: appId, developerId: userId },
    include: {
      versions: { orderBy: { createdAt: 'desc' }, take: 10 },
      submissions: { orderBy: { submittedAt: 'desc' }, take: 5 },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { handle: true, avatar: true } } },
      },
    },
  });

  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  return c.json({ app });
});

// POST /developer/apps - Criar novo app
app.post('/apps', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const app = await prisma.thirdPartyApp.create({
    data: {
      appId: body.appId,
      name: body.name,
      slug: body.slug,
      developerId: userId,
      description: body.description,
      longDescription: body.longDescription,
      category: body.category,
      tags: body.tags || [],
      icon: body.icon,
      color: body.color || 'from-gray-500 to-gray-600',
      screenshots: body.screenshots || [],
      currentVersion: '0.1.0',
      sdkVersion: body.sdkVersion || '0.1.0',
      bundleUrl: '',
      bundleHash: '',
      permissions: body.permissions || [],
      status: 'DRAFT',
    },
  });

  return c.json({ app }, 201);
});

// PUT /developer/apps/:id - Atualizar app
app.put('/apps/:id', async (c) => {
  const userId = c.get('userId');
  const appId = c.req.param('id');
  const body = await c.req.json();

  const existing = await prisma.thirdPartyApp.findFirst({
    where: { id: appId, developerId: userId },
  });

  if (!existing) {
    return c.json({ error: 'App not found' }, 404);
  }

  const app = await prisma.thirdPartyApp.update({
    where: { id: appId },
    data: {
      name: body.name,
      description: body.description,
      longDescription: body.longDescription,
      category: body.category,
      tags: body.tags,
      icon: body.icon,
      color: body.color,
      screenshots: body.screenshots,
      permissions: body.permissions,
    },
  });

  return c.json({ app });
});

// POST /developer/apps/:id/submit - Submeter para review
app.post('/apps/:id/submit', async (c) => {
  const userId = c.get('userId');
  const appId = c.req.param('id');
  const body = await c.req.json();

  const app = await prisma.thirdPartyApp.findFirst({
    where: { id: appId, developerId: userId },
  });

  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  // Criar versão
  const version = await prisma.appVersion.create({
    data: {
      appId: app.id,
      version: body.version,
      changelog: body.changelog,
      bundleUrl: body.bundleUrl,
      bundleHash: body.bundleHash,
    },
  });

  // Criar submissão
  const submission = await prisma.appSubmission.create({
    data: {
      appId: app.id,
      version: body.version,
      notes: body.notes,
    },
  });

  // Atualizar status do app
  await prisma.thirdPartyApp.update({
    where: { id: app.id },
    data: {
      status: 'PENDING_REVIEW',
      bundleUrl: body.bundleUrl,
      bundleHash: body.bundleHash,
      currentVersion: body.version,
    },
  });

  return c.json({ version, submission }, 201);
});

// GET /developer/apps/:id/analytics - Analytics do app
app.get('/apps/:id/analytics', async (c) => {
  const userId = c.get('userId');
  const appId = c.req.param('id');

  const app = await prisma.thirdPartyApp.findFirst({
    where: { id: appId, developerId: userId },
  });

  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  // TODO: Implementar analytics reais
  // Por enquanto, dados mock
  const analytics = {
    installs: {
      total: app.installCount,
      last7Days: Math.floor(app.installCount * 0.1),
      last30Days: Math.floor(app.installCount * 0.3),
    },
    rating: {
      average: app.rating || 0,
      count: app.ratingCount,
    },
    retention: {
      day1: 0.8,
      day7: 0.4,
      day30: 0.2,
    },
  };

  return c.json({ analytics });
});

export default app;
```

**Critérios de Aceite:**
- [ ] CRUD de apps
- [ ] Submissão para review
- [ ] Analytics endpoint

---

### Task 5.3: Criar página DevPortalDashboardPage

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/pages/developer/DevPortalDashboardPage.tsx`

**Código:**
```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Package, Star, Download, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface DeveloperApp {
  id: string;
  appId: string;
  name: string;
  icon: string;
  status: string;
  installCount: number;
  rating: number | null;
  updatedAt: string;
}

export default function DevPortalDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['developer-apps'],
    queryFn: () => api.get('/developer/apps').then((r) => r.data),
  });

  const apps: DeveloperApp[] = data?.apps || [];

  const totalInstalls = apps.reduce((sum, app) => sum + app.installCount, 0);
  const avgRating =
    apps.filter((a) => a.rating).reduce((sum, a) => sum + (a.rating || 0), 0) /
      apps.filter((a) => a.rating).length || 0;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Developer Portal</h1>
          <p className="text-muted-foreground">
            Gerencie seus apps no ecossistema Bazari
          </p>
        </div>
        <Button asChild>
          <Link to="/app/developer/new">
            <Plus className="w-4 h-4 mr-2" />
            Novo App
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Apps</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Instalações
            </CardTitle>
            <Download className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalInstalls.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rating Médio</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (30d)</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 BZR</div>
          </CardContent>
        </Card>
      </div>

      {/* Apps List */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Apps</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum app ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro app para o Bazari
              </p>
              <Button asChild>
                <Link to="/app/developer/new">Criar App</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  to={`/app/developer/apps/${app.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
                      {app.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{app.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {app.appId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {app.installCount.toLocaleString()} instalações
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {app.rating ? `⭐ ${app.rating.toFixed(1)}` : 'Sem rating'}
                      </div>
                    </div>
                    <Badge
                      variant={
                        app.status === 'PUBLISHED'
                          ? 'default'
                          : app.status === 'PENDING_REVIEW'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Dashboard com métricas
- [ ] Lista de apps
- [ ] Estado vazio

---

### Task 5.4: Criar página de criação de app

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/pages/developer/NewAppPage.tsx`

**Código:**
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

const CATEGORIES = [
  { id: 'finance', label: 'Finanças' },
  { id: 'social', label: 'Social' },
  { id: 'commerce', label: 'Comércio' },
  { id: 'tools', label: 'Ferramentas' },
  { id: 'governance', label: 'Governança' },
  { id: 'entertainment', label: 'Entretenimento' },
];

export default function NewAppPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    appId: '',
    slug: '',
    description: '',
    category: '',
    icon: '📱',
  });

  const createApp = useMutation({
    mutationFn: (data: typeof formData) =>
      api.post('/developer/apps', data).then((r) => r.data),
    onSuccess: (data) => {
      navigate(`/app/developer/apps/${data.app.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createApp.mutate(formData);
  };

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setFormData({
      ...formData,
      name,
      slug,
      appId: `com.bazari.${slug}`,
    });
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/app/developer')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Criar Novo App</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do App</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Meu App Incrível"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appId">App ID</Label>
                <Input
                  id="appId"
                  value={formData.appId}
                  onChange={(e) =>
                    setFormData({ ...formData, appId: e.target.value })
                  }
                  placeholder="com.exemplo.meuapp"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="meu-app"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva o que seu app faz..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Ícone (emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder="📱"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/app/developer')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createApp.isPending}>
                {createApp.isPending ? 'Criando...' : 'Criar App'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Formulário de criação
- [ ] Validação básica
- [ ] Redirect após sucesso

---

### Task 5.5: Criar página de detalhes do app (dev)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/pages/developer/AppDetailDevPage.tsx`

**Descrição:**
Página com abas: Overview, Versões, Analytics, Reviews, Configurações

**Estrutura:**
- Tabs usando shadcn Tabs
- Overview: info básica + stats
- Versões: histórico + submeter nova
- Analytics: gráficos de uso
- Reviews: lista de reviews
- Config: editar metadados

**Critérios de Aceite:**
- [ ] Todas as abas funcionando
- [ ] Submissão de versão
- [ ] Edição de metadados

---

### Task 5.6: Criar estrutura da CLI

**Prioridade:** Média
**Tipo:** criar

**Estrutura:**
```
packages/bazari-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── commands/
│   │   ├── create.ts
│   │   ├── dev.ts
│   │   ├── build.ts
│   │   ├── publish.ts
│   │   └── validate.ts
│   └── utils/
│       ├── config.ts
│       └── api.ts
└── README.md
```

**Critérios de Aceite:**
- [ ] Estrutura criada
- [ ] Comandos básicos

---

### Task 5.7: Criar comando `bazari create`

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `packages/bazari-cli/src/commands/create.ts`

**Descrição:**
Scaffold de novo projeto de app com template básico.

**Critérios de Aceite:**
- [ ] Cria estrutura de projeto
- [ ] Gera manifest base
- [ ] Instala dependências

---

### Task 5.8: Criar comando `bazari dev`

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `packages/bazari-cli/src/commands/dev.ts`

**Descrição:**
Dev server com hot reload e preview no Bazari.

**Critérios de Aceite:**
- [ ] Dev server funciona
- [ ] Hot reload ativo

---

### Task 5.9: Criar comando `bazari build`

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `packages/bazari-cli/src/commands/build.ts`

**Descrição:**
Build de produção do app.

**Critérios de Aceite:**
- [ ] Bundle gerado
- [ ] Hash calculado

---

### Task 5.10: Criar comando `bazari publish`

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `packages/bazari-cli/src/commands/publish.ts`

**Descrição:**
Upload para IPFS e submissão para review.

**Critérios de Aceite:**
- [ ] Upload para IPFS
- [ ] Submissão via API

---

### Task 5.11: Adicionar rotas do Developer Portal

**Prioridade:** Alta
**Tipo:** modificar

**Arquivo:** `apps/web/src/App.tsx`

**Adicionar:**
```typescript
<Route path="/app/developer" element={<DevPortalDashboardPage />} />
<Route path="/app/developer/new" element={<NewAppPage />} />
<Route path="/app/developer/apps/:id" element={<AppDetailDevPage />} />
```

**Critérios de Aceite:**
- [ ] Rotas funcionando

---

### Task 5.12: Criar sistema de review (admin)

**Prioridade:** Baixa
**Tipo:** criar

**Descrição:**
Página admin para review de apps submetidos.

**Critérios de Aceite:**
- [ ] Lista de submissões pendentes
- [ ] Aprovar/rejeitar
- [ ] Feedback ao dev

---

## Validação da Fase

### Checklist Final

- [ ] Portal do desenvolvedor funcional
- [ ] CRUD de apps no backend
- [ ] CLI com comandos básicos
- [ ] Submissão para review
- [ ] Sistema de review (admin)

---

## Próxima Fase

Após completar esta fase, prossiga para:
**[PHASE-06-MONETIZATION.md](./PHASE-06-MONETIZATION.md)** - Monetização e Blockchain

---

**Documento:** PHASE-05-DEVELOPER-PORTAL.md
**Versão:** 1.0.0
**Data:** 2024-12-03
