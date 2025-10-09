# Prompts para Claude Code - Fases 3-8

Este documento contém prompts prontos para enviar ao Claude Code para implementar as fases restantes do sistema social.

**Como usar**: Copie e cole cada prompt na conversa com o Claude Code.

---

## 🎨 FASE 3: Experiência Visual

### Prompt 3.1: ProfileHoverCard

```
Olá! Vou implementar a Fase 3 - Task 3.1: ProfileHoverCard.

Contexto: Preciso criar um componente de preview de perfil que aparece ao passar o mouse sobre nomes de usuários. O hover card deve mostrar informações básicas e botão de follow.

Leia a especificação: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE3.md (Task 3.1)
Código de referência: ~/bazari/docs/specs/SOCIAL_UX_FASE3.md (seção 3.1)

Tarefas:

1. Instalar dependência:
   ```bash
   cd apps/web
   npx shadcn-ui@latest add hover-card
   ```

2. Criar componente:
   - Arquivo: apps/web/src/components/social/ProfileHoverCard.tsx (NOVO)
   - Props: handle (string), children (ReactNode)
   - Usar HoverCard do Radix UI
   - openDelay: 500ms
   - Cache em memória (Map) com TTL de 1 minuto

3. Conteúdo do card:
   - Avatar grande (80x80px)
   - Display name + @handle
   - Bio (max 2 linhas)
   - Métricas: followers, following, posts
   - Botão Follow/Following
   - Link "Ver perfil"
   - Loading skeleton enquanto carrega

4. Integrar em:
   - apps/web/src/components/social/PostCard.tsx (envolver author)
   - apps/web/src/components/NotificationCenter.tsx (envolver actor)

5. Adicionar helpers:
   - apps/web/src/lib/api.ts: getProfile(handle)
   - apps/web/src/lib/api.ts: followUser(handle), unfollowUser(handle)

Ao terminar:
- Testar hover sobre nomes em posts
- Verificar cache (não deve fazer múltiplas chamadas)
- Confirmar botão follow funciona
- Validar loading skeleton aparece

Use o código completo da especificação SOCIAL_UX_FASE3.md como referência.
```

---

### Prompt 3.2: Loading Skeletons

```
Olá! Vou implementar a Fase 3 - Task 3.4: Loading Skeletons.

Contexto: Preciso criar componentes de skeleton loading com animação shimmer para todos os estados de carregamento.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE3.md (Task 3.4)
Referência: ~/bazari/docs/specs/SOCIAL_UX_FASE3.md (seção 3.4)

Tarefas:

1. Verificar se skeleton está instalado:
   ```bash
   cd apps/web
   npx shadcn-ui@latest add skeleton
   ```

2. Criar skeletons específicos:
   - apps/web/src/components/social/PostCardSkeleton.tsx
   - apps/web/src/components/social/ProfileCardSkeleton.tsx
   - apps/web/src/components/social/CommentSkeleton.tsx
   - apps/web/src/components/NotificationSkeleton.tsx

3. Criar wrapper genérico:
   - apps/web/src/components/SkeletonList.tsx
   - Props: count, SkeletonComponent, className

4. Integrar nos componentes existentes:
   - PostFeed: mostrar PostCardSkeleton quando loading
   - CommentSection: mostrar CommentSkeleton quando loading
   - NotificationCenter: mostrar NotificationSkeleton quando loading

5. Validar:
   - Skeletons aparecem durante loading
   - Animação shimmer funciona
   - Dimensões batem com componentes reais
   - Transição suave para conteúdo real

Use código completo da SOCIAL_UX_FASE3.md como base.
```

---

### Prompt 3.3: BadgeIcon

```
Olá! Vou implementar a Fase 3 - Task 3.2: BadgeIcon.

Contexto: Preciso criar componentes visuais para badges com ícones, cores por tier e tooltips.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE3.md (Task 3.2)
Referência: ~/bazari/docs/specs/SOCIAL_UX_FASE3.md (seção 3.2)

Tarefas:

1. Instalar tooltip se necessário:
   ```bash
   cd apps/web
   npx shadcn-ui@latest add tooltip
   ```

2. Criar configuração de badges:
   - apps/web/src/config/badges.ts (NOVO)
   - Mapear cada badge slug para ícone (lucide-react)
   - Definir cores por tier (1-5)
   - Badges: FIRST_POST, POST_STREAK, ENGAGEMENT_MASTER, TRUSTED_SELLER, VERIFIED, TOP_CONTRIBUTOR, COMMUNITY_LEADER, EARLY_ADOPTER

3. Criar componente:
   - apps/web/src/components/social/BadgeIcon.tsx
   - Props: badge (slug, name, description, tier), size (sm/md/lg), showTooltip
   - Tooltip mostra nome + descrição + tier com estrelas

4. Criar BadgeList:
   - Subcomponente para mostrar múltiplos badges
   - Props: badges (array), max (default 3)

5. Integrar:
   - PostCard: badge VERIFIED ao lado do nome
   - ProfileHoverCard: mostrar top 3 badges

Validar:
- Ícones carregam corretamente
- Cores variam por tier
- Tooltip mostra info completa
- Tamanhos sm/md/lg funcionam

Use código da SOCIAL_UX_FASE3.md.
```

---

### Prompt 3.4: ReputationChart

```
Olá! Vou implementar a Fase 3 - Task 3.3: ReputationChart.

Contexto: Preciso criar um gráfico de evolução de reputação dos últimos 30 dias usando Recharts.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE3.md (Task 3.3)
Referência: ~/bazari/docs/specs/SOCIAL_UX_FASE3.md (seção 3.3)

Tarefas:

1. Instalar Recharts:
   ```bash
   cd apps/web
   pnpm add recharts
   ```

2. Backend - Criar endpoint:
   - apps/api/src/routes/profiles.ts
   - GET /profiles/:handle/reputation/history
   - Retornar: current (score, tier, nextTier, progress), history (30 dias), change7d, change30d
   - Usar ProfileReputationEvent para reconstruir histórico

3. Frontend - Criar componente:
   - apps/web/src/components/social/ReputationChart.tsx
   - LineChart/AreaChart com gradient
   - Métricas no topo: score atual, variação 7d, tier, progress bar
   - Tooltip ao hover mostrando data + score
   - Loading skeleton
   - Responsive (min-height: 200px)

4. Adicionar helper:
   - apps/web/src/lib/api.ts: getReputationHistory(handle)

5. Integrar:
   - ProfilePage: adicionar tab "Reputação"
   - Dashboard pessoal: /app/profile

Validar:
- Gráfico renderiza corretamente
- Tooltip mostra dados
- Cores mudam (green se crescendo, red se caindo)
- Responsivo em mobile

Use código completo da SOCIAL_UX_FASE3.md como referência, especialmente o endpoint backend.
```

---

## 📊 FASE 4: Feed Algorítmico & Recomendações

### Prompt 4.1: Feed Algorítmico Backend

```
Olá! Vou implementar a Fase 4 - Task 4.1: Feed Algorítmico Backend.

Contexto: Preciso implementar um algoritmo de feed que ordena posts baseado em múltiplos fatores: recência (30%), engajamento (40%), relacionamento (20%) e interesses (10%).

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE4.md (Task 4.1)

Tarefas:

1. Migration - Criar tabela de interações:
   ```bash
   cd apps/api
   ```
   - Adicionar model UserInteraction no schema.prisma
   - Campos: userId, targetType (POST/PROFILE/PRODUCT), targetId, interactionType (VIEW/LIKE/COMMENT), weight, createdAt
   - Índices: (userId, createdAt), (targetType, targetId)
   - Rodar: npx prisma migrate dev --name add_user_interactions

2. Criar algoritmo de scoring:
   - apps/api/src/lib/feedAlgorithm.ts (NOVO)
   - Função calculateFeedScore(post, user)
   - Recency: e^(-hours/24) * 30%
   - Engagement: (likes*1 + comments*3) / (postAge + 1) * 40%
   - Relationship: +50 se segue autor, +20 se amigo comum * 20%
   - Interest: baseado em interações anteriores * 10%

3. Criar endpoint:
   - apps/api/src/routes/feed.ts (NOVO)
   - GET /feed/personalized
   - Query: limit (default 20), cursor
   - Middleware: authOnRequest
   - Buscar últimos 100 posts
   - Calcular score para cada
   - Ordenar por score desc
   - Retornar top N com cursor pagination

4. Cache:
   - Redis cache de 5 minutos (opcional)
   - Fallback: feed cronológico para usuários novos

5. Registrar rota:
   - apps/api/src/server.ts: importar e registrar feedRoutes

Validar:
- Feed retorna posts ordenados por relevância
- Posts de seguidos prioritários
- Performance < 500ms
- Cursor pagination funciona

Use o exemplo de scoring da especificação.
```

---

### Prompt 4.2: Feed Personalizado Frontend

```
Olá! Vou implementar a Fase 4 - Task 4.4: Feed Personalizado Frontend.

Contexto: Criar feed com infinite scroll que usa o endpoint de feed algorítmico.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE4.md (Task 4.4)

Tarefas:

1. Criar hook de infinite scroll:
   - apps/web/src/hooks/usePersonalizedFeed.ts
   - Usar cursor-based pagination
   - IntersectionObserver para detectar scroll
   - Carregar próxima página ao chegar em 80%

2. Criar componente:
   - apps/web/src/components/social/PersonalizedFeed.tsx
   - Tabs: "Para Você" (algoritmo), "Seguindo" (cronológico), "Popular"
   - Infinite scroll
   - Loading skeletons entre páginas
   - Empty state

3. Features:
   - Indicador "X novos posts" no topo
   - Smooth scroll ao carregar
   - Cache de posts visualizados

4. Adicionar helper:
   - apps/web/src/lib/api.ts: getPersonalizedFeed(params)

5. Integrar:
   - apps/web/src/pages/HomePage.tsx
   - Substituir feed atual por PersonalizedFeed

Validar:
- Infinite scroll funciona
- Posts não duplicam
- Transição entre tabs suave
- Performance 60fps

Use PostCardSkeleton para loading states.
```

---

### Prompt 4.3: Sugestões de Perfis

```
Olá! Vou implementar Fase 4 - Tasks 4.2 e 4.5: Sugestões de Perfis.

Contexto: Sistema de recomendação de perfis baseado em conexões, interesses e atividade.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE4.md (Tasks 4.2 e 4.5)

Tarefas Backend:

1. Criar algoritmo:
   - apps/api/src/lib/profileSuggestions.ts (NOVO)
   - Network (50%): amigos de amigos, 2º grau
   - Interesses (30%): tags/badges similares
   - Atividade (20%): perfis ativos, alta reputação

2. Criar endpoint:
   - apps/api/src/routes/feed.ts
   - GET /feed/suggestions/profiles
   - Query: limit (default 10)
   - Retornar: perfis com razão da sugestão e match score
   - Filtrar: já seguidos, bloqueados, inativos

Tarefas Frontend:

1. Criar componente sidebar:
   - apps/web/src/components/social/WhoToFollow.tsx
   - Card com 5 perfis
   - ProfileSuggestionCard: avatar + nome + razão + match score
   - Botão "Seguir" inline

2. Criar página completa:
   - apps/web/src/pages/DiscoverPeoplePage.tsx
   - Rota: /discover/people
   - Lista completa com paginação
   - Filtros: categoria, reputação

3. Adicionar helpers:
   - apps/web/src/lib/api.ts: getProfileSuggestions(params)

4. Integrar:
   - AppSidebar: adicionar WhoToFollow

Validar:
- Sugestões são relevantes
- Seguir inline funciona
- Razão da sugestão clara
- Match score visível
```

---

### Prompt 4.4: Trending Topics

```
Olá! Vou implementar Fase 4 - Tasks 4.3 e 4.6: Trending Topics.

Contexto: Identificar tópicos em alta baseado em hashtags e menções.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE4.md (Tasks 4.3 e 4.6)

Tarefas Backend:

1. Migration:
   - Adicionar model TrendingTopic: tag, count, score, timestamp
   - TTL: 24 horas
   - npx prisma migrate dev --name add_trending_topics

2. Criar algoritmo:
   - apps/api/src/lib/trendingAlgorithm.ts
   - Extrair hashtags de posts (#exemplo)
   - Score: frequency * recency_weight
   - Últimas 24h

3. Criar endpoint:
   - apps/api/src/routes/feed.ts
   - GET /feed/trending
   - Retornar: top 10 topics com growth rate

4. Background job:
   - apps/api/src/workers/trendingWorker.ts
   - Rodar a cada 15 minutos
   - Atualizar TrendingTopic

Tarefas Frontend:

1. Componente sidebar:
   - apps/web/src/components/social/TrendingTopics.tsx
   - Lista de 10 tópicos
   - Hashtag + count + seta de crescimento
   - Click → busca por #tag

2. Página completa:
   - apps/web/src/pages/DiscoverTrendingPage.tsx
   - Rota: /discover/trending
   - Lista completa com posts recentes

3. Adicionar helper:
   - apps/web/src/lib/api.ts: getTrendingTopics(params)

4. Integrar:
   - AppSidebar: adicionar TrendingTopics
   - Refresh a cada 5 minutos

Validar:
- Tópicos refletem atividade real
- Growth indicator correto
- Click navega para busca
```

---

## 🎮 FASE 5: Gamification & Achievements

### Prompt 5.1: Achievements System

```
Olá! Vou implementar Fase 5 - Tasks 5.1 e 5.4: Sistema de Achievements.

Contexto: Sistema de conquistas com progress tracking e unlock automático.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE5.md (Tasks 5.1 e 5.4)

Tarefas Backend:

1. Migration:
   ```bash
   cd apps/api
   ```
   - Model Achievement: id, slug, name, description, category, tier, requirement
   - Model UserAchievement: userId, achievementId, progress, unlockedAt
   - Índices corretos
   - npx prisma migrate dev --name add_achievements

2. Seed achievements:
   - FIRST_POST, POST_STREAK_7, SOCIAL_BUTTERFLY, ENGAGEMENT_KING
   - CONVERSATION_STARTER, COMMUNITY_BUILDER

3. Endpoints:
   - GET /achievements (todas as conquistas)
   - GET /users/me/achievements (do usuário + progress)

4. Background job:
   - Função checkAchievements(userId)
   - Chamar ao criar post, like, comment
   - Unlock se requirement cumprido
   - Criar notificação BADGE

Tarefas Frontend:

1. Página de conquistas:
   - apps/web/src/pages/AchievementsPage.tsx
   - apps/web/src/components/gamification/AchievementCard.tsx
   - Grid por categoria
   - Locked = grayscale
   - Progress bar em bloqueadas

2. Features:
   - Modal com detalhes
   - Animação de unlock
   - Toast ao desbloquear
   - Filtros: all, locked, unlocked

3. Adicionar helpers:
   - apps/web/src/lib/api.ts: getAchievements(), getUserAchievements()

Validar:
- Achievements desbloqueiam automaticamente
- Progress tracking correto
- Notificação ao unlock
- Visual atrativo
```

---

### Prompt 5.2: Daily Quests

```
Olá! Vou implementar Fase 5 - Tasks 5.2 e 5.5: Daily Quests.

Contexto: Missões diárias que resetam a cada 24h com rewards.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE5.md (Tasks 5.2 e 5.5)

Tarefas Backend:

1. Migration:
   - Model Quest: id, slug, name, description, type, target, reward
   - Model UserQuest: userId, questId, progress, completedAt, date
   - npx prisma migrate dev --name add_quests

2. Seed quests:
   - POST_TODAY (1 post = 10 points)
   - LIKE_5 (5 likes = 5 points)
   - COMMENT_3 (3 comments = 8 points)
   - FOLLOW_NEW (1 follow = 5 points)

3. Endpoint:
   - GET /quests/daily
   - Retornar quests do dia + progress do usuário

4. Background job:
   - dailyQuestReset a cada 00:00 UTC
   - Reset progress, gerar novas quests

Tarefas Frontend:

1. Componente:
   - apps/web/src/components/gamification/DailyQuestsPanel.tsx
   - apps/web/src/components/gamification/QuestCard.tsx
   - Progress circular (ex: 2/5)
   - Botão "Claim" ao completar
   - Countdown até reset

2. Features:
   - Toast ao completar
   - Animação de reward claim
   - Auto-refresh 30s

3. Integrar:
   - Dashboard pessoal (/app/profile)
   - Sidebar (versão mini)

4. Adicionar helper:
   - apps/web/src/lib/api.ts: getDailyQuests(), claimQuestReward(questId)

Validar:
- Quests resetam diariamente
- Progress atualiza em tempo real
- Rewards são creditados
```

---

### Prompt 5.3: Leaderboards

```
Olá! Vou implementar Fase 5 - Tasks 5.3 e 5.6: Leaderboards.

Contexto: Rankings globais por diferentes categorias.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE5.md (Tasks 5.3 e 5.6)

Tarefas Backend:

1. Endpoint:
   - GET /leaderboards/:type
   - Types: reputation, posts, engagement, followers
   - Query: timeframe (all-time, month, week), limit (default 100)
   - Incluir posição do usuário atual

2. Pre-computed rankings:
   - Background job a cada 1 hora
   - Cachear top 100 no Redis
   - TTL: 1 hora

3. Rankings:
   - Top Reputation: por reputationScore
   - Top Posts: por postsCount
   - Top Engagement: por (likes + comments * 3)
   - Top Followers: por followersCount

Tarefas Frontend:

1. Página:
   - apps/web/src/pages/LeaderboardsPage.tsx
   - apps/web/src/components/gamification/LeaderboardTable.tsx
   - Tabs por tipo de ranking
   - Podium visual para top 3 (🥇🥈🥉)
   - Tabela para 4-100

2. Features:
   - Highlight da posição do usuário
   - Avatar + nome + métricas
   - Link para perfil ao clicar
   - Filtro de timeframe

3. Adicionar helper:
   - apps/web/src/lib/api.ts: getLeaderboard(type, timeframe)

Validar:
- Rankings corretos
- Performance < 100ms (cached)
- User position highlighted
- Tabs funcionam
```

---

## 🛡️ FASES 6-8: Moderação, Analytics & Mobile

### Prompt 6.1: Report System

```
Olá! Vou implementar Fase 6 - Report System.

Contexto: Sistema de reports para moderação de conteúdo.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE6-8.md (Task 6.1)

Tarefas Backend:

1. Migration:
   - Model ContentReport: contentType, contentId, reason, status, reviewedBy
   - Enum ReportReason: SPAM, HARASSMENT, INAPPROPRIATE, etc
   - npx prisma migrate dev --name add_reports

2. Endpoints:
   - POST /reports (criar report)
   - GET /admin/reports (listar - apenas moderadores)
   - POST /admin/reports/:id/resolve

Tarefas Frontend:

1. Modal de report:
   - apps/web/src/components/moderation/ReportModal.tsx
   - Formulário com razões (radio buttons)
   - Campo de detalhes (opcional)

2. Integrar:
   - Botão "Reportar" em PostCard
   - Botão em comments
   - Botão em profiles

3. Admin panel:
   - apps/web/src/pages/admin/ReportsPage.tsx (apenas moderadores)
   - Lista de reports pendentes
   - Ações: resolve, delete content

Validar:
- Reports são criados
- Moderadores veem reports
- Resolve funciona
```

---

### Prompt 6.2: Block & Mute

```
Olá! Vou implementar Fase 6 - Block & Mute Users.

Contexto: Permitir usuários bloquearem ou silenciarem outros.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE6-8.md (Task 6.4)

Tarefas Backend:

1. Migration:
   - Model UserBlock: userId, blockedUserId, createdAt
   - Model UserMute: userId, mutedUserId, createdAt
   - npx prisma migrate dev --name add_user_blocks

2. Endpoints:
   - POST /users/:id/block
   - POST /users/:id/mute
   - DELETE /users/:id/block (unblock)
   - DELETE /users/:id/mute (unmute)

3. Filtrar:
   - Feed: não mostrar posts de bloqueados
   - Notificações: não mostrar de bloqueados/mutados

Tarefas Frontend:

1. Botões:
   - ProfilePage: botão "Bloquear" / "Silenciar"
   - Dropdown menu com opções

2. Página:
   - apps/web/src/pages/BlockedUsersPage.tsx
   - Lista de bloqueados
   - Botão "Desbloquear"

3. Adicionar helpers:
   - apps/web/src/lib/api.ts: blockUser(id), muteUser(id), unblockUser(id)

Validar:
- Blocked users não aparecem
- Muted users silenciados
- Reversão funciona
```

---

### Prompt 7.1: User Analytics

```
Olá! Vou implementar Fase 7 - User Analytics.

Contexto: Dashboard analítico para usuários verem suas métricas.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE6-8.md (Task 7.1)

Tarefas Backend:

1. Endpoint:
   - GET /users/me/analytics
   - Query: timeRange (7d, 30d, 90d)
   - Retornar: post impressions, engagement rate, follower growth, best posting times, top posts

Tarefas Frontend:

1. Página:
   - apps/web/src/pages/AnalyticsDashboard.tsx
   - KPI cards no topo
   - Charts: Recharts line/bar
   - Time range selector

2. Features:
   - Gráfico de crescimento de followers
   - Engagement rate ao longo do tempo
   - Top performing posts
   - Export to CSV

3. Adicionar helper:
   - apps/web/src/lib/api.ts: getUserAnalytics(timeRange)

Validar:
- Charts renderizam
- Dados corretos
- Export funciona
```

---

### Prompt 8.1: PWA Setup

```
Olá! Vou implementar Fase 8 - PWA (Progressive Web App).

Contexto: Tornar o app instalável e funcionar offline.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE6-8.md (Task 8.1)

Tarefas:

1. Instalar plugin:
   ```bash
   cd apps/web
   pnpm add -D vite-plugin-pwa
   ```

2. Configurar Vite:
   - apps/web/vite.config.ts
   - Adicionar vite-plugin-pwa
   - Estratégia: networkFirst

3. Manifest:
   - apps/web/public/manifest.json
   - Nome, descrição, ícones, theme color

4. Ícones:
   - apps/web/public/icons/
   - 192x192, 512x512 (PNG)

5. Service Worker:
   - Cache de assets estáticos
   - Cache de API responses
   - Offline fallback

6. Install prompt:
   - Detectar se PWA
   - Mostrar prompt de instalação

Validar:
- PWA instalável
- Service worker registra
- Funciona offline (básico)
- Lighthouse PWA score > 90
```

---

### Prompt 8.2: Mobile Optimizations

```
Olá! Vou implementar Fase 8 - Mobile Optimizations.

Contexto: Otimizar UI para mobile e adicionar gestures.

Leia: ~/bazari/docs/specs/IMPLEMENTATION_PROMPTS_FASE6-8.md (Task 8.2)

Tarefas:

1. Responsive:
   - Revisar todos componentes
   - Mobile-first CSS
   - Breakpoints consistentes

2. Bottom Navigation (mobile):
   - apps/web/src/components/MobileBottomNav.tsx
   - Tabs: Home, Discover, Create, Notifications, Profile
   - Fixo na parte inferior
   - Mostrar apenas em mobile

3. Touch gestures:
   - Pull to refresh
   - Swipe gestures (opcional)

4. Mobile-optimized forms:
   - Input types corretos
   - Teclado apropriado

5. Performance:
   - Lazy load images
   - Code splitting
   - Reduce bundle size

Validar:
- UI responsivo em mobile
- Bottom nav funciona
- Pull to refresh
- Performance boa
```

---

## 📝 Notas de Uso

### Como usar estes prompts:

1. **Copie um prompt completo** (do início até o fim)
2. **Cole na conversa com Claude Code**
3. **Aguarde a implementação**
4. **Valide usando o checklist** no fim de cada task
5. **Commit após validação** usando os comandos sugeridos

### Ordem recomendada:

**Semana 1-2 (Fase 3)**:
- 3.1 ProfileHoverCard
- 3.2 Loading Skeletons
- 3.3 BadgeIcon
- 3.4 ReputationChart

**Semana 3 (Fase 4 - Parte 1)**:
- 4.1 Feed Algorítmico Backend
- 4.2 Feed Personalizado Frontend

**Semana 4 (Fase 4 - Parte 2)**:
- 4.3 Sugestões de Perfis
- 4.4 Trending Topics

**Semana 5-6 (Fase 5)**:
- 5.1 Achievements System
- 5.2 Daily Quests
- 5.3 Leaderboards

**Semanas 7-8 (Fase 6)**:
- 6.1 Report System
- 6.2 Block & Mute

**Semanas 9-10 (Fase 7)**:
- 7.1 User Analytics

**Semanas 11-12 (Fase 8)**:
- 8.1 PWA Setup
- 8.2 Mobile Optimizations

---

**Total**: 12 semanas para implementar todas as fases restantes.

**Dica**: Sempre leia a especificação completa antes de enviar o prompt ao Claude Code.
