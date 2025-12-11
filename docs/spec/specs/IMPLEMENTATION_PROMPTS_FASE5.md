# Prompts de Implementação - FASE 5: Gamification & Achievements

**Versão**: 1.0.0
**Data**: 2025-10-09

---

## 📋 Visão Geral

Implementar sistema de gamification com conquistas, missões diárias, leaderboards e recompensas.

### Dependências
- Fase 4 completa
- Sistema de badges funcionando
- Reputation system ativo

### Escopo
1. Sistema de Achievements (conquistas desbloqueáveis)
2. Daily Quests (missões diárias)
3. Leaderboards (rankings)
4. Reward System (pontos e prêmios)

**Tempo estimado**: 2-3 semanas

---

## 🎯 Task 5.1: Backend - Achievements System

### Prompt

```
Criar sistema de conquistas com progress tracking e unlock automático.

Tarefas:
1. Migration: add_achievements
   - Achievement: id, slug, name, description, category, tier, requirement
   - UserAchievement: userId, achievementId, progress, unlockedAt
   - Índices: (userId, unlockedAt), (achievementId)

2. Endpoint GET /achievements
   - Listar todas conquistas disponíveis
   - Grouped por categoria
   - Progress do usuário se autenticado

3. Endpoint GET /users/me/achievements
   - Conquistas do usuário
   - Progress em conquistas bloqueadas
   - Próximas a desbloquear

4. Background job: checkAchievements
   - Rodar ao criar post, like, comment
   - Verificar requirements
   - Unlock se cumprido
   - Criar notificação BADGE

Conquistas exemplo:
- FIRST_POST: Criar primeiro post
- POST_STREAK_7: Postar 7 dias seguidos
- SOCIAL_BUTTERFLY: Seguir 50 pessoas
- ENGAGEMENT_KING: Receber 100 likes
- CONVERSATION_STARTER: Criar 10 comments
- COMMUNITY_BUILDER: Ter 100 seguidores

Validar:
- Achievements desbloqueiam automaticamente
- Progress tracking correto
- Notificação ao unlock
- Performance < 200ms
```

---

## 🎯 Task 5.2: Backend - Daily Quests

### Prompt

```
Implementar missões diárias que resetam a cada 24h.

Tarefas:
1. Migration: add_quests
   - Quest: id, slug, name, description, type, target, reward
   - UserQuest: userId, questId, progress, completedAt, date

2. Endpoint GET /quests/daily
   - Retornar quests do dia
   - Progress do usuário
   - Rewards disponíveis

3. Quests automáticas:
   - POST_TODAY: Criar 1 post (reward: 10 points)
   - LIKE_5: Dar 5 likes (reward: 5 points)
   - COMMENT_3: Comentar 3x (reward: 8 points)
   - FOLLOW_NEW: Seguir 1 perfil (reward: 5 points)
   - ENGAGE_FEED: Passar 5min no feed (reward: 3 points)

4. Background job: dailyQuestReset
   - Rodar 00:00 UTC
   - Reset progress
   - Gerar novas quests aleatórias

Validar:
- Quests resetam diariamente
- Progress atualiza em tempo real
- Rewards são creditados
- Notification ao completar
```

---

## 🎯 Task 5.3: Backend - Leaderboards

### Prompt

```
Criar rankings globais e por categoria.

Tarefas:
1. Endpoint GET /leaderboards/:type
   - Types: reputation, posts, engagement, followers
   - Pagination: top 100
   - Timeframe: all-time, month, week
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
   - Rising Stars: maior crescimento 7d

Validar:
- Rankings corretos
- Performance < 100ms (cached)
- Posição do usuário correta
- Cache atualiza corretamente
```

---

## 🎯 Task 5.4: Frontend - Achievements Gallery

### Prompt

```
Criar galeria visual de conquistas com progress bars.

Arquivos:
- src/pages/AchievementsPage.tsx
- src/components/gamification/AchievementCard.tsx
- src/components/gamification/AchievementProgress.tsx

Features:
- Grid de cards por categoria
- Locked vs Unlocked visual distinction
- Progress bar em conquistas bloqueadas
- Modal com detalhes ao clicar
- Animação de unlock
- Toast ao desbloquear nova achievement
- Filtros: all, locked, unlocked
- Ordenação: rarity, recent, progress

Validar:
- Visual atrativo (locked = grayscale)
- Progress bars corretas
- Animação de unlock smooth
- Filtros funcionam
```

---

## 🎯 Task 5.5: Frontend - Daily Quests Panel

### Prompt

```
Criar painel de missões diárias no dashboard.

Arquivos:
- src/components/gamification/DailyQuestsPanel.tsx
- src/components/gamification/QuestCard.tsx

Features:
- Card compacto com 3-5 quests
- Progress circular (ex: 2/5)
- Botão "Claim" ao completar
- Countdown até reset (24h)
- Toast ao completar quest
- Animação de reward claim
- Auto-refresh a cada 30s

Integrar:
- Dashboard pessoal (/app/profile)
- Sidebar (versão mini)

Validar:
- Progress atualiza em tempo real
- Claim rewards funciona
- Countdown correto
- Visual gamificado
```

---

## 🎯 Task 5.6: Frontend - Leaderboards Page

### Prompt

```
Criar página de rankings com tabs.

Arquivos:
- src/pages/LeaderboardsPage.tsx
- src/components/gamification/LeaderboardTable.tsx
- src/components/gamification/UserRankCard.tsx

Features:
- Tabs: Reputação, Posts, Engagement, Seguidores
- Podium visual para top 3
- Tabela para 4-100
- Highlight da posição do usuário
- Avatar + nome + métricas
- Link para perfil ao clicar
- Filtro de timeframe (all, month, week)
- Badge de ranking (🥇🥈🥉)

Validar:
- Tabs funcionam
- Top 3 destaque visual
- User position highlighted
- Performance boa com 100 itens
```

---

## 📋 Checklist Final - Fase 5

### Backend
- [ ] Achievements unlock automaticamente
- [ ] Daily quests resetam corretamente
- [ ] Leaderboards atualizam hourly
- [ ] Rewards são creditados
- [ ] Notifications ao unlock achievement
- [ ] Performance < 300ms

### Frontend
- [ ] Galeria de achievements visual
- [ ] Progress bars corretas
- [ ] Daily quests panel funciona
- [ ] Claim rewards animação
- [ ] Leaderboards renderizam
- [ ] User position highlighted
- [ ] Toast notifications aparecem

### Gamification
- [ ] Sistema engaja usuários
- [ ] Quests balanceadas
- [ ] Achievements atingíveis
- [ ] Rewards têm valor
- [ ] Leaderboards justos

### UX
- [ ] Visual gamificado atrativo
- [ ] Animações smooth
- [ ] Feedback imediato
- [ ] Progress tracking claro

---

## 📊 Estimativa de Tempo

| Task | Componente | Tempo |
|------|-----------|-------|
| 5.1  | Achievements Backend | 8-10h |
| 5.2  | Daily Quests Backend | 6-8h |
| 5.3  | Leaderboards Backend | 4-6h |
| 5.4  | Achievements Frontend | 6-8h |
| 5.5  | Quests Frontend | 4-6h |
| 5.6  | Leaderboards Frontend | 4-6h |
| **Total** | | **32-44h (4-5 dias)** |

---

**Próxima Fase**: FASE 6 - Moderação & Segurança
