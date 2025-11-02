# Profile Module - Vision & Purpose

## 🎯 Vision

**"Prover identidade digital soberana, portável e verificável para todos os usuários da plataforma Bazari, integrando reputação on-chain e social networking."**

---

## 📋 Purpose

O módulo **Profile** é um módulo **transversal** responsável por:

1. **Digital Identity** - Identidade única e portável (DID - Decentralized Identifier)
2. **Social Networking** - Follow/unfollow, network graph
3. **Reputation System** - Pontuação e tier on-chain
4. **Verification** - Badges e verificação de identidade
5. **User Discovery** - Busca e sugestões de perfis

---

## 🌟 Key Principles

### 1. Self-Sovereign Identity
- Usuário é dono do seu perfil (NFT on-chain)
- Portabilidade entre plataformas
- Metadados armazenados em IPFS
- Handle único e transferível

### 2. Reputation-Based
- Reputação acumulada através de ações
- Tiers: Bronze → Silver → Gold → Platinum → Diamond
- On-chain e verificável
- Não pode ser comprada, apenas ganhada

### 3. Privacy-First
- Dados pessoais off-chain (PostgreSQL)
- Metadados públicos on-chain (IPFS)
- Controle granular de privacidade
- GDPR compliant

### 4. Social Graph
- Network effect (followers/following)
- Influenciadores e comunidades
- Recommendations baseadas em grafo
- Feed algorítmico personalizado

---

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Web)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  ProfileEditPage                              │  │
│  │  - Update bio, avatar, banner                 │  │
│  │  - Manage external links                      │  │
│  │  - Change handle (fee required)               │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  ProfilePublicPage                            │  │
│  │  - Display profile info                       │  │
│  │  - Followers/following lists                  │  │
│  │  - Posts feed                                 │  │
│  │  - Badges & achievements                      │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  DiscoverPeoplePage                           │  │
│  │  - Trending profiles                          │  │
│  │  - Recommendations                            │  │
│  │  - Search                                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ▼ HTTPS
┌─────────────────────────────────────────────────────┐
│                   Backend (API)                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Profile Service                              │  │
│  │  - Create/Update Profile                      │  │
│  │  - Follow/Unfollow                            │  │
│  │  - Handle Validation                          │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Reputation Service                           │  │
│  │  - Calculate Score                            │  │
│  │  - Assign Tier                                │  │
│  │  - Track Events                               │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Suggestion Service                           │  │
│  │  - Recommend Profiles                         │  │
│  │  - Trending Calculation                       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Database (PostgreSQL)               │
│  ┌───────────────────────────────────────────────┐  │
│  │  Profile                                      │  │
│  │  - handle, displayName, bio, avatarUrl        │  │
│  │  - reputationScore, reputationTier            │  │
│  │  - onChainProfileId (NFT ID)                  │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Follow                                       │  │
│  │  - followerId, followingId                    │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  ProfileBadge                                 │  │
│  │  - code, label, blockNumber                   │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  ProfileReputationEvent                       │  │
│  │  - eventCode, delta, newTotal                 │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  HandleHistory                                │  │
│  │  - oldHandle, newHandle, changedAt            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│              Blockchain (Substrate - Future)         │
│  ┌───────────────────────────────────────────────┐  │
│  │  Identity Pallet                              │  │
│  │  - NFT Profile (onChainProfileId)             │  │
│  │  - Metadata CID (IPFS)                        │  │
│  │  - Reputation Score (on-chain)                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Profile Lifecycle

### 1. Profile Creation (Auto on First Login)

```
User Logs In (UC-01 Auth) → No Profile Exists
                           → Generate Unique Handle (alice_1234)
                           → Create Profile Record
                           → Set Default Values
                           → Return Profile
```

### 2. Profile Completion

```
User → Edit Profile
     → Update displayName, bio
     → Upload avatar (media module)
     → Add external links
     → Save
     → Profile Completed
```

### 3. Handle Change (Paid Feature)

```
User → Request Handle Change
     → Validate New Handle (unique, format)
     → Pay Fee (10 BZR)
     → Update Handle
     → Record in HandleHistory
     → Update onChainProfileId metadata (future)
```

### 4. Reputation Growth

```
User Completes Action → Event Emitted (ORDER_COMPLETED, DELIVERY_DONE, etc)
                      → Reputation Worker Processes Event
                      → Calculate Delta (+50 points)
                      → Update reputationScore
                      → Recalculate Tier
                      → Record in ProfileReputationEvent
                      → Emit Notification (if tier upgraded)
```

---

## 🏆 Reputation System

### Tiers & Thresholds

| Tier | Score Range | Icon | Benefits |
|------|-------------|------|----------|
| **Bronze** | 0 - 199 | 🥉 | Basic access |
| **Silver** | 200 - 499 | 🥈 | Priority support |
| **Gold** | 500 - 999 | 🥇 | Featured listings |
| **Platinum** | 1000 - 2499 | 💎 | Lower fees, governance vote |
| **Diamond** | 2500+ | 💠 | VIP benefits, council candidate |

### Event Types & Deltas

| Event Code | Delta | Trigger |
|------------|-------|---------|
| ORDER_COMPLETED | +50 | Buyer receives and confirms order |
| ORDER_COMPLETED_SELLER | +30 | Seller ships on time |
| DELIVERY_DONE | +40 | Deliverer completes delivery |
| POST_LIKED | +1 | Post receives like |
| POST_COMMENTED | +2 | Post receives comment |
| FOLLOW_RECEIVED | +5 | Profile receives new follower |
| BADGE_ISSUED | +100 | Profile receives official badge |
| ACHIEVEMENT_UNLOCKED | +20 | User unlocks achievement |
| QUEST_COMPLETED | +10 | User completes daily quest |
| REPORT_VALIDATED | -100 | User's content is moderated |
| ORDER_DISPUTED | -50 | Order goes to dispute |

---

## 🎨 Profile Customization

### Avatar & Banner
- **Avatar**: 512x512px, max 5MB, IPFS-hosted
- **Banner**: 1500x500px, max 10MB, IPFS-hosted
- Formats: JPG, PNG, WebP

### Bio
- Max 500 characters
- Markdown supported
- Auto-link URLs

### External Links
- Max 5 links
- Supported: Twitter, GitHub, Website, LinkedIn, Instagram

---

## 🔍 Discovery & Recommendations

### Trending Profiles
- Algorithm: Growth rate of followers (last 7 days)
- Decay function: 0.5^(days_since_spike)
- Min followers: 10

### Recommendations
- **Similar Interests**: Based on followed profiles
- **Popular in Community**: High reputation in same city
- **New & Rising**: Recent profiles with high engagement

### Search
- Full-text search on handle + displayName
- Fuzzy matching (Levenshtein distance)
- Filters: tier, verified, has_store

---

## 📊 Metrics & Monitoring

### Success Metrics

| Metric | Target |
|--------|--------|
| Profile Completion Rate | >80% |
| Avg Followers per User | >10 |
| Avg Reputation Score | >200 (Silver) |
| Handle Change Rate | <5% |

### Engagement Metrics

| Metric | Target |
|--------|--------|
| Daily Active Profiles | >1000 |
| Follow Actions per Day | >500 |
| Profile Views per Day | >5000 |

---

## 🔮 Future Enhancements

### 1. On-Chain Profile (NFT)
- Mint profile as NFT on first creation
- Metadata CID on IPFS
- Transfer profile ownership
- Burn profile (permanent delete)

### 2. Verified Badges
- Blue checkmark for verified identities
- KYC integration (optional)
- Domain verification (own website)
- Social media linking (Twitter OAuth)

### 3. Profile Themes
- Custom color schemes
- Layout variations (grid, list, card)
- Dark/light mode preferences

### 4. Advanced Privacy
- Private profiles (followers-only)
- Hidden follow lists
- Anonymous mode (no profile pic)

### 5. Multi-Identity
- Multiple profiles per wallet
- Switch between personas
- Reputation isolation per profile

---

## 🎓 Developer Guide

### Creating Profile Programmatically

```typescript
import { prisma } from '../lib/prisma.js'

async function createProfile(userId: string, handle: string) {
  const profile = await prisma.profile.create({
    data: {
      userId,
      handle,
      displayName: handle, // Default to handle
      reputationScore: 0,
      reputationTier: 'bronze',
    }
  })

  return profile
}
```

### Following User

```typescript
async function followUser(followerId: string, followingId: string) {
  await prisma.$transaction([
    prisma.follow.create({
      data: { followerId, followingId }
    }),
    prisma.profile.update({
      where: { id: followerId },
      data: { followingCount: { increment: 1 } }
    }),
    prisma.profile.update({
      where: { id: followingId },
      data: { followersCount: { increment: 1 } }
    })
  ])
}
```

---

**Document Owner:** Profile Module Team
**Last Updated:** 2025-11-02
**Version:** 1.0.0
**Status:** ✅ Implemented & Production-Ready
