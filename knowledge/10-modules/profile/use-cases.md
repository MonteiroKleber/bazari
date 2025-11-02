# Profile Module - Use Cases

## 👤 Actors

- **User** - Usuário da plataforma
- **Viewer** - Outro usuário visualizando perfil
- **System** - Backend API
- **Reputation Worker** - Worker assíncrono de reputação

---

## 📋 Core Use Cases

### UC-01: Create Profile (Auto on First Login)

**Actor:** System
**Goal:** Criar perfil automaticamente após primeiro login
**Preconditions:** User autenticado, sem Profile existente

**Main Flow:**
1. Auth module autentica User
2. System verifica se User.profile existe
3. Se não existe, System gera handle único (`{randomName}_{4digits}`)
4. System valida handle (disponível, formato correto)
5. System cria Profile com valores padrão
6. System retorna Profile para User
7. User é redirecionado para `/app` (dashboard mostra prompt "Complete seu perfil")

**Alternative Flow 3a:** Handle collision
- 3a.1. System regenera handle
- 3a.2. Retorna ao passo 4

---

### UC-02: Complete Profile

**Actor:** User
**Goal:** Completar informações do perfil
**Preconditions:** Profile existe

**Main Flow:**
1. User acessa `/app/profile/edit`
2. System exibe formulário com dados atuais
3. User edita:
   - displayName
   - bio (markdown)
   - external links (Twitter, GitHub, etc.)
4. User faz upload de avatar (→ Media module)
5. User faz upload de banner (→ Media module)
6. User clica "Save"
7. System valida dados (displayName: 1-50 chars, bio: max 500 chars)
8. System atualiza Profile
9. System retorna sucesso
10. User vê perfil atualizado

**Alternative Flow 7a:** Validation error
- 7a.1. System retorna erros específicos
- 7a.2. User corrige e tenta novamente

---

### UC-03: View Public Profile

**Actor:** Viewer
**Goal:** Visualizar perfil público de outro usuário
**Preconditions:** Profile existe

**Main Flow:**
1. Viewer acessa `/u/:handle` ou clica em handle de outro user
2. System busca Profile por handle
3. System busca badges do Profile (top 5)
4. System busca seller profiles (se existir)
5. System busca samples de followers/following (5 cada)
6. Se Viewer autenticado:
   - System verifica se é próprio perfil
   - System verifica se já segue
7. System retorna:
   - Profile info (handle, displayName, bio, avatar, banner)
   - Reputation (score, tier)
   - Counts (followers, following, posts)
   - Badges
   - Seller profile (se existir)
   - Viewer context (isSelf, isFollowing)
8. Viewer vê perfil completo

**Alternative Flow 2a:** Profile not found
- 2a.1. System retorna 404
- 2a.2. Frontend exibe "Perfil não encontrado"

---

### UC-04: Follow User

**Actor:** User
**Goal:** Seguir outro usuário
**Preconditions:** Autenticado, não está seguindo o usuário

**Main Flow:**
1. User clica "Follow" no perfil de outro usuário
2. Client faz `POST /api/profiles/:handle/follow`
3. System valida que User não está seguindo
4. System cria registro Follow
5. System incrementa followingCount (User)
6. System incrementa followersCount (Target)
7. System emite evento ReputationEvent (+5 para Target)
8. System emite Notification (tipo: FOLLOW)
9. System retorna sucesso
10. UI atualiza botão para "Following"

**Alternative Flow 3a:** Already following
- 3a.1. System retorna 400 "Already following"
- 3a.2. UI mostra erro

**Alternative Flow 3b:** Self-follow attempt
- 3b.1. System retorna 400 "Cannot follow yourself"

---

### UC-05: Unfollow User

**Actor:** User
**Goal:** Deixar de seguir usuário
**Preconditions:** Está seguindo o usuário

**Main Flow:**
1. User clica "Unfollow"
2. Client faz `DELETE /api/profiles/:handle/follow`
3. System valida que User está seguindo
4. System deleta registro Follow
5. System decrementa followingCount (User)
6. System decrementa followersCount (Target)
7. System retorna sucesso
8. UI atualiza botão para "Follow"

---

### UC-06: Change Handle

**Actor:** User
**Goal:** Alterar handle do perfil (feature paga)
**Preconditions:** Profile existe, saldo suficiente (10 BZR)

**Main Flow:**
1. User acessa `/app/profile/edit`
2. User clica "Change Handle"
3. System exibe modal com:
   - Input para novo handle
   - Preview da URL (`/u/{new_handle}`)
   - Fee: 10 BZR
4. User insere novo handle (`alice`)
5. System valida handle:
   - Formato: lowercase, 3-20 chars, apenas alphanumeric + underscore
   - Disponível (não existe no DB)
6. User confirma e assina transação (10 BZR)
7. System verifica pagamento
8. System atualiza Profile.handle
9. System registra HandleHistory (oldHandle, newHandle, blockNumber)
10. System retorna sucesso
11. User é redirecionado para `/u/alice`

**Alternative Flow 5a:** Handle invalid format
- 5a.1. System retorna erro "Handle must be 3-20 lowercase alphanumeric characters"

**Alternative Flow 5b:** Handle taken
- 5b.1. System retorna erro "Handle already taken"
- 5b.2. System sugere alternativas (`alice_2`, `alice_bzr`, etc.)

**Alternative Flow 6a:** Insufficient balance
- 6a.1. System retorna erro "Insufficient balance"
- 6a.2. UI mostra link para P2P exchange

---

### UC-07: View Followers List

**Actor:** User
**Goal:** Ver lista completa de seguidores
**Preconditions:** Profile existe

**Main Flow:**
1. User acessa `/u/:handle/followers`
2. System busca follows com followingId = profileId
3. System pagina resultados (cursor-based, 50 por página)
4. System retorna lista com:
   - handle, displayName, avatarUrl
   - reputationTier
   - isFollowing (se viewer autenticado)
5. User vê lista
6. User pode clicar em perfil ou seguir diretamente

---

### UC-08: View Following List

**Actor:** User
**Goal:** Ver lista de quem o usuário segue
**Preconditions:** Profile existe

**Main Flow:**
1. User acessa `/u/:handle/following`
2. System busca follows com followerId = profileId
3. System pagina resultados
4. System retorna lista (mesma estrutura de followers)
5. User vê lista

---

### UC-09: Search Profiles

**Actor:** User
**Goal:** Buscar perfis por handle ou nome
**Preconditions:** Autenticado (opcional)

**Main Flow:**
1. User digita query na busca (`alice`)
2. Client faz `GET /api/profiles/search?q=alice`
3. System busca em Profile:
   - handle LIKE %alice%
   - OR displayName LIKE %alice%
4. System ordena por:
   - Exact match primeiro
   - Reputation score (desc)
   - Followers count (desc)
5. System retorna top 20 resultados
6. User vê lista de perfis
7. User pode clicar para ver perfil completo

**Alternative Flow 3a:** No results
- 3a.1. System retorna lista vazia
- 3a.2. UI exibe "Nenhum perfil encontrado"

---

### UC-10: Get Reputation History

**Actor:** User
**Goal:** Ver histórico de eventos de reputação
**Preconditions:** Profile existe

**Main Flow:**
1. User acessa `/app/profile/reputation`
2. Client faz `GET /api/profiles/me/reputation`
3. System busca ProfileReputationEvent do profileId
4. System ordena por createdAt desc
5. System retorna eventos:
   - eventCode, delta, newTotal, reason, emittedBy
   - blockNumber, extrinsicId
6. User vê timeline de eventos
7. User pode filtrar por tipo (ORDER, DELIVERY, SOCIAL, etc.)

---

## 🏆 Reputation Use Cases

### UC-R1: Award Reputation (Automated)

**Actor:** Reputation Worker
**Goal:** Atribuir pontos de reputação após evento
**Preconditions:** Evento emitido (ORDER_COMPLETED, etc.)

**Main Flow:**
1. System emite evento (ex: ORDER_COMPLETED)
2. Reputation Worker escuta evento
3. Worker busca Profile do User
4. Worker calcula delta baseado em regras (+50 para ORDER_COMPLETED)
5. Worker atualiza reputationScore
6. Worker recalcula tier:
   - 0-199: bronze
   - 200-499: silver
   - 500-999: gold
   - 1000-2499: platinum
   - 2500+: diamond
7. Se tier mudou:
   - Worker emite Notification (REPUTATION_TIER_UP)
   - Worker emite Achievement (se existir)
8. Worker registra ProfileReputationEvent
9. Worker retorna sucesso

---

### UC-R2: Decay Reputation (Scheduled)

**Actor:** Reputation Worker (Cron)
**Goal:** Decay de reputação por inatividade
**Preconditions:** Profile sem atividade >30 dias

**Main Flow:**
1. Worker roda diariamente (cron)
2. Worker busca Profiles com lastActiveAt < 30 dias atrás
3. Para cada Profile:
   - Worker calcula decay: `-1 ponto por dia de inatividade`
   - Worker atualiza reputationScore (min: 0)
   - Worker recalcula tier
   - Worker registra evento (REPUTATION_DECAY)
4. Worker emite notificação se tier caiu

**Note:** Feature futura, não implementada ainda

---

## 📊 Analytics Use Cases

### UC-A1: Track Profile Views

**Actor:** System
**Goal:** Rastrear visualizações de perfil para analytics

**Main Flow:**
1. User visualiza perfil público (UC-03)
2. System registra UserInteraction:
   - targetType: PROFILE
   - targetId: profileId
   - interactionType: VIEW
3. System retorna perfil normalmente
4. Analytics module agrega views por período

---

## 🔐 Security Use Cases

### UC-S1: Prevent Handle Squatting

**Attack:** Attacker registra handles populares (@bitcoin, @eth, etc.)

**Defense:**
1. System reserva lista de handles protegidos (reserved_handles table)
2. Ao tentar usar handle reservado, System retorna erro
3. Apenas admins podem liberar handles reservados
4. Handles de figuras públicas verificadas são reservados automaticamente

---

**Document Owner:** Profile Module Team
**Last Updated:** 2025-11-02
**Version:** 1.0.0
