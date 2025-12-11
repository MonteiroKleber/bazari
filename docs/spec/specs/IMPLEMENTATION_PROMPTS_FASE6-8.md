# Prompts de Implementação - FASES 6-8: Moderação, Analytics & Mobile

**Versão**: 1.0.0
**Data**: 2025-10-09

---

## FASE 6: Moderação & Segurança (2 semanas)

### 🎯 Objetivo
Implementar ferramentas de moderação, report system e segurança de conteúdo.

### Task 6.1: Report System

**Backend**:
- Migration: add_reports
- Model: ContentReport (contentType, contentId, reason, status, reviewedBy)
- Endpoint: POST /reports (criar report)
- Endpoint: GET /admin/reports (listar para moderadores)
- Endpoint: POST /admin/reports/:id/resolve

**Frontend**:
- ReportModal (formulário com razões)
- Botão "Reportar" em posts/comments/profiles
- Admin panel para moderadores

**Validar**:
- Reports são criados
- Moderadores veem reports
- Resolve funciona
- Email notification ao reporter

---

### Task 6.2: Content Moderation

**Backend**:
- Endpoint: POST /admin/content/:id/hide (ocultar conteúdo)
- Endpoint: POST /admin/content/:id/delete
- Endpoint: POST /admin/users/:id/ban (banir usuário)
- Webhook para revisão manual

**Frontend**:
- ModeratorTools component
- Quick actions: hide, delete, warn
- User moderation history
- Ban duration selector

**Validar**:
- Conteúdo oculto não aparece
- Usuários banidos não podem postar
- Logs de moderação criados

---

### Task 6.3: Auto-Moderation (Opcional)

**Backend**:
- Integrar com API de moderação (OpenAI Moderation ou similar)
- Auto-flag conteúdo suspeito
- Spam detection (patterns)
- Rate limiting agressivo para spam

**Frontend**:
- Warning ao tentar postar conteúdo suspeito
- Appeal form se auto-flagged

---

### Task 6.4: Block & Mute

**Backend**:
- Migration: add_user_blocks
- Endpoint: POST /users/:id/block
- Endpoint: POST /users/:id/mute
- Filter blocked users de feed/notifications

**Frontend**:
- Block/Mute buttons em profile
- BlockedUsers list page
- Unblock functionality

**Validar**:
- Blocked users não aparecem
- Muted users silenciados
- Reversão funciona

---

## FASE 7: Analytics & Insights (1-2 semanas)

### 🎯 Objetivo
Dashboards analíticos para usuários e admins.

### Task 7.1: User Analytics

**Backend**:
- Endpoint: GET /users/me/analytics
- Métricas:
  * Post impressions (views)
  * Engagement rate
  * Follower growth
  * Best posting times
  * Top performing posts

**Frontend**:
- AnalyticsDashboard page
- Charts: Recharts line/bar charts
- Time range selector (7d, 30d, 90d)
- Export to CSV

---

### Task 7.2: Post Insights

**Backend**:
- Endpoint: GET /posts/:id/insights
- Métricas por post:
  * Views count
  * Unique viewers
  * Click-through rate
  * Engagement timeline
  * Audience demographics (se disponível)

**Frontend**:
- PostInsights modal
- Mini charts inline
- "View insights" button em posts próprios

---

### Task 7.3: Admin Analytics

**Backend**:
- Endpoint: GET /admin/analytics
- Métricas globais:
  * DAU/MAU
  * Posts per day
  * Retention rate
  * Churn rate
  * Revenue metrics (futuro)

**Frontend**:
- AdminDashboard com KPIs
- Real-time metrics
- Alerts para anomalias

---

## FASE 8: Mobile & PWA (1-2 semanas)

### 🎯 Objetivo
Otimizar para mobile e transformar em PWA instalável.

### Task 8.1: PWA Setup

**Configuração**:
```bash
# Instalar Vite PWA plugin
pnpm add -D vite-plugin-pwa
```

- Configure manifest.json
- Service worker para offline
- Install prompt
- Push notifications setup

**Arquivos**:
- vite.config.ts (adicionar PWA plugin)
- public/manifest.json
- public/icons/ (192x192, 512x512)

---

### Task 8.2: Mobile Optimizations

**Responsive**:
- Mobile-first CSS
- Touch gestures (swipe to refresh)
- Bottom navigation bar (mobile)
- Hamburger menu
- Mobile-optimized forms

**Performance**:
- Lazy load images
- Code splitting por rota
- Reduce bundle size
- Optimize fonts

---

### Task 8.3: Native Features

**Implementar**:
- Share API (native share)
- Camera API (upload foto direto)
- Geolocation (opcional)
- Haptic feedback
- Dark mode persistence

---

### Task 8.4: Offline Mode

**Features**:
- Cache posts for offline reading
- Queue actions (like, comment) quando offline
- Sync quando voltar online
- Offline indicator UI

---

## 📋 Checklist Completo - Fases 6-8

### Fase 6: Moderação
- [ ] Report system funciona
- [ ] Moderadores podem revisar
- [ ] Hide/Delete/Ban funcionam
- [ ] Block/Mute funcionam
- [ ] Auto-moderation detecta spam

### Fase 7: Analytics
- [ ] User analytics mostram dados corretos
- [ ] Charts renderizam
- [ ] Post insights disponíveis
- [ ] Admin dashboard com KPIs
- [ ] Export to CSV funciona

### Fase 8: Mobile & PWA
- [ ] PWA instalável
- [ ] Service worker registra
- [ ] Offline mode funciona
- [ ] Mobile UI responsivo
- [ ] Native features funcionam
- [ ] Performance boa em mobile

---

## 📊 Estimativa Total de Tempo

| Fase | Escopo | Tempo Estimado |
|------|--------|----------------|
| 6 | Moderação & Segurança | 2 semanas (80h) |
| 7 | Analytics & Insights | 1-2 semanas (40-80h) |
| 8 | Mobile & PWA | 1-2 semanas (40-80h) |
| **Total Fases 6-8** | | **4-6 semanas** |

---

## 🎯 Priorização Recomendada

### Must Have (Fase 6)
1. Report system
2. Block/Mute users
3. Basic moderation tools

### Should Have (Fase 7)
1. User analytics básicas
2. Post insights
3. Admin dashboard

### Nice to Have (Fase 8)
1. PWA setup
2. Mobile optimizations
3. Offline mode
4. Native features

---

## 📝 Notas de Implementação

### Moderação
- Considerar GDPR/LGPD para reports
- Logs de moderação para compliance
- Appeal process para usuários

### Analytics
- Privacy-first: aggregate data only
- GDPR compliance
- Opt-out mechanism

### Mobile/PWA
- Testar em dispositivos reais
- iOS Safari tem limitações PWA
- Android Chrome tem melhor suporte

---

**Conclusão**: Com as 8 fases completas, teremos um sistema social completo e profissional, pronto para produção.

**Tempo total estimado**: 12-16 semanas de desenvolvimento full-time.
