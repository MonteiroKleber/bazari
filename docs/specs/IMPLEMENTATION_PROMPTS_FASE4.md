# Prompts de Implementação - FASE 4: Feed Algorítmico & Recomendações

**Versão**: 1.0.0
**Data**: 2025-10-09

---

## 📋 Visão Geral

Este documento contém prompts estruturados para implementar a **Fase 4: Feed Algorítmico & Recomendações** do sistema social/perfil.

### Objetivo
Criar um feed inteligente que mostra conteúdo relevante baseado em interesses e comportamento do usuário, além de sugestões de perfis e conteúdo.

### Dependências
- **Fase 3** deve estar completa
- ProfileHoverCard funcional
- ReputationChart integrado
- Loading skeletons implementados

### Escopo da Fase 4
Esta fase introduz **algoritmos de recomendação** e **personalização**:
1. Feed Algorítmico - Ordenação inteligente de posts
2. Sugestões de Perfis - "Quem seguir"
3. Trending Topics - Tópicos em alta
4. Related Content - Conteúdo relacionado

**Tempo estimado**: 2-3 semanas

---

## 🎯 Task 4.1: Backend - Feed Algorítmico

### Prompt

```
Contexto: Preciso implementar um algoritmo de feed que ordena posts baseado em múltiplos fatores: recência, engajamento, relacionamento com autor, e interesses do usuário. O feed deve ser personalizado e otimizado para performance.

Repositório: ~/bazari/apps/api

Tarefas:

1. **Criar tabela de interações**:
   - Migration: add_user_interactions
   - Tabela: UserInteraction
   - Campos: userId, targetType (POST/PROFILE/PRODUCT), targetId, interactionType (VIEW/LIKE/COMMENT/SHARE), weight, createdAt
   - Índices: (userId, createdAt), (targetType, targetId)

2. **Criar endpoint de feed personalizado**:
   - Arquivo: src/routes/feed.ts (NOVO)
   - Endpoint: GET /feed/personalized
   - Query params: limit (default 20), cursor
   - Middleware: authOnRequest
   - Retornar posts ordenados por score algorítmico

3. **Algoritmo de scoring**:
   Calcular score para cada post baseado em:

   **Recency Score** (30%):
   - Posts mais recentes têm score maior
   - Decaimento exponencial após 24h
   - Formula: e^(-hours/24)

   **Engagement Score** (40%):
   - Likes: 1 ponto cada
   - Comments: 3 pontos cada
   - Shares: 5 pontos cada (futuro)
   - Normalizar por idade do post

   **Relationship Score** (20%):
   - Post de quem você segue: +50 pontos
   - Post de amigo em comum: +20 pontos
   - Post de desconhecido: 0 pontos

   **Interest Score** (10%):
   - Baseado em interações anteriores
   - Categorias/tags similares
   - Perfis similares

4. **Otimizações**:
   - Cache de feed por 5 minutos (Redis)
   - Query otimizada com índices
   - Limit inicial de 100 posts para scoring
   - Pagination cursor-based
   - Pre-compute scores em background job (opcional)

5. **Fallback**:
   - Se usuário novo (sem interações): feed cronológico
   - Se feed vazio: mostrar posts populares globais

Arquivos para criar:
- prisma/schema.prisma (adicionar UserInteraction)
- src/routes/feed.ts
- src/lib/feedAlgorithm.ts (lógica de scoring)

Arquivos para modificar:
- src/server.ts (registrar rota)

Migration:
```bash
npx prisma migrate dev --name add_user_interactions
```

Validar que:
- Feed retorna posts ordenados por relevância
- Posts de seguidos aparecem no topo
- Performance < 500ms
- Cache funciona
- Pagination cursor-based funciona
```

### Exemplo de Score Calculation

```typescript
function calculateFeedScore(post: Post, user: User): number {
  const now = Date.now();
  const postAge = (now - post.createdAt.getTime()) / (1000 * 60 * 60); // hours

  // 1. Recency (30%)
  const recencyScore = Math.exp(-postAge / 24) * 30;

  // 2. Engagement (40%)
  const engagementScore = (
    (post.likesCount * 1 + post.commentsCount * 3) / (postAge + 1)
  ) * 40;

  // 3. Relationship (20%)
  let relationshipScore = 0;
  if (user.following.includes(post.authorId)) {
    relationshipScore = 50;
  } else if (hasCommonFollowers(user, post.author)) {
    relationshipScore = 20;
  }
  relationshipScore *= 0.2; // 20% weight

  // 4. Interest (10%)
  const interestScore = calculateInterestMatch(user, post) * 10;

  return recencyScore + engagementScore + relationshipScore + interestScore;
}
```

---

## 🎯 Task 4.2: Backend - Sugestões de Perfis

### Prompt

```
Contexto: Preciso criar um sistema de recomendação de perfis baseado em similaridade de interesses, conexões em comum e atividade recente.

Repositório: ~/bazari/apps/api

Tarefas:

1. **Criar endpoint de sugestões**:
   - Endpoint: GET /feed/suggestions/profiles
   - Query params: limit (default 10)
   - Middleware: authOnRequest
   - Retornar perfis sugeridos com razão da sugestão

2. **Algoritmo de sugestão**:

   **Baseado em Network** (50%):
   - Amigos de amigos (2º grau)
   - Quem seus seguidos seguem
   - Weight: número de conexões em comum

   **Baseado em Interesses** (30%):
   - Perfis que interagem com conteúdo similar
   - Mesmas categorias/tags
   - Badges similares

   **Baseado em Atividade** (20%):
   - Perfis ativos recentemente
   - Alta reputação
   - Conteúdo de qualidade

3. **Filtros**:
   - Excluir perfis já seguidos
   - Excluir perfis bloqueados
   - Excluir perfis inativos (>30 dias)
   - Diversificar sugestões (não só mesmo nicho)

4. **Metadados da sugestão**:
   - Retornar razão: "Seguido por X amigos", "Interesses similares"
   - Score de match (0-100)
   - Preview de posts recentes (3)

5. **Cache**:
   - Cache de sugestões por 1 hora
   - Invalidar ao seguir/desfollow

Arquivos para criar:
- src/routes/feed.ts (adicionar endpoint)
- src/lib/profileSuggestions.ts (algoritmo)

Validar que:
- Sugestões são relevantes
- Diversidade de perfis
- Performance < 300ms
- Razão da sugestão clara
```

---

## 🎯 Task 4.3: Backend - Trending Topics

### Prompt

```
Contexto: Preciso identificar tópicos em alta baseado em hashtags, menções e conteúdo frequente nas últimas horas.

Repositório: ~/bazari/apps/api

Tarefas:

1. **Criar tabela de trending**:
   - Migration: add_trending_topics
   - Tabela: TrendingTopic
   - Campos: tag, count, score, timestamp
   - TTL: 24 horas

2. **Criar endpoint**:
   - Endpoint: GET /feed/trending
   - Query params: limit (default 10)
   - Retornar top trending topics

3. **Algoritmo de trending**:
   - Extrair hashtags de posts (#exemplo)
   - Contar frequência nas últimas 24h
   - Calcular score: frequency * recency_weight
   - Ordenar por score

4. **Background job**:
   - Rodar a cada 15 minutos
   - Atualizar tabela TrendingTopic
   - Limpar tópicos >24h

5. **Retorno**:
   - Tag name
   - Post count
   - Growth rate (vs 24h atrás)
   - Sample posts (3)

Arquivos para criar:
- src/routes/feed.ts (adicionar endpoint)
- src/workers/trendingWorker.ts (background job)
- src/lib/trendingAlgorithm.ts

Validar que:
- Tópicos refletem atividade recente
- Growth rate correto
- Performance < 100ms (cached)
```

---

## 🎯 Task 4.4: Frontend - Feed Personalizado

### Prompt

```
Contexto: Preciso criar um feed inteligente que usa o endpoint de feed algorítmico e mostra posts relevantes com infinite scroll.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar PersonalizedFeed.tsx**:
   - Arquivo: src/components/social/PersonalizedFeed.tsx (NOVO)
   - Usar endpoint GET /feed/personalized
   - Infinite scroll com IntersectionObserver
   - Loading skeletons entre páginas
   - Empty state se sem posts

2. **Infinite Scroll**:
   - Usar cursor-based pagination
   - Detectar scroll até 80% da página
   - Carregar próxima página automaticamente
   - Loading indicator no final

3. **Features**:
   - Pull to refresh (mobile)
   - Indicador "X novos posts" no topo
   - Smooth scroll ao carregar novos
   - Cache de posts visualizados

4. **Tabs de Feed**:
   - "Para Você" (algoritmo)
   - "Seguindo" (cronológico)
   - "Popular" (mais engajamento)
   - Transição suave entre tabs

5. **Integração**:
   - Substituir feed atual na HomePage
   - Manter filtros e busca

Arquivos para criar:
- src/components/social/PersonalizedFeed.tsx
- src/hooks/usePersonalizedFeed.ts
- src/hooks/useInfiniteScroll.ts

Arquivos para modificar:
- src/pages/HomePage.tsx (usar PersonalizedFeed)
- src/lib/api.ts (adicionar getPersonalizedFeed)

Validar que:
- Infinite scroll funciona
- Posts não duplicam
- Transição entre tabs suave
- Performance boa (60fps)
```

---

## 🎯 Task 4.5: Frontend - Sugestões de Perfis

### Prompt

```
Contexto: Preciso criar um componente de "Quem Seguir" na sidebar que mostra perfis sugeridos com razão da sugestão.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar WhoToFollow.tsx**:
   - Arquivo: src/components/social/WhoToFollow.tsx (NOVO)
   - Card na sidebar
   - Mostrar 5 perfis sugeridos
   - Botão "Ver mais" para página completa

2. **ProfileSuggestionCard**:
   - Subcomponente para cada sugestão
   - Avatar + nome + razão
   - Botão "Seguir" inline
   - Match score visual (progress bar)

3. **Features**:
   - Atualizar ao seguir perfil
   - Remover perfil seguido da lista
   - Refresh a cada 5 minutos
   - Loading skeleton

4. **Página de Sugestões**:
   - Rota: /discover/people
   - Lista completa com paginação
   - Filtros: categoria, reputação, atividade
   - Cards expandidos com bio

Arquivos para criar:
- src/components/social/WhoToFollow.tsx
- src/components/social/ProfileSuggestionCard.tsx
- src/pages/DiscoverPeoplePage.tsx

Arquivos para modificar:
- src/components/AppSidebar.tsx (adicionar WhoToFollow)
- src/lib/api.ts (adicionar getProfileSuggestions)

Validar que:
- Sugestões aparecem
- Seguir funciona inline
- Razão da sugestão clara
- Match score visível
```

---

## 🎯 Task 4.6: Frontend - Trending Topics

### Prompt

```
Contexto: Preciso criar um componente de tópicos em alta na sidebar que mostra hashtags populares com growth rate.

Repositório: ~/bazari/apps/web

Tarefas:

1. **Criar TrendingTopics.tsx**:
   - Arquivo: src/components/social/TrendingTopics.tsx (NOVO)
   - Card na sidebar
   - Lista de 10 tópicos
   - Link para busca por tag

2. **TopicItem**:
   - Hashtag + post count
   - Seta indicando crescimento
   - Preview de 1 post ao hover
   - Click → busca por #tag

3. **Features**:
   - Refresh a cada 5 minutos
   - Animação ao trocar tópicos
   - Loading skeleton
   - Empty state se sem trending

4. **Página de Trending**:
   - Rota: /discover/trending
   - Lista completa de tópicos
   - Posts recentes por tópico
   - Gráfico de evolução (opcional)

Arquivos para criar:
- src/components/social/TrendingTopics.tsx
- src/pages/DiscoverTrendingPage.tsx

Arquivos para modificar:
- src/components/AppSidebar.tsx (adicionar TrendingTopics)
- src/lib/api.ts (adicionar getTrendingTopics)

Validar que:
- Tópicos atualizam automaticamente
- Growth indicator correto
- Click navega para busca
- Performance boa
```

---

## 📋 Checklist Final - Fase 4

Após implementar todas as tasks acima, validar:

### Backend
- [ ] Feed algorítmico retorna posts ordenados
- [ ] Scoring funciona corretamente
- [ ] Posts de seguidos prioritários
- [ ] Sugestões de perfis relevantes
- [ ] Razão da sugestão clara
- [ ] Trending topics atualizam
- [ ] Cache funciona (5min feed, 1h sugestões)
- [ ] Performance < 500ms em todos endpoints

### Frontend
- [ ] PersonalizedFeed renderiza
- [ ] Infinite scroll funciona
- [ ] Tabs de feed funcionam
- [ ] WhoToFollow mostra sugestões
- [ ] Seguir inline funciona
- [ ] TrendingTopics atualiza
- [ ] Click em tag navega para busca
- [ ] Loading skeletons corretos

### Algoritmo
- [ ] Recency weight correto
- [ ] Engagement scoring balanceado
- [ ] Relationship bonus aplicado
- [ ] Interest matching funciona
- [ ] Diversidade de conteúdo
- [ ] Fallback para usuários novos

### UX
- [ ] Feed relevante para usuário
- [ ] Sugestões fazem sentido
- [ ] Trending reflete atividade real
- [ ] Transições suaves
- [ ] Performance percebida boa

### Performance
- [ ] Queries otimizadas
- [ ] Índices corretos
- [ ] Cache efetivo
- [ ] Infinite scroll não trava
- [ ] Background jobs não sobrecarregam

### Regressão
- [ ] Fase 3 ainda funciona
- [ ] ProfileHoverCard não quebrou
- [ ] NotificationCenter funciona

---

## 🚀 Ordem de Execução Recomendada

1. **Task 4.1** (Feed Algorítmico Backend) → Implementar scoring
2. **Task 4.4** (Feed Frontend) → Testar feed personalizado
3. **Task 4.2** (Sugestões Backend) → Implementar recomendações
4. **Task 4.5** (Sugestões Frontend) → Testar WhoToFollow
5. **Task 4.3** (Trending Backend) → Implementar trending
6. **Task 4.6** (Trending Frontend) → Testar TrendingTopics
7. **Checklist Final** → Validar tudo

---

## 📊 Estimativa de Tempo

| Task | Componente | Tempo Estimado |
|------|-----------|----------------|
| 4.1  | Feed Algorítmico (Backend) | 8-10 horas |
| 4.2  | Sugestões de Perfis (Backend) | 4-6 horas |
| 4.3  | Trending Topics (Backend) | 3-4 horas |
| 4.4  | PersonalizedFeed (Frontend) | 6-8 horas |
| 4.5  | WhoToFollow (Frontend) | 3-4 horas |
| 4.6  | TrendingTopics (Frontend) | 2-3 horas |
| **Total** | | **26-35 horas (3-4 dias)** |

**Obs**: Complexidade alta devido aos algoritmos de recomendação.

---

**Próxima Fase**: FASE 5 - Gamification & Achievements
