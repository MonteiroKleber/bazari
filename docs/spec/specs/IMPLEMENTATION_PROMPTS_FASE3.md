# Prompts de Implementação - FASE 3: Experiência Visual

**Versão**: 1.0.0
**Data**: 2025-10-09

---

## 📋 Visão Geral

Este documento contém prompts estruturados para implementar a **Fase 3: Experiência Visual** do sistema social/perfil.

### Objetivo
Melhorar a experiência visual com componentes interativos, gráficos e estados de loading profissionais.

### Dependências
- **Fase 2** deve estar completa e testada
- NotificationCenter funcional
- GlobalSearchBar integrado
- LikeButton e CommentSection funcionando

### Escopo da Fase 3
Esta fase é focada em **melhorias de UI/UX** sem mudanças no backend:
1. ProfileHoverCard - Preview ao passar mouse sobre perfis
2. BadgeIcon - Componentes visuais para badges
3. ReputationChart - Gráfico de evolução de reputação
4. Loading Skeletons - Shimmer animations para estados de loading

**Tempo estimado**: 1-2 semanas

---

## 🎯 Task 3.1: Frontend - ProfileHoverCard Component

### Prompt

```
Contexto: Preciso criar um componente de preview de perfil que aparece ao passar o mouse sobre nomes de usuários/avatares. O hover card deve mostrar informações básicas do perfil e botão de follow.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Instalar dependência Radix UI HoverCard**:
   ```bash
   cd apps/web
   npx shadcn-ui@latest add hover-card
   ```

2. **Criar ProfileHoverCard.tsx**:
   - Arquivo: src/components/social/ProfileHoverCard.tsx (NOVO)
   - Props: `handle: string`, `children: React.ReactNode`
   - Usar HoverCard do Radix UI
   - Delay de 500ms antes de abrir (openDelay)
   - Fechar ao clicar fora ou mover mouse

3. **Lógica de carregamento**:
   - Buscar dados do perfil ao abrir hover card
   - Endpoint: GET /profiles/:handle
   - Cache em memória para evitar chamadas repetidas
   - Loading state enquanto busca dados

4. **Conteúdo do card**:
   - Avatar (tamanho grande, 80x80px)
   - Display name + @handle
   - Bio (max 2 linhas, truncate)
   - Métricas: followersCount, followingCount, postsCount
   - Botão "Follow" ou "Following" (se não for o próprio perfil)
   - Link "Ver perfil" para /u/:handle

5. **Estados**:
   - Loading: Skeleton loader
   - Error: Mensagem "Erro ao carregar"
   - Success: Dados do perfil

6. **Uso**:
   - Envolver qualquer menção de perfil com ProfileHoverCard
   - Exemplos: GlobalSearchBar, NotificationCenter, PostCard author

Arquivos para criar:
- src/components/social/ProfileHoverCard.tsx

Arquivos para modificar:
- src/components/social/PostCard.tsx (envolver author com hover)
- src/components/NotificationCenter.tsx (envolver actor com hover)

Não modificar:
- Backend (sem mudanças necessárias)
- Rotas (usar endpoint existente)

Validar que:
- Hover card abre após 500ms
- Dados carregam corretamente
- Follow button funciona
- Cache evita chamadas repetidas
- Fecha ao mover mouse para fora
```

### Exemplo de Uso

```typescript
// Antes
<Link to={`/u/${author.handle}`}>
  {author.displayName}
</Link>

// Depois
<ProfileHoverCard handle={author.handle}>
  <Link to={`/u/${author.handle}`}>
    {author.displayName}
  </Link>
</ProfileHoverCard>
```

### Comandos de Teste

```bash
# Verificar se hover card abre ao passar mouse sobre nome
# Verificar se dados carregam corretamente
# Testar follow button
# Verificar cache (não deve fazer múltiplas chamadas)
```

---

## 🎯 Task 3.2: Frontend - BadgeIcon Component

### Prompt

```
Contexto: Preciso criar componentes visuais para representar badges/conquistas do sistema. Cada badge deve ter um ícone, cor e tooltip com descrição.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar BadgeIcon.tsx**:
   - Arquivo: src/components/social/BadgeIcon.tsx (NOVO)
   - Props: `badge: { slug: string, name: string, description: string, tier: number }`
   - Size: 'sm' | 'md' | 'lg' (default: 'md')
   - showTooltip: boolean (default: true)

2. **Mapeamento de badges**:
   - Criar arquivo de configuração: src/config/badges.ts
   - Mapear cada badge slug para ícone (lucide-react)
   - Definir cores por tier:
     * tier 1: text-zinc-400 (bronze)
     * tier 2: text-zinc-300 (prata)
     * tier 3: text-yellow-500 (ouro)
     * tier 4: text-purple-500 (platinum)
     * tier 5: text-cyan-500 (diamante)

3. **Badges disponíveis** (conforme schema):
   - FIRST_POST (MessageSquare icon)
   - POST_STREAK (Flame icon)
   - ENGAGEMENT_MASTER (Heart icon)
   - TRUSTED_SELLER (ShieldCheck icon)
   - VERIFIED (BadgeCheck icon)
   - TOP_CONTRIBUTOR (Award icon)
   - COMMUNITY_LEADER (Users icon)
   - EARLY_ADOPTER (Zap icon)

4. **Tooltip**:
   - Usar shadcn/ui Tooltip
   - Mostrar nome + descrição do badge
   - Indicar tier com estrelas (★)

5. **Tamanhos**:
   - sm: 16x16px (icon h-4 w-4)
   - md: 24x24px (icon h-6 w-6)
   - lg: 32x32px (icon h-8 w-8)

6. **Uso**:
   - ProfilePage (lista de badges)
   - ProfileHoverCard (mostrar top 3 badges)
   - PostCard (badge ao lado do nome se VERIFIED)

Arquivos para criar:
- src/components/social/BadgeIcon.tsx
- src/config/badges.ts

Arquivos para modificar:
- src/components/social/ProfileHoverCard.tsx (mostrar badges)
- src/components/social/PostCard.tsx (badge VERIFIED)

Validar que:
- Ícones carregam corretamente
- Cores variam por tier
- Tooltip mostra info completa
- Tamanhos funcionam (sm/md/lg)
```

### Exemplo de badges.ts

```typescript
export const BADGE_CONFIG = {
  FIRST_POST: {
    icon: MessageSquare,
    name: 'Primeira Publicação',
    color: 'text-blue-500'
  },
  VERIFIED: {
    icon: BadgeCheck,
    name: 'Verificado',
    color: 'text-blue-500'
  },
  // ... outros badges
}

export const TIER_COLORS = {
  1: 'text-zinc-400',
  2: 'text-zinc-300',
  3: 'text-yellow-500',
  4: 'text-purple-500',
  5: 'text-cyan-500'
}
```

---

## 🎯 Task 3.3: Frontend - ReputationChart Component

### Prompt

```
Contexto: Preciso criar um componente de gráfico que mostra a evolução da reputação do usuário ao longo do tempo. O gráfico deve ser simples, responsivo e mostrar tendências.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Instalar Recharts**:
   ```bash
   cd apps/web
   pnpm add recharts
   ```

2. **Criar ReputationChart.tsx**:
   - Arquivo: src/components/social/ReputationChart.tsx (NOVO)
   - Props: `handle: string`
   - Buscar dados: GET /profiles/:handle/reputation
   - Mostrar evolução dos últimos 30 dias

3. **Dados do gráfico**:
   - Eixo X: Data (formato dd/MM)
   - Eixo Y: Score de reputação (0-1000)
   - Tipo: LineChart (linha suave)
   - Cor da linha: green-500 se crescendo, red-500 se caindo
   - Área preenchida (gradient)

4. **Features do gráfico**:
   - Tooltip ao hover mostrando:
     * Data completa
     * Score exato
     * Variação em relação ao dia anterior
   - Grid horizontal para facilitar leitura
   - Responsive (min-height: 200px, max-height: 400px)
   - Loading skeleton enquanto carrega

5. **Métricas adicionais**:
   - Mostrar acima do gráfico:
     * Score atual (grande, destaque)
     * Variação últimos 7 dias (+X ou -X)
     * Tier atual (badge visual)
     * Próximo tier e progresso (progress bar)

6. **Estados**:
   - Loading: Skeleton com animação
   - Error: Mensagem "Sem dados disponíveis"
   - Empty: "Comece a interagir para ganhar reputação!"
   - Success: Gráfico renderizado

7. **Uso**:
   - ProfilePage (tab "Reputação")
   - Dashboard pessoal (/app/profile)

Arquivos para criar:
- src/components/social/ReputationChart.tsx
- src/hooks/useReputationHistory.ts (hook para buscar dados)

Arquivos para modificar:
- src/pages/ProfilePage.tsx (adicionar tab)
- src/lib/api.ts (adicionar helper getReputationHistory)

Backend (se necessário):
- Criar endpoint GET /profiles/:handle/reputation/history
- Retornar array de {date, score} dos últimos 30 dias

Validar que:
- Gráfico renderiza corretamente
- Tooltip mostra dados corretos
- Cores mudam conforme tendência
- Responsivo em mobile
- Loading skeleton funciona
```

### Exemplo de resposta do endpoint

```json
{
  "current": {
    "score": 450,
    "tier": "BRONZE",
    "nextTier": "SILVER",
    "progressToNext": 0.45
  },
  "history": [
    { "date": "2025-01-01", "score": 400 },
    { "date": "2025-01-02", "score": 410 },
    // ... últimos 30 dias
  ],
  "change7d": 25,
  "change30d": 50
}
```

---

## 🎯 Task 3.4: Frontend - Loading Skeletons

### Prompt

```
Contexto: Preciso criar componentes de skeleton loading com animação shimmer para todos os estados de carregamento. Isso melhora a percepção de performance e a experiência do usuário.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Instalar shadcn/ui Skeleton** (se ainda não tiver):
   ```bash
   cd apps/web
   npx shadcn-ui@latest add skeleton
   ```

2. **Criar skeletons específicos**:

   **a) PostCardSkeleton.tsx**:
   - Arquivo: src/components/social/PostCardSkeleton.tsx
   - Simular estrutura do PostCard
   - Avatar circular + 2 linhas de texto + 3 linhas de conteúdo
   - Botões de ação (like, comment)

   **b) ProfileCardSkeleton.tsx**:
   - Arquivo: src/components/social/ProfileCardSkeleton.tsx
   - Avatar grande + nome + bio + métricas

   **c) CommentSkeleton.tsx**:
   - Arquivo: src/components/social/CommentSkeleton.tsx
   - Avatar pequeno + 2 linhas de texto

   **d) NotificationSkeleton.tsx**:
   - Arquivo: src/components/NotificationSkeleton.tsx
   - Avatar + linha de texto + timestamp

3. **Wrapper de lista**:
   - Criar SkeletonList.tsx genérico
   - Props: `count: number`, `SkeletonComponent: React.ComponentType`
   - Renderizar N skeletons com keys únicas

4. **Integrar nos componentes existentes**:

   **PostFeed**:
   ```tsx
   {loading ? (
     <SkeletonList count={3} SkeletonComponent={PostCardSkeleton} />
   ) : (
     posts.map(post => <PostCard key={post.id} post={post} />)
   )}
   ```

   **CommentSection**:
   ```tsx
   {loading ? (
     <SkeletonList count={5} SkeletonComponent={CommentSkeleton} />
   ) : (
     comments.map(comment => <CommentItem key={comment.id} comment={comment} />)
   )}
   ```

   **NotificationCenter**:
   ```tsx
   {loading ? (
     <SkeletonList count={5} SkeletonComponent={NotificationSkeleton} />
   ) : (
     // ... notificações
   )}
   ```

5. **Animação shimmer**:
   - Usar animate-pulse do Tailwind
   - Gradiente sutil: from-muted to-muted/50
   - Duração: 2s (padrão do shadcn/ui)

6. **Boas práticas**:
   - Sempre mostrar skeleton enquanto loading=true
   - Manter mesmas dimensões do conteúdo real
   - Usar Skeleton do shadcn/ui como base
   - Arredondar bordas conforme design real

Arquivos para criar:
- src/components/social/PostCardSkeleton.tsx
- src/components/social/ProfileCardSkeleton.tsx
- src/components/social/CommentSkeleton.tsx
- src/components/NotificationSkeleton.tsx
- src/components/SkeletonList.tsx

Arquivos para modificar:
- src/components/social/PostFeed.tsx
- src/components/social/CommentSection.tsx
- src/components/NotificationCenter.tsx
- src/components/social/ProfileHoverCard.tsx

Validar que:
- Skeletons aparecem durante loading
- Animação shimmer funciona
- Transição suave para conteúdo real
- Dimensões batem com componentes reais
```

### Exemplo de PostCardSkeleton

```typescript
export function PostCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="h-10 w-10 rounded-full" />

        <div className="flex-1 space-y-2">
          {/* Nome + handle */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>

          {/* Conteúdo */}
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>

          {/* Ações */}
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}
```

---

## 📋 Checklist Final - Fase 3

Após implementar todas as tasks acima, validar:

### Frontend
- [ ] ProfileHoverCard abre ao hover (500ms delay)
- [ ] ProfileHoverCard mostra dados corretos
- [ ] Follow button no hover card funciona
- [ ] BadgeIcon renderiza com ícones corretos
- [ ] BadgeIcon usa cores por tier
- [ ] Tooltip dos badges funciona
- [ ] ReputationChart renderiza gráfico
- [ ] Tooltip do gráfico mostra dados
- [ ] Métricas de reputação corretas
- [ ] PostCardSkeleton dimensões corretas
- [ ] Animação shimmer funciona
- [ ] Transição skeleton → conteúdo suave

### UX
- [ ] Hover cards não bloqueiam interação
- [ ] Skeleton melhora percepção de performance
- [ ] Badges visualmente distintos por tier
- [ ] Gráfico responsivo em mobile
- [ ] Tooltips aparecem rapidamente

### Performance
- [ ] Cache de hover card evita chamadas repetidas
- [ ] Gráfico não re-renderiza desnecessariamente
- [ ] Skeletons não causam layout shift
- [ ] Animações performáticas (60fps)

### Regressão
- [ ] Fase 2 ainda funciona
- [ ] NotificationCenter não quebrou
- [ ] PostCard renderiza normalmente
- [ ] GlobalSearchBar funciona

---

## 🚀 Ordem de Execução Recomendada

1. **Task 3.1** (ProfileHoverCard) → Testar hover em diferentes locais
2. **Task 3.4** (Skeletons) → Testar loading states
3. **Task 3.2** (BadgeIcon) → Testar visual de badges
4. **Task 3.3** (ReputationChart) → Testar gráfico (pode precisar endpoint novo)
5. **Checklist Final** → Validar tudo

---

**Próxima Fase**: FASE 4 - Feed Algorítmico & Recomendações

---

## 📊 Estimativa de Tempo

| Task | Componente | Tempo Estimado |
|------|-----------|----------------|
| 3.1  | ProfileHoverCard | 2-3 horas |
| 3.2  | BadgeIcon | 1-2 horas |
| 3.3  | ReputationChart | 3-4 horas |
| 3.4  | Loading Skeletons | 2-3 horas |
| **Total** | | **8-12 horas** |

**Obs**: ReputationChart pode precisar de endpoint backend novo, adicionar 1-2 horas se necessário.
