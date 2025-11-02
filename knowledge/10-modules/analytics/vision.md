# Analytics Module - Vision & Purpose

## 🎯 Vision
**"Sistema de analytics focado em métricas de usuário e engajamento social, fornecendo insights sobre performance de posts, crescimento de seguidores, e otimizações de horários de postagem."**

## 📋 Purpose
1. **User Analytics** - Métricas pessoais de engajamento social (posts, likes, comments)
2. **Follower Growth** - Rastreamento temporal de crescimento de seguidores
3. **Engagement Insights** - Taxa de engajamento, melhores horários para postar
4. **Content Performance** - Top posts por engajamento, análise de performance
5. **Time Series Analysis** - Análise temporal de métricas (daily, weekly, monthly)

## 🌟 Key Principles
- **User-Centric** - Cada usuário vê apenas suas próprias métricas
- **Actionable Insights** - Dados úteis para decisões (ex: melhor horário para postar)
- **Time-Bounded** - Filtros por período (7d, 30d, 90d)
- **Privacy-First** - Analytics privado, não compartilhado publicamente
- **Real-Time** - Cálculos sob demanda a partir de dados primários (Post, PostLike, PostComment, Follow)

## 📊 Metrics Tracked

### Overview Metrics
- **Total Posts** - Número de posts no período
- **Total Likes** - Soma de likes em todos os posts
- **Total Comments** - Soma de comentários em todos os posts
- **Total Engagement** - likes + comments
- **Engagement Rate** - totalEngagement / totalPosts
- **Total Followers** - Contagem acumulativa de seguidores
- **New Followers** - Novos seguidores no período

### Time Series Metrics
- **Follower Growth** - Crescimento acumulativo de seguidores por dia
- **Engagement Over Time** - Taxa de engajamento diária (engagement / posts)

### Content Insights
- **Best Posting Times** - Top 5 horários com maior engajamento médio
- **Top Posts** - Top 10 posts por engajamento total

## 🔄 Data Sources
All analytics derived from existing entities:
- **Post** - Source for post counts, timestamps
- **PostLike** - Like counts per post
- **PostComment** - Comment counts per post
- **Follow** - Follower growth tracking

No dedicated analytics tables (computed on-demand).

## 🎯 Use Cases
1. **Creator Dashboard** - Content creators see performance metrics
2. **Growth Tracking** - Monitor follower acquisition over time
3. **Content Optimization** - Identify best times to post for maximum engagement
4. **Performance Benchmarking** - Compare current vs previous periods
5. **Top Content Discovery** - Find what content resonates most with audience

## 🔮 Future Features
- Store analytics (sales, revenue, conversion rate)
- Marketplace analytics (product views, cart abandonment)
- Delivery analytics (delivery times, success rates)
- DAO analytics (proposal pass rates, voter participation)
- P2P analytics (trade volumes, conversion funnel)
- Cohort analysis (user retention, lifetime value)
- A/B testing framework
- Real-time event streaming
- ML-powered predictions (expected engagement, viral potential)

**Status:** ✅ Implemented (Basic user/social analytics only)
