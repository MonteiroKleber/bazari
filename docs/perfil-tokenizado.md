# Guia do Desenvolvedor: Perfil Tokenizado (NFT Soulbound)

Sistema completo de identidade descentralizada baseado em NFTs soulbound (não transferíveis) com reputação on-chain e badges verificáveis.

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fluxo de Implementação](#fluxo-de-implementação)
4. [Integração Frontend](#integração-frontend)
5. [Integração Backend](#integração-backend)
6. [Integração Blockchain](#integração-blockchain)
7. [Trabalhando com IPFS](#trabalhando-com-ipfs)
8. [Testes](#testes)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Visão Geral

### O Que São Perfis Tokenizados?

Perfis tokenizados são **NFTs soulbound** (não transferíveis) que representam a identidade de um usuário na Bazari Chain. Cada perfil:

- ✅ É único por conta blockchain (1:1)
- ✅ Não pode ser transferido ou vendido
- ✅ Possui reputação on-chain (score numérico)
- ✅ Acumula badges verificáveis
- ✅ Mantém histórico imutável de handles
- ✅ Armazena metadados em IPFS

### Casos de Uso

1. **Identidade Soberana**: Usuários controlam sua identidade sem intermediários
2. **Reputação Portável**: Score de reputação transferível entre DApps
3. **Badges Verificáveis**: Conquistas e certificações on-chain
4. **Anti-Sybil**: Dificulta criação de múltiplas identidades
5. **Histórico Imutável**: Registro permanente de ações e reputação

---

## Arquitetura

### Camadas do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  • Componentes de UI (ReputationBadge, BadgesList)      │
│  • Hooks (useProfileReputation)                          │
│  • Páginas (ProfilePublicPage, ProfileEditPage)         │
└────────────────────┬────────────────────────────────────┘
                     │ REST API + WebSocket
┌────────────────────▼────────────────────────────────────┐
│                Backend (Node.js/Fastify)                 │
│  • API Routes (/profiles, /auth)                         │
│  • Blockchain Integration (profilesChain.ts)             │
│  • IPFS Integration (ipfs.ts)                            │
│  • Database (Prisma + PostgreSQL)                        │
└─────────┬──────────────────────────────┬────────────────┘
          │                              │
          │ @polkadot/api                │ IPFS HTTP API
          │                              │
┌─────────▼──────────────────┐  ┌────────▼───────────────┐
│   Bazari Chain (Substrate)  │  │   IPFS (Kubo/Pinata)   │
│  • pallet-bazari-identity   │  │  • Profile Metadata    │
│  • Storage Maps             │  │  • Avatar/Banner Images│
│  • Events                   │  │  • CID References      │
└─────────────────────────────┘  └────────────────────────┘
```

### Componentes Principais

#### 1. Blockchain (Substrate Pallet)

- **Arquivo**: `/bazari-chain/pallets/bazari-identity/src/lib.rs`
- **Responsabilidade**: Armazenamento on-chain, lógica de negócio, eventos
- **Tecnologias**: Rust, FRAME, Substrate

#### 2. Backend (Node.js)

- **Arquivos**:
  - `/bazari/apps/api/src/routes/profiles.ts` - API endpoints
  - `/bazari/apps/api/src/lib/profilesChain.ts` - Integração blockchain
  - `/bazari/apps/api/src/lib/ipfs.ts` - Integração IPFS
  - `/bazari/apps/api/prisma/schema.prisma` - Schema do banco
- **Responsabilidade**: API REST, sincronização blockchain, cache, business logic
- **Tecnologias**: TypeScript, Fastify, Prisma, @polkadot/api

#### 3. Frontend (React)

- **Arquivos**:
  - `/bazari/apps/web/src/components/profile/ReputationBadge.tsx`
  - `/bazari/apps/web/src/components/profile/BadgesList.tsx`
  - `/bazari/apps/web/src/hooks/useProfileReputation.ts`
  - `/bazari/apps/web/src/pages/ProfilePublicPage.tsx`
  - `/bazari/apps/web/src/pages/ProfileEditPage.tsx`
- **Responsabilidade**: UI/UX, interação com API, exibição de dados
- **Tecnologias**: React, TypeScript, TailwindCSS, shadcn/ui

---

## Fluxo de Implementação

### Sprint 1-2: Blockchain Pallet

#### 1. Criar Pallet Base

```bash
cd bazari-chain/pallets
mkdir bazari-identity
cd bazari-identity
cargo init --lib
```

#### 2. Configurar `Cargo.toml`

```toml
[package]
name = "pallet-bazari-identity"
version = "0.1.0"
edition = "2021"

[dependencies]
codec = { package = "parity-scale-codec", version = "3.7.4", default-features = false, features = ["derive"] }
scale-info = { version = "2.11.6", default-features = false, features = ["derive"] }
frame-support = { version = "40.1.0", default-features = false }
frame-system = { version = "40.1.0", default-features = false }
sp-runtime = { version = "41.1.0", default-features = false }

[features]
default = ["std"]
std = [
    "codec/std",
    "scale-info/std",
    "frame-support/std",
    "frame-system/std",
    "sp-runtime/std",
]
```

#### 3. Implementar Storage Items

```rust
#[pallet::storage]
pub type NextProfileId<T> = StorageValue<_, ProfileId, ValueQuery>;

#[pallet::storage]
pub type OwnerProfile<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, ProfileId, OptionQuery>;

#[pallet::storage]
pub type Reputation<T: Config> = StorageMap<_, Blake2_128Concat, ProfileId, i32, ValueQuery>;

#[pallet::storage]
pub type Badges<T: Config> = StorageMap<_, Blake2_128Concat, ProfileId, BadgeListOf<T>, ValueQuery>;
```

#### 4. Implementar Extrinsics

```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    #[pallet::call_index(0)]
    #[pallet::weight(T::DbWeight::get().reads_writes(2, 4))]
    pub fn mint_profile(
        origin: OriginFor<T>,
        owner: T::AccountId,
        handle: Vec<u8>,
        cid: Vec<u8>
    ) -> DispatchResult {
        T::MintOrigin::ensure_origin(origin)?;

        ensure!(!OwnerProfile::<T>::contains_key(&owner), Error::<T>::AlreadyHasProfile);

        let profile_id = NextProfileId::<T>::get();
        NextProfileId::<T>::put(profile_id + 1);

        let handle_bounded = HandleOf::<T>::try_from(handle.clone())
            .map_err(|_| Error::<T>::HandleTooLong)?;

        OwnerProfile::<T>::insert(&owner, profile_id);
        ProfileOwner::<T>::insert(profile_id, &owner);
        HandleToProfile::<T>::insert(&handle_bounded, profile_id);

        Self::deposit_event(Event::ProfileMinted { profile_id, owner, handle, cid });
        Ok(())
    }
}
```

#### 5. Escrever Testes

```rust
#[test]
fn mint_profile_creates_new_profile() {
    new_test_ext().execute_with(|| {
        let owner = 1u64;
        let handle = b"alice".to_vec();
        let cid = b"QmTest".to_vec();

        assert_ok!(BazariIdentity::mint_profile(RuntimeOrigin::root(), owner, handle.clone(), cid.clone()));

        let profile_id = BazariIdentity::owner_profile(owner).unwrap();
        assert_eq!(profile_id, 1);

        let events = System::events();
        assert!(matches!(events[0].event,
            RuntimeEvent::BazariIdentity(Event::ProfileMinted { .. })
        ));
    });
}
```

#### 6. Integrar no Runtime

```rust
// runtime/src/lib.rs
#[runtime::pallet_index(11)]
pub type BazariIdentity = pallet_bazari_identity;

// runtime/src/configs/mod.rs
impl pallet_bazari_identity::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type MaxCidLen = ConstU32<96>;
    type MaxHandleLen = ConstU32<32>;
    type MaxBadges = ConstU32<50>;
    type HandleCooldownBlocks = ConstU32<432000>; // 30 days
    type MintOrigin = EnsureRoot<AccountId>;
    type UpdateOrigin = EnsureRoot<AccountId>;
    type ModuleOrigin = EnsureRoot<AccountId>;
}
```

---

### Sprint 3-4: Backend Integration

#### 1. Atualizar Schema Prisma

```prisma
model Profile {
  id               String   @id @default(cuid())
  userId           String   @unique
  handle           String   @unique
  displayName      String
  bio              String?
  avatarCid        String?
  bannerCid        String?

  // Blockchain fields
  onChainProfileId BigInt?  @unique @db.BigInt
  reputationScore  Int      @default(0)
  reputationTier   String   @default("bronze")
  metadataCid      String?
  isVerified       Boolean  @default(false)
  lastChainSync    DateTime?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user             User     @relation(fields: [userId], references: [id])
  badges           ProfileBadge[]
  reputationEvents ProfileReputationEvent[]
  handleHistory    HandleHistory[]
}

model ProfileBadge {
  id          String   @id @default(cuid())
  profileId   String
  code        String
  label       Json
  issuedBy    String
  issuedAt    DateTime
  blockNumber BigInt   @db.BigInt
  revokedAt   DateTime?

  profile     Profile  @relation(fields: [profileId], references: [id])

  @@unique([profileId, code])
}
```

#### 2. Criar Migração

```bash
cd apps/api
npx prisma migrate dev --name add_profile_nft
```

#### 3. Implementar Integração Blockchain

```typescript
// src/lib/profilesChain.ts
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';

let api: ApiPromise | null = null;
let sudoAccount: any = null;

export async function getApi(): Promise<ApiPromise> {
  if (api) return api;

  const wsProvider = new WsProvider(process.env.CHAIN_WS_URL || 'ws://127.0.0.1:9944');
  api = await ApiPromise.create({ provider: wsProvider });

  return api;
}

export async function getSudoAccount() {
  if (sudoAccount) return sudoAccount;

  const keyring = new Keyring({ type: 'sr25519' });
  sudoAccount = keyring.addFromUri(process.env.SUDO_SEED || '//Alice');

  return sudoAccount;
}

export async function mintProfileOnChain(
  address: string,
  handle: string,
  cid: string
): Promise<bigint> {
  const api = await getApi();
  const sudo = await getSudoAccount();

  return new Promise((resolve, reject) => {
    const tx = (api.tx as any).bazariIdentity.mintProfile(address, handle, cid);

    tx.signAndSend(sudo, ({ status, events, dispatchError }: any) => {
      if (dispatchError) {
        reject(new Error(dispatchError.toString()));
        return;
      }

      if (status.isInBlock) {
        let profileId: bigint | null = null;

        events.forEach(({ event }: any) => {
          if (api.events.bazariIdentity.ProfileMinted.is(event)) {
            const [profileIdRaw] = event.data;
            profileId = BigInt(profileIdRaw.toString());
          }
        });

        if (profileId !== null) {
          resolve(profileId);
        } else {
          reject(new Error('ProfileMinted event not found'));
        }
      }
    });
  });
}

export async function getOnChainProfile(profileId: bigint): Promise<any> {
  const api = await getApi();

  const owner = await api.query.bazariIdentity.profileOwner(profileId.toString());
  const cid = await api.query.bazariIdentity.metadataCid(profileId.toString());
  const reputation = await api.query.bazariIdentity.reputation(profileId.toString());
  const badges = await api.query.bazariIdentity.badges(profileId.toString());

  return {
    profileId,
    owner: owner.toString(),
    metadataCid: cid.toString(),
    reputation: parseInt(reputation.toString()),
    badges: badges.toJSON()
  };
}
```

#### 4. Modificar Login para Mint Automático

```typescript
// src/routes/auth.ts
app.post<{ Body: SIWSLoginRequest }>('/auth/login-siws', async (request, reply) => {
  // 1. Verificar assinatura SIWS
  const { message, signature } = request.body;
  const isValid = await verifySIWS(message, signature);

  if (!isValid) {
    return reply.status(400).send({ error: 'Invalid signature' });
  }

  // 2. Upsert user
  const user = await prisma.user.upsert({
    where: { address: message.address },
    update: { lastLoginAt: new Date() },
    create: { address: message.address }
  });

  // 3. Check if profile exists
  let profile = await prisma.profile.findUnique({ where: { userId: user.id } });

  if (!profile) {
    // 4. Generate handle
    const baseHandle = `user_${user.address.slice(0, 8)}`;
    let finalHandle = baseHandle;
    let counter = 1;

    while (await prisma.profile.findUnique({ where: { handle: finalHandle } })) {
      finalHandle = `${baseHandle}_${counter}`;
      counter++;
    }

    // 5. Create temporary profile
    profile = await prisma.profile.create({
      data: {
        userId: user.id,
        handle: finalHandle,
        displayName: finalHandle
      }
    });

    try {
      // 6. Generate IPFS metadata
      const metadata = createInitialMetadata(profile);
      const cid = await publishProfileMetadata(metadata);

      // 7. MINT NFT ON-CHAIN (blocking ~6s)
      const profileId = await mintProfileOnChain(user.address, finalHandle, cid);

      // 8. Update profile with onChainProfileId
      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: {
          onChainProfileId: profileId,
          metadataCid: cid,
          lastChainSync: new Date()
        }
      });

      console.log(`✅ Profile NFT minted: #${profileId} for ${finalHandle}`);
    } catch (error) {
      // Rollback on failure
      await prisma.profile.delete({ where: { id: profile.id } });
      console.error('Failed to mint profile NFT:', error);
      return reply.status(500).send({ error: 'Failed to create profile on blockchain' });
    }
  }

  // 9. Generate JWT
  const token = await reply.jwtSign({ userId: user.id });

  return reply.send({ token, user, profile });
});
```

#### 5. Implementar Endpoints de Reputação/Badges

```typescript
// src/routes/profiles.ts
app.get<{ Params: { handle: string } }>('/profiles/:handle/reputation', async (request, reply) => {
  const { handle } = request.params;

  const profile = await prisma.profile.findUnique({ where: { handle } });
  if (!profile) {
    return reply.status(404).send({ error: 'Profile not found' });
  }

  const events = await prisma.profileReputationEvent.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return reply.send({ events });
});

app.get<{ Params: { handle: string } }>('/profiles/:handle/badges', async (request, reply) => {
  const { handle } = request.params;

  const profile = await prisma.profile.findUnique({ where: { handle } });
  if (!profile) {
    return reply.status(404).send({ error: 'Profile not found' });
  }

  const badges = await prisma.profileBadge.findMany({
    where: {
      profileId: profile.id,
      revokedAt: null
    },
    orderBy: { issuedAt: 'desc' }
  });

  return reply.send({ badges });
});
```

---

### Sprint 5: Frontend Integration

#### 1. Criar Helper de Reputação

```typescript
// src/lib/reputation.ts
export function getTierVariant(tier: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (tier) {
    case 'bronze': return 'default';
    case 'prata': return 'secondary';
    case 'ouro': return 'outline';
    case 'diamante': return 'outline';
    default: return 'default';
  }
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case 'bronze': return 'text-gray-600';
    case 'prata': return 'text-blue-600';
    case 'ouro': return 'text-yellow-600';
    case 'diamante': return 'text-purple-600';
    default: return 'text-gray-600';
  }
}

export function calculateTier(score: number): string {
  if (score >= 1000) return 'diamante';
  if (score >= 500) return 'ouro';
  if (score >= 100) return 'prata';
  return 'bronze';
}
```

#### 2. Criar Componente de Badge de Reputação

```typescript
// src/components/profile/ReputationBadge.tsx
import { Badge } from '@/components/ui/badge';
import { getTierVariant, getTierColor, getTierLabel } from '@/lib/reputation';

interface ReputationBadgeProps {
  score: number;
  tier: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ReputationBadge({
  score,
  tier,
  size = 'md',
  showLabel = true
}: ReputationBadgeProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`font-bold ${sizeClasses[size]}`}>{score}</span>
      {showLabel && (
        <Badge variant={getTierVariant(tier)}>
          <span className={getTierColor(tier)}>
            {getTierLabel(tier)}
          </span>
        </Badge>
      )}
    </div>
  );
}
```

#### 3. Criar Componente de Lista de Badges

```typescript
// src/components/profile/BadgesList.tsx
import { Badge } from '@/components/ui/badge';

interface BadgesListProps {
  badges: Array<{
    code: string;
    label: { pt: string; en: string; es: string };
    issuedBy: string;
  }>;
  limit?: number;
  lang?: 'pt' | 'en' | 'es';
}

export function BadgesList({ badges, limit, lang = 'pt' }: BadgesListProps) {
  const displayed = limit ? badges.slice(0, limit) : badges;
  const remaining = limit && badges.length > limit ? badges.length - limit : 0;

  return (
    <div className="flex flex-wrap gap-2">
      {displayed.map((badge) => (
        <Badge
          key={badge.code}
          variant="outline"
          title={`${badge.label[lang]} - Emitido por: ${badge.issuedBy}`}
        >
          {badge.label[lang]}
        </Badge>
      ))}

      {remaining > 0 && (
        <Badge variant="ghost">+{remaining}</Badge>
      )}
    </div>
  );
}
```

#### 4. Criar Hook de Reputação

```typescript
// src/hooks/useProfileReputation.ts
import { useState, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';

export function useProfileReputation(handle: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res: any = await apiHelpers.getProfileReputation(handle);
        if (active) {
          setEvents(res.events || []);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load reputation');
          setLoading(false);
        }
      }
    })();

    return () => { active = false; };
  }, [handle]);

  return { events, loading, error };
}
```

#### 5. Integrar na Página de Perfil Público

```typescript
// src/pages/ProfilePublicPage.tsx
{data.profile.onChainProfileId && (
  <Card className="mb-6 bg-muted/30">
    <CardContent className="p-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Reputação</div>
          <ReputationBadge
            score={data.profile.reputation?.score ?? 0}
            tier={data.profile.reputation?.tier ?? 'bronze'}
            size="lg"
          />
        </div>

        {data.badges && data.badges.length > 0 && (
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Badges</div>
            <BadgesList badges={data.badges} limit={5} />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

---

## Trabalhando com IPFS

### Estrutura de Metadados

```typescript
export type ProfileMetadata = {
  schema_version: string;
  profile: {
    display_name: string;
    bio: string | null;
    avatar_cid: string | null;
    banner_cid: string | null;
    joined_at: string;
  };
  reputation: {
    score: number;
    tier: string;
    since: string;
  };
  badges: Array<{
    code: string;
    label: { pt: string; en: string; es: string };
    issued_by: string;
    issued_at: number;
  }>;
  penalties: Array<any>;
  links: {
    website?: string;
    twitter?: string;
    github?: string;
  };
};
```

### Publicar Metadados

```typescript
export async function publishProfileMetadata(data: ProfileMetadata): Promise<string> {
  const ipfsClient = getIPFSClient();
  const { cid } = await ipfsClient.add(JSON.stringify(data));
  return cid.toString();
}
```

### Recuperar Metadados

```typescript
export async function fetchProfileMetadata(cid: string): Promise<ProfileMetadata> {
  const ipfsClient = getIPFSClient();
  const chunks = [];

  for await (const chunk of ipfsClient.cat(cid)) {
    chunks.push(chunk);
  }

  const data = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(data);
}
```

---

## Testes

### Testes Unitários (Pallet)

```bash
cd bazari-chain/pallets/bazari-identity
cargo test
```

### Testes de Integração (Backend)

```typescript
// apps/api/src/routes/profiles.test.ts
import { test } from 'tap';
import { build } from '../app';

test('GET /profiles/:handle returns profile', async (t) => {
  const app = await build();

  const response = await app.inject({
    method: 'GET',
    url: '/profiles/alice'
  });

  t.equal(response.statusCode, 200);
  t.ok(response.json().profile);
  t.equal(response.json().profile.handle, 'alice');
});
```

### Testes E2E (Frontend)

```typescript
// apps/web/tests/profile-nft.spec.ts
import { test, expect } from '@playwright/test';

test('displays reputation badge on profile page', async ({ page }) => {
  await page.goto('/profiles/alice');

  const reputationBadge = page.locator('[data-testid="reputation-badge"]');
  await expect(reputationBadge).toBeVisible();

  const score = await reputationBadge.locator('.font-bold').textContent();
  expect(parseInt(score!)).toBeGreaterThanOrEqual(0);
});
```

---

## Deployment

### 1. Deploy Blockchain

```bash
cd bazari-chain
cargo build --release

# Start node
./target/release/bazari-chain \
  --dev \
  --tmp \
  --rpc-cors all \
  --ws-external
```

### 2. Deploy Backend

```bash
cd bazari/apps/api

# Build
npm run build

# Run migrations
npx prisma migrate deploy

# Start server
npm start
```

### 3. Deploy Frontend

```bash
cd bazari/apps/web

# Build
npm run build

# Deploy to Vercel/Netlify
vercel deploy --prod
```

### Variáveis de Ambiente

```env
# Backend (.env)
DATABASE_URL="postgresql://user:pass@localhost:5432/bazari"
CHAIN_WS_URL="ws://localhost:9944"
SUDO_SEED="//Alice"
IPFS_URL="http://localhost:5001"
JWT_SECRET="your-secret-key"

# Frontend (.env.local)
NEXT_PUBLIC_API_URL="https://api.bazari.dev"
NEXT_PUBLIC_CHAIN_WS_URL="wss://rpc.bazari.dev"
```

---

## Troubleshooting

### Problema: NFT Mint Falha

**Sintoma**: Erro 500 ao fazer login pela primeira vez

**Possíveis Causas**:
1. Chain node não está rodando
2. Sudo account sem fundos
3. Handle já existe on-chain

**Solução**:
```bash
# 1. Verificar node
curl -H "Content-Type: application/json" \
  -d '{"id":1,"jsonrpc":"2.0","method":"system_health"}' \
  http://localhost:9944

# 2. Verificar saldo sudo
# Via Polkadot.js Apps > Accounts

# 3. Verificar logs backend
tail -f logs/app.log | grep "mint"
```

### Problema: Reputação Não Atualiza

**Sintoma**: Score não muda após evento

**Solução**:
```typescript
// Verificar se módulo está autorizado
const api = await getApi();
const authorized = await api.query.bazariIdentity.authorizedModules();
console.log('Authorized modules:', authorized.toJSON());

// Autorizar módulo via sudo
await api.tx.sudo.sudo(
  api.tx.bazariIdentity.authorizeModule(1) // module_id = 1
).signAndSend(sudoAccount);
```

### Problema: IPFS CID Não Resolve

**Sintoma**: Metadados não carregam

**Solução**:
```bash
# Verificar IPFS daemon
ipfs id

# Verificar CID
ipfs cat <cid>

# Re-pin CID
ipfs pin add <cid>
```

---

## Recursos Adicionais

- [Documentação Substrate](https://docs.substrate.io/)
- [Polkadot.js API Docs](https://polkadot.js.org/docs/)
- [IPFS Docs](https://docs.ipfs.tech/)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Docs](https://react.dev/)

---

## Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'Add feature'`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## Licença

MIT-0

---

## Suporte

- **Discord**: https://discord.gg/bazari
- **GitHub Issues**: https://github.com/bazari/bazari/issues
- **Docs**: https://docs.bazari.dev
