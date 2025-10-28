# FASE 6: P2P ZARI Frontend - Prompts de Execução

**Versão**: 1.0
**Data**: 28 de Outubro de 2025
**Duração Estimada**: 24 horas (3 dias)
**Dependências**: FASE 5 completa

---

## 📋 Visão Geral

Este documento contém 7 prompts sequenciais para implementação do frontend P2P ZARI no Bazari.

**Progresso**: 0/7 prompts executados

---

## 🎯 PROMPT 1: API Client Extension (1h)

### Objetivo
Estender o cliente P2P API com suporte a ZARI, adicionando novos métodos e interfaces.

### Contexto
- Arquivo: `/root/bazari/apps/web/src/modules/p2p/api.ts`
- Padrão existente: `getJSON()`, `postJSON()` de `@/lib/api`
- Referência backend: `/root/bazari/docs/fase002-final/zari/API-P2P-ZARI.md`

### Instruções

1. **Estender interface P2POffer**:
```typescript
export interface P2POffer {
  id: string;
  side: 'BUY_BZR' | 'SELL_BZR';
  priceBRLPerBZR: string;
  minBRL: string;
  maxBRL: string;
  ownerId: string;
  owner?: { handle?: string; displayName?: string; avatarUrl?: string };
  ownerStats?: { avgStars?: number; completionRate?: number; volume30dBRL?: number };
  status: string;
  // NOVOS CAMPOS ZARI:
  assetType?: 'BZR' | 'ZARI';
  assetId?: string | null;
  phase?: string | null;
  phasePrice?: string | null;
  priceBRLPerUnit?: string | null;
}
```

2. **Adicionar novos métodos ao p2pApi**:
```typescript
export const p2pApi = {
  // ... métodos existentes (manter todos)

  // NOVOS MÉTODOS ZARI:
  getZARIPhase: (): Promise<{
    phase: string;
    priceBZR: string;
    supplyLimit: string;
    supplySold: string;
    supplyRemaining: string;
    progressPercent: number;
    isActive: boolean;
    nextPhase: string | null;
  }> => getPublicJSON('/p2p/zari/phase'),

  getZARIStats: (): Promise<{
    phases: Array<{
      phase: string;
      priceBZR: string;
      supplyLimit: string;
      active: boolean;
      startBlock: string | null;
      endBlock: string | null;
    }>;
    activePhase: string | null;
    totalSold: string;
    totalP2PSupply: string;
    overallProgress: number;
    completedOrders: number;
  }> => getPublicJSON('/p2p/zari/stats'),

  escrowLock: (orderId: string, payload: { makerAddress: string }): Promise<{
    success: boolean;
    txHash: string;
    blockNumber: string;
    amount: string;
    assetType: 'BZR' | 'ZARI';
    message: string;
  }> => postJSON(`/p2p/orders/${orderId}/escrow-lock`, payload),

  escrowRelease: (orderId: string, payload: { takerAddress: string }): Promise<{
    success: boolean;
    txHash: string;
    blockNumber: string;
    amount: string;
    assetType: 'BZR' | 'ZARI';
    recipient: string;
    message: string;
  }> => postJSON(`/p2p/orders/${orderId}/escrow-release`, payload),
};
```

### Validação
- [ ] Arquivo compila sem erros TypeScript
- [ ] Todos os métodos existentes preservados
- [ ] Interfaces exportadas corretamente

---

## 🎯 PROMPT 2: Componentes Base ZARI (3h)

### Objetivo
Criar componentes reutilizáveis: ZARIPhaseBadge, AssetSelector.

### Contexto
- Diretório: `/root/bazari/apps/web/src/modules/p2p/components/`
- Usar shadcn/ui: Badge, Button, Card, Progress
- Padrão i18n: `const { t } = useTranslation()`

### Instruções

#### 2.1. Criar AssetSelector.tsx

```typescript
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface AssetSelectorProps {
  value: 'BZR' | 'ZARI';
  onChange: (value: 'BZR' | 'ZARI') => void;
  disabled?: boolean;
}

export function AssetSelector({ value, onChange, disabled }: AssetSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2" role="radiogroup" aria-label={t('p2p.new.assetType')}>
      <Button
        variant={value === 'BZR' ? 'default' : 'outline'}
        onClick={() => onChange('BZR')}
        disabled={disabled}
        role="radio"
        aria-checked={value === 'BZR'}
      >
        💎 {t('p2p.new.assetBZR', 'BZR')}
      </Button>
      <Button
        variant={value === 'ZARI' ? 'default' : 'outline'}
        onClick={() => onChange('ZARI')}
        disabled={disabled}
        role="radio"
        aria-checked={value === 'ZARI'}
      >
        🏛️ {t('p2p.new.assetZARI', 'ZARI')}
      </Button>
    </div>
  );
}
```

#### 2.2. Criar ZARIPhaseBadge.tsx

```typescript
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { p2pApi } from '../api';

interface PhaseInfo {
  phase: string;
  priceBZR: string;
  supplyLimit: string;
  supplyRemaining: string;
  progressPercent: number;
  isActive: boolean;
  nextPhase: string | null;
}

interface ZARIPhaseBadgeProps {
  variant?: 'compact' | 'full';
  onPhaseClick?: () => void;
}

export function ZARIPhaseBadge({ variant = 'compact', onPhaseClick }: ZARIPhaseBadgeProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<PhaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    p2pApi.getZARIPhase()
      .then(setPhase)
      .catch((err) => console.error('Failed to load ZARI phase:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Badge variant="secondary">{t('common.loading', 'Carregando...')}</Badge>;
  }

  if (!phase) {
    return <Badge variant="destructive">{t('p2p.zari.phase.error', 'Erro ao carregar fase')}</Badge>;
  }

  const priceBRL = (Number(phase.priceBZR) / 1e12).toFixed(2);
  const remainingZARI = (Number(phase.supplyRemaining) / 1e12).toFixed(0);

  if (variant === 'compact') {
    return (
      <Badge
        variant={phase.isActive ? 'default' : 'secondary'}
        className={onPhaseClick ? 'cursor-pointer' : ''}
        onClick={onPhaseClick}
      >
        🏛️ {t('p2p.zari.phase.title', { phase: phase.phase })} · R$ {priceBRL}/ZARI · {phase.progressPercent}%
      </Badge>
    );
  }

  // variant === 'full'
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('p2p.zari.stats.activePhase', 'Fase Ativa')}: {phase.phase}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t('p2p.zari.stats.price', 'Preço')}: R$ {priceBRL}/ZARI</span>
          <span>{phase.progressPercent}% {t('p2p.zari.stats.progress', 'vendido')}</span>
        </div>
        <Progress value={phase.progressPercent} />
        <div className="text-xs text-muted-foreground">
          {remainingZARI} ZARI {t('p2p.zari.phase.remaining', 'restantes')} de {(Number(phase.supplyLimit) / 1e12).toFixed(0)}
        </div>
        {!phase.isActive && (
          <div className="text-sm text-amber-600 font-medium">
            {t('p2p.zari.phase.soldOut', 'Esgotado')}
            {phase.nextPhase && ` · ${t('p2p.zari.phase.next', 'Próxima fase')}: ${phase.nextPhase}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Validação
- [ ] AssetSelector renderiza 2 botões (BZR/ZARI)
- [ ] ZARIPhaseBadge (compact) mostra fase, preço, progresso
- [ ] ZARIPhaseBadge (full) mostra progress bar
- [ ] Componentes compilam sem erros TypeScript

---

## 🎯 PROMPT 3: P2POfferNewPage Extension (4h)

### Objetivo
Estender página de criação de ofertas para suportar ZARI.

### Contexto
- Arquivo: `/root/bazari/apps/web/src/modules/p2p/pages/P2POfferNewPage.tsx`
- Padrão existente: useState, useCallback, toast, navigate
- Importar: AssetSelector, ZARIPhaseBadge (do PROMPT 2)

### Instruções

1. **Adicionar imports**:
```typescript
import { AssetSelector } from '../components/AssetSelector';
import { ZARIPhaseBadge } from '../components/ZARIPhaseBadge';
```

2. **Adicionar state**:
```typescript
const [assetType, setAssetType] = useState<'BZR' | 'ZARI'>('BZR');
const [amountZARI, setAmountZARI] = useState('');
const [zariPhase, setZariPhase] = useState<any>(null);

// Carregar fase ZARI quando assetType === 'ZARI'
useEffect(() => {
  if (assetType === 'ZARI') {
    p2pApi.getZARIPhase()
      .then(setZariPhase)
      .catch((err) => {
        console.error('Failed to load ZARI phase:', err);
        toast.error(t('p2p.zari.phase.error', 'Erro ao carregar fase ZARI'));
      });
  } else {
    setZariPhase(null);
  }
}, [assetType, t]);
```

3. **Adaptar onSave**:
```typescript
const onSave = useCallback(async () => {
  // Validação PIX (existente)
  if (!user?.pixKey) {
    toast.error(t('p2p.new.needPix'));
    return;
  }

  if (assetType === 'BZR') {
    // Lógica existente para BZR
    const res = await p2pApi.createOffer({
      side,
      priceBRLPerBZR: price,
      minBRL: Number(minBRL),
      maxBRL: Number(maxBRL),
      method: 'PIX',
      autoReply,
    });
    toast.success(t('p2p.offer.toast.published'));
    navigate('/app/p2p');
  } else if (assetType === 'ZARI') {
    // NOVA LÓGICA ZARI
    if (!zariPhase) {
      toast.error(t('p2p.zari.phase.error'));
      return;
    }

    if (!zariPhase.isActive) {
      toast.error(t('p2p.new.phaseSoldOut', { phase: zariPhase.phase }));
      return;
    }

    const amountZARINum = Number(amountZARI);
    if (!amountZARINum || amountZARINum <= 0) {
      toast.error(t('p2p.new.invalidAmount', 'Quantidade inválida'));
      return;
    }

    const res = await p2pApi.createOffer({
      assetType: 'ZARI',
      amountZARI: amountZARINum,
      minBRL: Number(minBRL),
      maxBRL: Number(maxBRL),
      method: 'PIX',
      autoReply,
    });
    toast.success(t('p2p.offer.toast.published'));
    navigate('/app/p2p');
  }
}, [assetType, side, price, minBRL, maxBRL, autoReply, amountZARI, zariPhase, user, t, navigate]);
```

4. **Adaptar JSX**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>{t('p2p.new.title')}</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* NOVO: Seletor de Asset */}
    <div>
      <Label>{t('p2p.new.assetType')}</Label>
      <AssetSelector value={assetType} onChange={setAssetType} />
    </div>

    {/* NOVO: Badge de fase ZARI (se ZARI selecionado) */}
    {assetType === 'ZARI' && zariPhase && (
      <ZARIPhaseBadge variant="full" />
    )}

    {/* Side: apenas se BZR */}
    {assetType === 'BZR' && (
      <div>
        <Label>{t('p2p.new.side')}</Label>
        <div className="flex gap-2">
          <Button variant={side === 'SELL_BZR' ? 'default' : 'outline'} onClick={() => setSide('SELL_BZR')}>
            {t('p2p.new.sideSell')}
          </Button>
          <Button variant={side === 'BUY_BZR' ? 'default' : 'outline'} onClick={() => setSide('BUY_BZR')}>
            {t('p2p.new.sideBuy')}
          </Button>
        </div>
      </div>
    )}

    {/* Preço BZR: apenas se BZR */}
    {assetType === 'BZR' && (
      <div>
        <Label>{t('p2p.new.price')}</Label>
        <Input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="1.5"
        />
      </div>
    )}

    {/* Quantidade ZARI: apenas se ZARI */}
    {assetType === 'ZARI' && (
      <div>
        <Label>{t('p2p.new.amountZARI')}</Label>
        <Input
          inputMode="decimal"
          value={amountZARI}
          onChange={(e) => setAmountZARI(e.target.value)}
          placeholder="1000"
        />
        {zariPhase && (
          <p className="text-xs text-muted-foreground mt-1">
            {t('p2p.new.calculatedPrice', {
              total: (Number(amountZARI || 0) * (Number(zariPhase.priceBZR) / 1e12)).toFixed(2),
            })}
          </p>
        )}
      </div>
    )}

    {/* MinBRL, MaxBRL, AutoReply: sempre exibir */}
    <div>
      <Label>{t('p2p.new.minBRL')}</Label>
      <Input inputMode="decimal" value={minBRL} onChange={(e) => setMinBRL(e.target.value)} />
    </div>
    <div>
      <Label>{t('p2p.new.maxBRL')}</Label>
      <Input inputMode="decimal" value={maxBRL} onChange={(e) => setMaxBRL(e.target.value)} />
    </div>
    <div>
      <Label>{t('p2p.new.autoReply')}</Label>
      <Input value={autoReply} onChange={(e) => setAutoReply(e.target.value)} />
    </div>

    <Button onClick={onSave} disabled={assetType === 'ZARI' && (!zariPhase || !zariPhase.isActive)}>
      {t('common.save')}
    </Button>
  </CardContent>
</Card>
```

### Validação
- [ ] Seletor de asset (BZR/ZARI) visível
- [ ] Quando ZARI selecionado: badge de fase aparece
- [ ] Campo "Quantidade ZARI" substituiu "Preço BZR"
- [ ] Submit cria oferta ZARI com sucesso
- [ ] Toast de erro se fase esgotada

---

## 🎯 PROMPT 4: P2PHomePage Extension (3h)

### Objetivo
Adicionar tab "Comprar ZARI", filtros de fase, e badges ZARI.

### Contexto
- Arquivo: `/root/bazari/apps/web/src/modules/p2p/pages/P2PHomePage.tsx`
- Padrão existente: tabs (BUY/SELL), filtros (minBRL/maxBRL), cards

### Instruções

1. **Adicionar import**:
```typescript
import { ZARIPhaseBadge } from '../components/ZARIPhaseBadge';
```

2. **Modificar state**:
```typescript
// Trocar tab de 'BUY' | 'SELL' para:
type TabType = 'BUY_BZR' | 'SELL_BZR' | 'BUY_ZARI' | 'SELL_ZARI';
const [tab, setTab] = useState<TabType>('BUY_BZR');

// Adicionar filtro de fase
const [phaseFilter, setPhaseFilter] = useState<string>(''); // '2A', '2B', '3', ou ''
```

3. **Adaptar load()**:
```typescript
const load = useMemo(() => async () => {
  setLoading(true);
  setError(null);
  try {
    let params: any = { method: 'PIX', minBRL: minBRL ? Number(minBRL) : undefined, maxBRL: maxBRL ? Number(maxBRL) : undefined };

    if (tab === 'BUY_BZR') {
      params.side = 'SELL_BZR';
      params.assetType = 'BZR';
    } else if (tab === 'SELL_BZR') {
      params.side = 'BUY_BZR';
      params.assetType = 'BZR';
    } else if (tab === 'BUY_ZARI') {
      params.assetType = 'ZARI';
      if (phaseFilter) params.phase = phaseFilter;
    } else if (tab === 'SELL_ZARI') {
      params.assetType = 'ZARI';
      if (phaseFilter) params.phase = phaseFilter;
    }

    const res = await p2pApi.listOffers(params);
    setItems(res.items);
  } catch (e) {
    setError((e as Error).message);
  } finally {
    setLoading(false);
  }
}, [tab, minBRL, maxBRL, phaseFilter]);
```

4. **Adaptar JSX - Tabs**:
```tsx
<div className="flex gap-2" role="tablist">
  <Button variant={tab === 'BUY_BZR' ? 'default' : 'outline'} onClick={() => setTab('BUY_BZR')}>
    {t('p2p.tabs.buyBzr')}
  </Button>
  <Button variant={tab === 'SELL_BZR' ? 'default' : 'outline'} onClick={() => setTab('SELL_BZR')}>
    {t('p2p.tabs.sellBzr')}
  </Button>
  <Button variant={tab === 'BUY_ZARI' ? 'default' : 'outline'} onClick={() => setTab('BUY_ZARI')}>
    {t('p2p.tabs.buyZari', 'Comprar ZARI')}
  </Button>
  <Button variant={tab === 'SELL_ZARI' ? 'default' : 'outline'} onClick={() => setTab('SELL_ZARI')}>
    {t('p2p.tabs.sellZari', 'Vender ZARI')}
  </Button>
</div>
```

5. **Adicionar filtro de fase (se ZARI ativo)**:
```tsx
{(tab === 'BUY_ZARI' || tab === 'SELL_ZARI') && (
  <div className="flex gap-2 mt-2">
    <Button variant={phaseFilter === '' ? 'default' : 'outline'} size="sm" onClick={() => setPhaseFilter('')}>
      {t('p2p.filters.allPhases', 'Todas as fases')}
    </Button>
    <Button variant={phaseFilter === '2A' ? 'default' : 'outline'} size="sm" onClick={() => setPhaseFilter('2A')}>
      Fase 2A
    </Button>
    <Button variant={phaseFilter === '2B' ? 'default' : 'outline'} size="sm" onClick={() => setPhaseFilter('2B')}>
      Fase 2B
    </Button>
    <Button variant={phaseFilter === '3' ? 'default' : 'outline'} size="sm" onClick={() => setPhaseFilter('3')}>
      Fase 3
    </Button>
  </div>
)}
```

6. **Adicionar ZARIPhaseBadge no header (se ZARI ativo)**:
```tsx
{(tab === 'BUY_ZARI' || tab === 'SELL_ZARI') && (
  <div className="mb-4">
    <ZARIPhaseBadge variant="full" onPhaseClick={() => navigate('/app/p2p/zari/stats')} />
  </div>
)}
```

7. **Adaptar cards de ofertas**:
```tsx
{items.map((o) => (
  <Card key={o.id}>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-base font-medium">
        {o.owner?.handle ? `@${o.owner.handle}` : o.ownerId.substring(0, 6) + '...'}
      </CardTitle>
      <div className="flex gap-2">
        <Badge>PIX</Badge>
        {o.assetType === 'ZARI' && o.phase && (
          <Badge variant="secondary">🏛️ Fase {o.phase}</Badge>
        )}
        <Badge variant="secondary">
          {o.assetType === 'ZARI'
            ? (tab === 'BUY_ZARI' ? t('p2p.badge.sellingZari') : t('p2p.badge.buyingZari'))
            : (o.side === 'SELL_BZR' ? t('p2p.badge.selling') : t('p2p.badge.buying'))
          }
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        <div>
          {o.assetType === 'ZARI'
            ? `${t('p2p.offer.price')}: R$ ${o.priceBRLPerUnit}/ZARI`
            : `${t('p2p.offer.price')}: R$ ${o.priceBRLPerBZR}/BZR`
          }
        </div>
        <div>{t('p2p.offer.range')}: R$ {o.minBRL} – R$ {o.maxBRL}</div>
      </div>
      <Button onClick={() => navigate(`/app/p2p/offers/${o.id}`)}>
        {tab === 'BUY_BZR' || tab === 'BUY_ZARI' ? t('p2p.actions.buy') : t('p2p.actions.sell')}
      </Button>
    </CardContent>
  </Card>
))}
```

### Validação
- [ ] 4 tabs visíveis (BUY_BZR, SELL_BZR, BUY_ZARI, SELL_ZARI)
- [ ] Filtro de fase aparece quando tab ZARI ativa
- [ ] Badge de fase aparece em ofertas ZARI
- [ ] ZARIPhaseBadge (full) visível no topo quando ZARI ativo

---

## 🎯 PROMPT 5: P2POrderRoomPage Extension (5h)

### Objetivo
Adaptar página de ordem para suportar escrow multi-asset (BZR vs ZARI).

### Contexto
- Arquivo: `/root/bazari/apps/web/src/modules/p2p/pages/P2POrderRoomPage.tsx`
- Complexo: 773 linhas, 10 estados de ordem, PIN, chat
- Mudanças: detectar assetType, adaptar TX blockchain, botões backend-side

### Instruções

1. **Adicionar import**:
```typescript
import { ZARIPhaseBadge } from '../components/ZARIPhaseBadge';
```

2. **Estender interface Order**:
```typescript
type Order = {
  id: string;
  status: 'DRAFT' | 'AWAITING_ESCROW' | 'AWAITING_FIAT_PAYMENT' | 'AWAITING_CONFIRMATION' | 'RELEASED' | 'EXPIRED' | 'CANCELLED' | 'DISPUTE_OPEN' | 'DISPUTE_RESOLVED_BUYER' | 'DISPUTE_RESOLVED_SELLER';
  amountBRL: string;
  amountBZR: string;
  priceBRLPerBZR: string;
  method: 'PIX';
  pixKeySnapshot?: string | null;
  createdAt: string;
  expiresAt: string;
  side: 'SELL_BZR' | 'BUY_BZR';
  makerId: string;
  takerId: string;
  proofUrls?: string[] | null;
  // NOVOS CAMPOS ZARI:
  assetType?: 'BZR' | 'ZARI';
  assetId?: string | null;
  phase?: string | null;
  amountAsset?: string; // amountBZR ou amountZARI (formato decimal)
};
```

3. **Adicionar state para backend-side escrow**:
```typescript
const [lockingViaBackend, setLockingViaBackend] = useState(false);
const [releasingViaBackend, setReleasingViaBackend] = useState(false);
const [backendTxResult, setBackendTxResult] = useState<any>(null);
```

4. **Adicionar handlers backend-side**:
```typescript
const handleLockViaBackend = async () => {
  if (!id || !order || !account) return;
  setLockingViaBackend(true);
  setBackendTxResult(null);
  try {
    const res = await p2pApi.escrowLock(id, { makerAddress: account.address });
    setBackendTxResult(res);
    toast.success(t('p2p.room.escrow.txSuccess'));
    await load(); // Reload order
  } catch (e) {
    const msg = (e as Error).message || 'Erro';
    toast.error(msg);
  } finally {
    setLockingViaBackend(false);
  }
};

const handleReleaseViaBackend = async () => {
  if (!id || !order) return;
  if (!confirm(t('p2p.room.escrow.confirmRelease', 'Confirmar liberação de fundos?'))) return;

  // Obter endereço do taker
  const takerProfile = order.side === 'SELL_BZR' ? order.takerProfile : order.makerProfile;
  const takerAddress = takerProfile?.address; // Assumindo que address está no profile

  if (!takerAddress) {
    toast.error(t('p2p.room.escrow.addressMissing', 'Endereço do comprador não encontrado'));
    return;
  }

  setReleasingViaBackend(true);
  setBackendTxResult(null);
  try {
    const res = await p2pApi.escrowRelease(id, { takerAddress });
    setBackendTxResult(res);
    toast.success(t('p2p.room.escrow.txSuccess'));
    await load(); // Reload order
  } catch (e) {
    const msg = (e as Error).message || 'Erro';
    toast.error(msg);
  } finally {
    setReleasingViaBackend(false);
  }
};
```

5. **Adaptar signAndLockEscrow() para multi-asset**:
```typescript
const signAndLockEscrow = async (pin: string) => {
  if (!id || !intent || !order) return;
  setLocking(true);
  setErr(null);
  try {
    const api = await getApi();
    let mnemonic = await decryptMnemonic(account.cipher, account.iv, account.salt, pin, account.iterations);
    await cryptoWaitReady();
    const ss58 = chainProps?.ss58Prefix ?? 42;
    const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
    const pair = keyring.addFromMnemonic(mnemonic);
    mnemonic = '';

    const assetType = order.assetType || 'BZR';
    let tx;

    if (assetType === 'BZR') {
      const planck = decimalToPlanck(intent.amountBZR);
      tx = api.tx.balances.transferKeepAlive(intent.escrowAddress, planck);
    } else if (assetType === 'ZARI') {
      const assetId = order.assetId || '1';
      const planck = decimalToPlanck(intent.amountZARI || intent.amountBZR); // Backend pode retornar amountZARI
      tx = api.tx.assets.transferKeepAlive(assetId, intent.escrowAddress, planck);
    } else {
      throw new Error(`Unsupported asset type: ${assetType}`);
    }

    const unsub = await tx.signAndSend(pair, async (result: any) => {
      const { status, dispatchError, txHash } = result;
      if (dispatchError) {
        let message = String(dispatchError);
        if (dispatchError.isModule) {
          const metaError = api.registry.findMetaError(dispatchError.asModule);
          message = `${metaError.section}.${metaError.name}`;
        }
        toast.error(message);
        setLocking(false);
        try { (unsub as unknown as () => void)(); } catch {}
        return;
      }
      if (status?.isInBlock || status?.isFinalized) {
        try { (unsub as unknown as () => void)(); } catch {}
        const hashHex = txHash?.toHex ? txHash.toHex() : String(txHash);
        try {
          await p2pApi.escrowConfirm(id, { txHash: hashHex });
          await load();
          toast.success(t('p2p.room.escrow.confirm'));
        } catch (e) {
          toast.error((e as Error).message || 'Erro');
        } finally {
          setLocking(false);
        }
      }
    });
  } catch (e) {
    setErr((e as Error).message || 'Erro');
    setLocking(false);
  }
};
```

6. **Adaptar JSX - Header com badge ZARI**:
```tsx
<CardHeader className="flex items-center justify-between">
  <CardTitle>#{order.id.substring(0, 8)}</CardTitle>
  <div className="flex items-center gap-2">
    {/* Badges existentes */}
    {myRoleLabel && <Badge variant="secondary">{myRoleLabel}</Badge>}
    {counterpartyRoleLabel && <Badge>{counterpartyRoleLabel}</Badge>}

    {/* NOVO: Badge de fase ZARI */}
    {order.assetType === 'ZARI' && order.phase && (
      <Badge variant="secondary">🏛️ Fase {order.phase}</Badge>
    )}

    <Badge>{statusLabel}</Badge>
    {remainingSec > 0 && <Badge variant="secondary">{/* ... */}</Badge>}
  </div>
</CardHeader>
```

7. **Adaptar JSX - Botões de escrow**:
```tsx
<div className="flex flex-wrap gap-2 pt-2">
  {order.status === 'AWAITING_ESCROW' && me && me.id === escrowerId && (
    <>
      {/* Opção 1: Backend-side (simples, recomendado) */}
      <Button
        size="sm"
        onClick={handleLockViaBackend}
        disabled={lockingViaBackend || !account}
      >
        {lockingViaBackend ? t('common.loading') : t('p2p.room.escrow.lockViaBackend', 'Executar Lock via Backend')}
      </Button>

      {/* Opção 2: Wallet-side (avançado) */}
      {intent && (
        <Button
          size="sm"
          variant="secondary"
          disabled={locking || !account || !hasFunds}
          onClick={async () => {
            const acct = await getActiveAccount();
            if (!acct) return;

            const amount = BigInt(decimalToPlanck(intent.amountBZR || intent.amountZARI));
            const fee = estimatedFee ? BigInt(estimatedFee) : 0n;
            const total = amount + fee;
            const free = freeBalance ? BigInt(freeBalance) : 0n;
            const balanceSufficient = free >= total;
            const formatAsset = (val: bigint) => BZR.formatAuto(val.toString(), BZR.normalizeLocale(i18n.language), true);

            const pin = await PinService.getPin({
              title: t('wallet.send.pinTitle'),
              description: t('wallet.send.pinDescription'),
              transaction: {
                type: 'lockEscrow',
                description: `Travar ${intent.amountBZR || intent.amountZARI} ${order.assetType || 'BZR'} em escrow P2P`,
                amount: `${intent.amountBZR || intent.amountZARI} ${order.assetType || 'BZR'}`,
                fee: estimatedFee ? formatAsset(fee) : 'Calculando...',
                total: formatAsset(total),
                balance: freeBalance ? formatAsset(free) : undefined,
                balanceSufficient,
                warning: !balanceSufficient ? 'Saldo insuficiente' : undefined,
              },
              validate: async (p) => {
                try { await decryptMnemonic(acct.cipher, acct.iv, acct.salt, p, acct.iterations); return null; }
                catch { return t('wallet.send.errors.pinInvalid'); }
              },
            });
            await signAndLockEscrow(pin);
          }}
          title={formulaHint}
        >
          {locking ? t('common.loading') : t('p2p.room.escrow.lockViaWallet', 'Travar via carteira')}
        </Button>
      )}
    </>
  )}

  {order.status === 'AWAITING_CONFIRMATION' && me && me.id === receiverId && (
    <Button size="sm" onClick={handleReleaseViaBackend} disabled={releasingViaBackend}>
      {releasingViaBackend ? t('common.loading') : t('p2p.room.escrow.releaseViaBackend', 'Executar Release via Backend')}
    </Button>
  )}

  {/* ... outros botões existentes */}
</div>

{/* Mostrar resultado de TX backend */}
{backendTxResult && (
  <div className="p-3 rounded bg-green-50 border border-green-200 text-sm space-y-1">
    <div className="font-medium">{backendTxResult.message}</div>
    <div className="text-xs text-muted-foreground">
      <div>{t('p2p.room.escrow.txHash')}: <code className="break-all">{backendTxResult.txHash}</code></div>
      <div>{t('p2p.room.escrow.blockNumber')}: {backendTxResult.blockNumber}</div>
      <div>{t('p2p.room.escrow.amount')}: {(Number(backendTxResult.amount) / 1e12).toFixed(6)} {backendTxResult.assetType}</div>
    </div>
  </div>
)}
```

8. **Adaptar statusLabel**:
```typescript
const statusLabel = useMemo(() => {
  const assetName = order?.assetType === 'ZARI' ? 'ZARI' : 'BZR';
  switch (order?.status) {
    case 'AWAITING_ESCROW':
      return order.assetType === 'ZARI'
        ? t('p2p.room.status.awaitingEscrowZari', 'Aguardando escrow de ZARI')
        : t('p2p.room.status.awaitingEscrow', 'Aguardando escrow de BZR');
    case 'AWAITING_FIAT_PAYMENT':
      return order.assetType === 'ZARI'
        ? t('p2p.room.status.awaitingFiatZari', 'Aguardando pagamento PIX (ZARI)')
        : t('p2p.room.status.awaitingFiat', 'Aguardando pagamento PIX');
    // ... outros casos
    default: return order?.status || '';
  }
}, [order, t]);
```

### Validação
- [ ] Badge de fase ZARI visível no header
- [ ] Botão "Executar Lock via Backend" chama escrowLock()
- [ ] TX hash e block number exibidos após lock
- [ ] Status atualiza para AWAITING_FIAT_PAYMENT
- [ ] Botão "Executar Release via Backend" chama escrowRelease()
- [ ] Fluxo completo: lock → PIX → release funciona

---

## 🎯 PROMPT 6: ZARIStatsPage (3h)

### Objetivo
Criar dashboard público de estatísticas ZARI.

### Contexto
- Nova página: `/root/bazari/apps/web/src/modules/p2p/pages/ZARIStatsPage.tsx`
- Rota: `/app/p2p/zari/stats`
- Usar: ZARIPhaseBadge, Table, Card

### Instruções

1. **Criar ZARIStatsPage.tsx**:
```typescript
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ZARIPhaseBadge } from '../components/ZARIPhaseBadge';
import { p2pApi } from '../api';

interface ZARIStats {
  phases: Array<{
    phase: string;
    priceBZR: string;
    supplyLimit: string;
    active: boolean;
    startBlock: string | null;
    endBlock: string | null;
  }>;
  activePhase: string | null;
  totalSold: string;
  totalP2PSupply: string;
  overallProgress: number;
  completedOrders: number;
}

export default function ZARIStatsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ZARIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    p2pApi.getZARIStats()
      .then(setStats)
      .catch((err) => {
        console.error('Failed to load ZARI stats:', err);
        setError((err as Error).message);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatZARI = (planck: string) => {
    return (Number(planck) / 1e12).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-2 md:py-3">
        {t('common.loading', 'Carregando...')}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="container mx-auto px-4 py-2 md:py-3">
        <p className="text-sm text-red-600">{error || t('common.error', 'Erro ao carregar')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-2 md:py-3 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('p2p.zari.stats.title', 'Estatísticas ZARI')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ZARIPhaseBadge variant="full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('p2p.zari.stats.history', 'Histórico de Fases')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('p2p.zari.stats.phase', 'Fase')}</TableHead>
                <TableHead>{t('p2p.zari.stats.price', 'Preço (BRL/ZARI)')}</TableHead>
                <TableHead>{t('p2p.zari.stats.supplyLimit', 'Limite de Supply')}</TableHead>
                <TableHead>{t('p2p.zari.stats.status', 'Status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.phases.map((p) => (
                <TableRow key={p.phase}>
                  <TableCell className="font-medium">Fase {p.phase}</TableCell>
                  <TableCell>R$ {(Number(p.priceBZR) / 1e12).toFixed(2)}</TableCell>
                  <TableCell>{formatZARI(p.supplyLimit)} ZARI</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? 'default' : 'secondary'}>
                      {p.active ? t('p2p.zari.stats.active', 'Ativa') : t('p2p.zari.stats.completed', 'Concluída')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('p2p.zari.stats.summary', 'Resumo Geral')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">{t('p2p.zari.stats.totalSold', 'Total Vendido')}</div>
            <div className="text-2xl font-bold">{formatZARI(stats.totalSold)} ZARI</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('p2p.zari.stats.completedOrders', 'Ordens Completas')}</div>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('p2p.zari.stats.overallProgress', 'Progresso Total')}</div>
            <div className="text-2xl font-bold">{stats.overallProgress.toFixed(1)}%</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

2. **Adicionar rota no React Router**:
```typescript
// Em /root/bazari/apps/web/src/App.tsx ou routes.tsx (verificar estrutura)
import ZARIStatsPage from '@/modules/p2p/pages/ZARIStatsPage';

// Adicionar rota:
<Route path="/app/p2p/zari/stats" element={<ZARIStatsPage />} />
```

### Validação
- [ ] Página acessível em /app/p2p/zari/stats
- [ ] Badge de fase completo visível
- [ ] Tabela de fases (2A, 2B, 3) com preços e status
- [ ] Estatísticas gerais exibidas corretamente

---

## 🎯 PROMPT 7: Traduções i18n (1h)

### Objetivo
Adicionar traduções completas para pt, en, es.

### Contexto
- Arquivos:
  - `/root/bazari/apps/web/src/i18n/pt.json`
  - `/root/bazari/apps/web/src/i18n/en.json`
  - `/root/bazari/apps/web/src/i18n/es.json`
- Padrão: JSON aninhado

### Instruções

#### 7.1. Adicionar em pt.json

Localizar seção `"p2p": { ... }` (linha ~1093) e adicionar/estender:

```json
{
  "p2p": {
    "tabs": {
      "buyBzr": "Comprar BZR",
      "sellBzr": "Vender BZR",
      "buyZari": "Comprar ZARI",
      "sellZari": "Vender ZARI"
    },
    "badge": {
      "selling": "Vendendo BZR",
      "buying": "Comprando BZR",
      "sellingZari": "Vendendo ZARI",
      "buyingZari": "Comprando ZARI"
    },
    "filters": {
      "allPhases": "Todas as fases"
    },
    "new": {
      "assetType": "Tipo de ativo",
      "assetBZR": "BZR (Token nativo)",
      "assetZARI": "ZARI (Governança)",
      "amountZARI": "Quantidade ZARI",
      "phaseInfo": "Fase ativa: {{phase}} · Preço: R$ {{price}}/ZARI",
      "phaseSoldOut": "Fase {{phase}} esgotada. Aguarde transição para próxima fase.",
      "calculatedPrice": "Preço calculado: R$ {{total}}",
      "invalidAmount": "Quantidade inválida"
    },
    "room": {
      "status": {
        "awaitingEscrowZari": "Aguardando escrow de ZARI",
        "awaitingFiatZari": "Aguardando pagamento PIX (ZARI)"
      },
      "escrow": {
        "lockZari": "Travar ZARI",
        "lockViaBackend": "Executar Lock via Backend",
        "releaseViaBackend": "Executar Release via Backend",
        "confirmRelease": "Confirmar liberação de fundos?",
        "addressMissing": "Endereço do comprador não encontrado",
        "amountZari": "Quantidade a enviar (ZARI)",
        "lockingZari": "Travando ZARI...",
        "releasingZari": "Liberando ZARI...",
        "txSuccess": "Transação executada com sucesso",
        "txHash": "Hash da transação",
        "blockNumber": "Bloco"
      }
    },
    "zari": {
      "stats": {
        "title": "Estatísticas ZARI",
        "activePhase": "Fase Ativa",
        "price": "Preço",
        "supplyLimit": "Limite de Supply",
        "supplyRemaining": "Restante",
        "progress": "vendido",
        "totalSold": "Total Vendido",
        "completedOrders": "Ordens Completas",
        "overallProgress": "Progresso Total",
        "history": "Histórico de Fases",
        "phase": "Fase",
        "status": "Status",
        "active": "Ativa",
        "completed": "Concluída",
        "summary": "Resumo Geral"
      },
      "phase": {
        "title": "Fase ZARI {{phase}}",
        "priceLabel": "R$ {{price}}/ZARI",
        "remaining": "restantes",
        "soldOut": "Esgotado",
        "next": "Próxima fase",
        "error": "Erro ao carregar fase"
      }
    }
  }
}
```

#### 7.2. Adicionar em en.json

Localizar seção `"p2p": { ... }` e adicionar:

```json
{
  "p2p": {
    "tabs": {
      "buyZari": "Buy ZARI",
      "sellZari": "Sell ZARI"
    },
    "badge": {
      "sellingZari": "Selling ZARI",
      "buyingZari": "Buying ZARI"
    },
    "filters": {
      "allPhases": "All phases"
    },
    "new": {
      "assetType": "Asset type",
      "assetBZR": "BZR (Native token)",
      "assetZARI": "ZARI (Governance)",
      "amountZARI": "ZARI amount",
      "phaseInfo": "Active phase: {{phase}} · Price: R$ {{price}}/ZARI",
      "phaseSoldOut": "Phase {{phase}} sold out. Awaiting transition to next phase.",
      "calculatedPrice": "Calculated price: R$ {{total}}",
      "invalidAmount": "Invalid amount"
    },
    "room": {
      "status": {
        "awaitingEscrowZari": "Awaiting ZARI escrow",
        "awaitingFiatZari": "Awaiting PIX payment (ZARI)"
      },
      "escrow": {
        "lockZari": "Lock ZARI",
        "lockViaBackend": "Execute Lock via Backend",
        "releaseViaBackend": "Execute Release via Backend",
        "confirmRelease": "Confirm fund release?",
        "addressMissing": "Buyer address not found",
        "amountZari": "Amount to send (ZARI)",
        "lockingZari": "Locking ZARI...",
        "releasingZari": "Releasing ZARI...",
        "txSuccess": "Transaction executed successfully",
        "txHash": "Transaction hash",
        "blockNumber": "Block"
      }
    },
    "zari": {
      "stats": {
        "title": "ZARI Statistics",
        "activePhase": "Active Phase",
        "price": "Price",
        "supplyLimit": "Supply Limit",
        "supplyRemaining": "Remaining",
        "progress": "sold",
        "totalSold": "Total Sold",
        "completedOrders": "Completed Orders",
        "overallProgress": "Overall Progress",
        "history": "Phase History",
        "phase": "Phase",
        "status": "Status",
        "active": "Active",
        "completed": "Completed",
        "summary": "Summary"
      },
      "phase": {
        "title": "ZARI Phase {{phase}}",
        "priceLabel": "R$ {{price}}/ZARI",
        "remaining": "remaining",
        "soldOut": "Sold out",
        "next": "Next phase",
        "error": "Failed to load phase"
      }
    }
  }
}
```

#### 7.3. Adicionar em es.json

Localizar seção `"p2p": { ... }` e adicionar:

```json
{
  "p2p": {
    "tabs": {
      "buyZari": "Comprar ZARI",
      "sellZari": "Vender ZARI"
    },
    "badge": {
      "sellingZari": "Vendiendo ZARI",
      "buyingZari": "Comprando ZARI"
    },
    "filters": {
      "allPhases": "Todas las fases"
    },
    "new": {
      "assetType": "Tipo de activo",
      "assetBZR": "BZR (Token nativo)",
      "assetZARI": "ZARI (Gobernanza)",
      "amountZARI": "Cantidad ZARI",
      "phaseInfo": "Fase activa: {{phase}} · Precio: R$ {{price}}/ZARI",
      "phaseSoldOut": "Fase {{phase}} agotada. Esperando transición a la próxima fase.",
      "calculatedPrice": "Precio calculado: R$ {{total}}",
      "invalidAmount": "Cantidad inválida"
    },
    "room": {
      "status": {
        "awaitingEscrowZari": "Esperando escrow de ZARI",
        "awaitingFiatZari": "Esperando pago PIX (ZARI)"
      },
      "escrow": {
        "lockZari": "Bloquear ZARI",
        "lockViaBackend": "Ejecutar bloqueo via Backend",
        "releaseViaBackend": "Ejecutar liberación via Backend",
        "confirmRelease": "¿Confirmar liberación de fondos?",
        "addressMissing": "Dirección del comprador no encontrada",
        "amountZari": "Cantidad a enviar (ZARI)",
        "lockingZari": "Bloqueando ZARI...",
        "releasingZari": "Liberando ZARI...",
        "txSuccess": "Transacción ejecutada con éxito",
        "txHash": "Hash de transacción",
        "blockNumber": "Bloque"
      }
    },
    "zari": {
      "stats": {
        "title": "Estadísticas ZARI",
        "activePhase": "Fase Activa",
        "price": "Precio",
        "supplyLimit": "Límite de Supply",
        "supplyRemaining": "Restante",
        "progress": "vendido",
        "totalSold": "Total Vendido",
        "completedOrders": "Órdenes Completadas",
        "overallProgress": "Progreso Total",
        "history": "Historial de Fases",
        "phase": "Fase",
        "status": "Estado",
        "active": "Activa",
        "completed": "Completada",
        "summary": "Resumen"
      },
      "phase": {
        "title": "Fase ZARI {{phase}}",
        "priceLabel": "R$ {{price}}/ZARI",
        "remaining": "restantes",
        "soldOut": "Agotado",
        "next": "Próxima fase",
        "error": "Error al cargar fase"
      }
    }
  }
}
```

### Validação
- [ ] Todas as chaves ZARI adicionadas em pt.json
- [ ] Todas as chaves ZARI adicionadas em en.json
- [ ] Todas as chaves ZARI adicionadas em es.json
- [ ] Nenhum erro de sintaxe JSON
- [ ] Interpolação de variáveis ({{phase}}, {{price}}) funciona

---

## ✅ Checklist Final

Após executar todos os 7 prompts:

### Funcionalidades
- [ ] Criar oferta ZARI via UI
- [ ] Listar ofertas ZARI (filtrar por fase)
- [ ] Criar ordem ZARI
- [ ] Executar escrow ZARI (lock via backend)
- [ ] Marcar pagamento PIX
- [ ] Executar release ZARI (via backend)
- [ ] Visualizar stats ZARI em /app/p2p/zari/stats

### Qualidade
- [ ] Nenhum erro TypeScript
- [ ] Todas as traduções (pt, en, es) presentes
- [ ] Componentes seguem padrão existente (shadcn/ui)
- [ ] Toast de sucesso/erro em todas as ações
- [ ] Loading states em requests assíncronos

### Testes
- [ ] Fluxo completo: criar oferta → criar ordem → lock → PIX → release
- [ ] Fase esgotada: mostra alerta correto
- [ ] Badge de fase atualiza dinamicamente
- [ ] Multi-asset escrow: BZR funciona, ZARI funciona

---

## 📊 Resumo de Horas

| Prompt | Descrição | Tempo |
|--------|-----------|-------|
| 1 | API Client Extension | 1h |
| 2 | Componentes Base ZARI | 3h |
| 3 | P2POfferNewPage Extension | 4h |
| 4 | P2PHomePage Extension | 3h |
| 5 | P2POrderRoomPage Extension | 5h |
| 6 | ZARIStatsPage | 3h |
| 7 | Traduções i18n | 1h |
| **Total** | - | **24h** |

---

*Prompts gerados em: 28/Out/2025*
*Versão: 1.0*
*Status: Pronto para Execução*
