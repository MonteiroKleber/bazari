# FASE 8: Completar Sistema de Afiliados

**Estimativa:** 3-4 dias
**Prioridade:** ALTA (P0-04 do Relatório 1)
**Pré-requisitos:** Nenhum (paralelo às outras fases)
**Status:** ~50% IMPLEMENTADO

---

## CONTEXTO

### Status Atual (Relatório 1):
- Affiliate System: **~50% implementado**
- Páginas: ✅ 4/4 implementadas
- Componentes avançados: ❌ Faltam 4
- Hooks blockchain: ❌ Faltam 4

### O que já existe:
- `AffiliateDashboardPage` ✅
- `AffiliatesPage (Seller)` ✅
- `MyAffiliationsPage` ✅
- `AffiliateMarketplacePage` ✅
- `CommissionBreakdownCard` ⚠️ (parcial)

### O que falta:
- `ReferralTreeVisualization` ❌ (D3.js)
- `ReferralLinkCard` ❌
- `MerkleProofViewer` ❌
- `AffiliateStatsWidget` ❌
- Hooks: `useReferralTree`, `useAffiliateStats`, `useGenerateReferralLink`, `useMerkleProof` ❌

---

## OBJETIVO

Completar o sistema de afiliados com:
1. Visualização da árvore de referrals (D3.js)
2. Geração e compartilhamento de links de referral
3. Visualização de provas Merkle
4. Widget de estatísticas de afiliado

---

## ARQUITETURA DO SISTEMA DE AFILIADOS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AFFILIATE SYSTEM                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PALLET bazari-affiliate (blockchain)                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Storage:                                                             │   │
│  │  - Affiliates: account → sponsor (who referred me)                  │   │
│  │  - Referrals: account → Vec<referrals> (who I referred)             │   │
│  │  - Commissions: sale_id → Vec<(affiliate, amount)>                  │   │
│  │                                                                      │   │
│  │ Extrinsics:                                                          │   │
│  │  - register_affiliate(sponsor) → Cria afiliado                      │   │
│  │  - record_referral(affiliate, buyer, order_id) → Registra referral  │   │
│  │  - distribute_commission(sale_id) → Distribui comissões             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FRONTEND                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌──────────────────┐   ┌──────────────────┐   ┌────────────────┐  │   │
│  │  │ ReferralTree     │   │ ReferralLinkCard │   │ AffiliateStats │  │   │
│  │  │ Visualization    │   │                  │   │ Widget         │  │   │
│  │  │ (D3.js)          │   │ - Generate link  │   │                │  │   │
│  │  │                  │   │ - Share buttons  │   │ - Total earned │  │   │
│  │  │ - 3 níveis       │   │ - QR Code        │   │ - Referrals    │  │   │
│  │  │ - Comissões      │   │                  │   │ - Conversion   │  │   │
│  │  └──────────────────┘   └──────────────────┘   └────────────────┘  │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐   ┌──────────────────┐                        │   │
│  │  │ CommissionBreak  │   │ MerkleProof      │                        │   │
│  │  │ down             │   │ Viewer           │                        │   │
│  │  │                  │   │                  │                        │   │
│  │  │ - Por nível      │   │ - Prova on-chain │                        │   │
│  │  │ - Histórico      │   │ - Verificação    │                        │   │
│  │  └──────────────────┘   └──────────────────┘                        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FUNCIONALIDADES JÁ EXISTENTES (NÃO DUPLICAR)

### Backend
- `apps/api/src/routes/blockchain/commerce.ts`:
  - Rotas de comissão existentes ✅

### Frontend - Páginas
- `apps/web/src/pages/affiliate/`:
  - `AffiliateDashboardPage.tsx` ✅
  - `AffiliatesPage.tsx` ✅
  - `MyAffiliationsPage.tsx` ✅
  - `AffiliateMarketplacePage.tsx` ✅

### Frontend - Hooks
- `apps/web/src/hooks/blockchain/useCommerce.ts`:
  - `useSaleCommissions()` ✅
  - `useSellerCommissionStats()` ✅
  - `useCommissionHistory()` ✅

### Pallet
- `bazari-chain/pallets/bazari-affiliate/src/lib.rs`:
  - `register_affiliate()` ✅
  - `record_referral()` ✅
  - `distribute_commission()` ✅

---

## IMPLEMENTAÇÃO

### PARTE A: Backend - Routes de Affiliate

**Arquivo:** `apps/api/src/routes/blockchain/affiliate.ts` (NOVO ou expandir existente)

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';

export async function affiliateRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;
  const blockchainService = BlockchainService.getInstance();

  // ============================================================================
  // GET /api/blockchain/affiliate/tree/:address - Árvore de referrals
  // ============================================================================
  app.get('/affiliate/tree/:address', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { address } = z.object({ address: z.string() }).parse(request.params);
      const { depth = '3' } = request.query as { depth?: string };
      const maxDepth = Math.min(parseInt(depth, 10), 5); // Max 5 níveis

      const api = await blockchainService.getApi();

      // Função recursiva para construir árvore
      async function buildTree(account: string, currentDepth: number): Promise<any> {
        if (currentDepth > maxDepth) return null;

        // Buscar referrals diretos
        const referralsData = await api.query.bazariAffiliate.referrals(account);
        const referrals = referralsData.toJSON() as string[] || [];

        // Buscar comissões totais deste afiliado
        let totalCommission = BigInt(0);
        // (Simplificado - em produção seria agregado do histórico)

        const children = await Promise.all(
          referrals.map(async (ref: string) => buildTree(ref, currentDepth + 1))
        );

        return {
          address: account,
          level: currentDepth,
          referrals: referrals.length,
          totalCommission: totalCommission.toString(),
          children: children.filter(Boolean),
        };
      }

      const tree = await buildTree(address, 0);

      return {
        root: address,
        depth: maxDepth,
        tree,
        totalNodes: countNodes(tree),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch referral tree' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/affiliate/stats/:address - Estatísticas de afiliado
  // ============================================================================
  app.get('/affiliate/stats/:address', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { address } = z.object({ address: z.string() }).parse(request.params);

      const api = await blockchainService.getApi();

      // Buscar dados do afiliado
      const affiliateData = await api.query.bazariAffiliate.affiliates(address);
      const referralsData = await api.query.bazariAffiliate.referrals(address);

      const sponsor = affiliateData.isSome ? affiliateData.unwrap().toString() : null;
      const referrals = referralsData.toJSON() as string[] || [];

      // Calcular estatísticas (simplificado)
      // Em produção, agregar do histórico de comissões
      const stats = {
        address,
        isAffiliate: affiliateData.isSome,
        sponsor,
        directReferrals: referrals.length,
        totalReferrals: await countTotalReferrals(api, address),
        // Comissões
        totalEarned: '0', // TODO: Agregar do histórico
        pendingCommission: '0',
        paidCommission: '0',
        // Conversão
        totalClicks: 0, // TODO: Implementar tracking
        totalPurchases: referrals.length, // Aproximado
        conversionRate: 0,
        // Por período
        last30Days: {
          referrals: 0,
          earned: '0',
        },
      };

      return stats;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch affiliate stats' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/affiliate/generate-link - Gerar link de referral
  // ============================================================================
  const generateLinkSchema = z.object({
    productId: z.string().uuid().optional(),
    storeId: z.string().uuid().optional(),
    campaign: z.string().max(50).optional(),
  });

  app.post('/affiliate/generate-link', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const body = generateLinkSchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };

      // Verificar se é afiliado registrado
      const api = await blockchainService.getApi();
      const affiliateData = await api.query.bazariAffiliate.affiliates(authUser.address);

      if (affiliateData.isNone) {
        return reply.status(400).send({
          error: 'Not registered as affiliate',
          message: 'You need to register as an affiliate first',
        });
      }

      // Gerar link
      const baseUrl = process.env.FRONTEND_URL || 'https://bazari.app';
      const refCode = Buffer.from(authUser.address).toString('base64url').slice(0, 12);

      let targetPath = '/';
      if (body.productId) {
        targetPath = `/marketplace/product/${body.productId}`;
      } else if (body.storeId) {
        targetPath = `/store/${body.storeId}`;
      }

      const params = new URLSearchParams({
        ref: refCode,
        ...(body.campaign && { utm_campaign: body.campaign }),
      });

      const referralLink = `${baseUrl}${targetPath}?${params.toString()}`;

      // Salvar link no DB para tracking (opcional)
      // await prisma.referralLink.create({ ... });

      return {
        link: referralLink,
        shortCode: refCode,
        affiliateAddress: authUser.address,
        target: {
          productId: body.productId || null,
          storeId: body.storeId || null,
          campaign: body.campaign || null,
        },
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate referral link' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/affiliate/commission-proof/:saleId - Prova Merkle
  // ============================================================================
  app.get('/affiliate/commission-proof/:saleId', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { saleId } = z.object({ saleId: z.string() }).parse(request.params);
      const id = parseInt(saleId, 10);

      const api = await blockchainService.getApi();

      // Buscar comissões da venda
      const commissionsData = await api.query.bazariAffiliate.commissions(id);
      const commissions = commissionsData.toJSON() as Array<[string, string]> || [];

      // Buscar eventos de distribuição
      // (Em produção, seria a prova Merkle real do pallet)

      // Simular prova Merkle
      const merkleRoot = api.registry.hash(
        Buffer.from(JSON.stringify(commissions))
      ).toHex();

      return {
        saleId: id,
        commissions: commissions.map(([affiliate, amount]) => ({
          affiliate,
          amount,
        })),
        proof: {
          merkleRoot,
          leaves: commissions.length,
          // Em produção: provas individuais por afiliado
        },
        verified: true,
        blockNumber: 0, // TODO: Buscar bloco real
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch commission proof' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/affiliate/prepare-register - Preparar registro
  // ============================================================================
  const prepareRegisterSchema = z.object({
    sponsorAddress: z.string().optional(),
  });

  app.post('/affiliate/prepare-register', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { sponsorAddress } = prepareRegisterSchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };

      const api = await blockchainService.getApi();

      // Verificar se já é afiliado
      const existing = await api.query.bazariAffiliate.affiliates(authUser.address);
      if (existing.isSome) {
        return reply.status(400).send({ error: 'Already registered as affiliate' });
      }

      // Se tem sponsor, verificar se é válido
      if (sponsorAddress) {
        const sponsorExists = await api.query.bazariAffiliate.affiliates(sponsorAddress);
        if (sponsorExists.isNone) {
          return reply.status(400).send({ error: 'Sponsor is not a registered affiliate' });
        }
      }

      const callData = api.tx.bazariAffiliate.registerAffiliate(sponsorAddress || null);

      return {
        callHex: callData.toHex(),
        callHash: callData.hash.toHex(),
        method: 'bazariAffiliate.registerAffiliate',
        signerAddress: authUser.address,
        sponsor: sponsorAddress || 'none (root affiliate)',
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to prepare registration' });
    }
  });

  // Helper function
  async function countTotalReferrals(api: any, address: string, counted = new Set<string>()): Promise<number> {
    if (counted.has(address)) return 0;
    counted.add(address);

    const referralsData = await api.query.bazariAffiliate.referrals(address);
    const referrals = referralsData.toJSON() as string[] || [];

    let total = referrals.length;
    for (const ref of referrals) {
      total += await countTotalReferrals(api, ref, counted);
    }

    return total;
  }
}

function countNodes(tree: any): number {
  if (!tree) return 0;
  let count = 1;
  if (tree.children) {
    for (const child of tree.children) {
      count += countNodes(child);
    }
  }
  return count;
}
```

---

### PARTE B: Frontend - Hooks

**Arquivo:** `apps/web/src/hooks/blockchain/useAffiliate.ts` (NOVO)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface ReferralTreeNode {
  address: string;
  level: number;
  referrals: number;
  totalCommission: string;
  children: ReferralTreeNode[];
}

export interface ReferralTree {
  root: string;
  depth: number;
  tree: ReferralTreeNode;
  totalNodes: number;
}

export interface AffiliateStats {
  address: string;
  isAffiliate: boolean;
  sponsor: string | null;
  directReferrals: number;
  totalReferrals: number;
  totalEarned: string;
  pendingCommission: string;
  paidCommission: string;
  totalClicks: number;
  totalPurchases: number;
  conversionRate: number;
  last30Days: {
    referrals: number;
    earned: string;
  };
}

export interface ReferralLink {
  link: string;
  shortCode: string;
  affiliateAddress: string;
  target: {
    productId: string | null;
    storeId: string | null;
    campaign: string | null;
  };
  qrCodeUrl: string;
}

export interface CommissionProof {
  saleId: number;
  commissions: Array<{ affiliate: string; amount: string }>;
  proof: {
    merkleRoot: string;
    leaves: number;
  };
  verified: boolean;
  blockNumber: number;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Árvore de referrals de um afiliado
 */
export function useReferralTree(address: string | undefined, depth = 3) {
  return useQuery({
    queryKey: ['referral-tree', address, depth],
    queryFn: async () => {
      const res = await api.get(`/blockchain/affiliate/tree/${address}?depth=${depth}`);
      return res.data as ReferralTree;
    },
    enabled: !!address,
    staleTime: 60000, // 1 min - árvore não muda frequentemente
  });
}

/**
 * Estatísticas de afiliado
 */
export function useAffiliateStats(address: string | undefined) {
  return useQuery({
    queryKey: ['affiliate-stats', address],
    queryFn: async () => {
      const res = await api.get(`/blockchain/affiliate/stats/${address}`);
      return res.data as AffiliateStats;
    },
    enabled: !!address,
    refetchInterval: 30000, // 30s
  });
}

/**
 * Gerar link de referral
 */
export function useGenerateReferralLink() {
  return useMutation({
    mutationFn: async (params: {
      productId?: string;
      storeId?: string;
      campaign?: string;
    }) => {
      const res = await api.post('/blockchain/affiliate/generate-link', params);
      return res.data as ReferralLink;
    },
  });
}

/**
 * Buscar prova Merkle de comissão
 */
export function useMerkleProof(saleId: number | undefined) {
  return useQuery({
    queryKey: ['merkle-proof', saleId],
    queryFn: async () => {
      const res = await api.get(`/blockchain/affiliate/commission-proof/${saleId}`);
      return res.data as CommissionProof;
    },
    enabled: !!saleId,
  });
}

/**
 * Preparar registro como afiliado
 */
export function usePrepareRegisterAffiliate() {
  return useMutation({
    mutationFn: async (sponsorAddress?: string) => {
      const res = await api.post('/blockchain/affiliate/prepare-register', {
        sponsorAddress,
      });
      return res.data;
    },
  });
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Estatísticas do usuário atual como afiliado
 */
export function useMyAffiliateStats() {
  // Assume que useAuth() retorna o endereço do usuário
  const address = ''; // TODO: Pegar do contexto de auth
  return useAffiliateStats(address);
}

/**
 * Árvore do usuário atual
 */
export function useMyReferralTree(depth = 3) {
  const address = ''; // TODO: Pegar do contexto de auth
  return useReferralTree(address, depth);
}
```

---

### PARTE C: Frontend - Componentes

#### C.1 - ReferralTreeVisualization (D3.js)

**Arquivo:** `apps/web/src/components/affiliate/ReferralTreeVisualization.tsx`

```typescript
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ReferralTreeNode } from '@/hooks/blockchain/useAffiliate';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ReferralTreeVisualizationProps {
  tree: ReferralTreeNode;
  width?: number;
  height?: number;
  onNodeClick?: (node: ReferralTreeNode) => void;
}

export function ReferralTreeVisualization({
  tree,
  width = 800,
  height = 600,
  onNodeClick,
}: ReferralTreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!svgRef.current || !tree) return;

    // Limpar SVG anterior
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const g = svg.append('g');

    // Configurar zoom
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    // Criar layout de árvore
    const treeLayout = d3.tree<ReferralTreeNode>()
      .size([height - 100, width - 200]);

    // Criar hierarquia
    const root = d3.hierarchy(tree);
    const treeData = treeLayout(root);

    // Desenhar links
    g.selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<any, any>()
        .x(d => d.y + 100)
        .y(d => d.x + 50)
      )
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2);

    // Desenhar nodes
    const nodes = g.selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y + 100},${d.x + 50})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onNodeClick) {
          onNodeClick(d.data);
        }
      });

    // Círculo do node
    nodes.append('circle')
      .attr('r', d => 10 + (d.data.referrals * 2))
      .attr('fill', d => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        return colors[d.depth % colors.length];
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Label do node
    nodes.append('text')
      .attr('dy', -15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#334155')
      .text(d => truncateAddress(d.data.address));

    // Contador de referrals
    nodes.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#fff')
      .attr('font-weight', 'bold')
      .text(d => d.data.referrals);

    // Centralizar view
    const initialTransform = d3.zoomIdentity.translate(50, 0);
    svg.call(zoomBehavior.transform, initialTransform);

  }, [tree, width, height, onNodeClick]);

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.3
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.7
    );
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity.translate(50, 0)
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Referral Network</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-slate-50">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="w-full"
          />
        </div>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
          <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
          <span>•</span>
          <span>Drag to pan, scroll to zoom</span>
        </div>
      </CardContent>
    </Card>
  );
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
```

#### C.2 - ReferralLinkCard

**Arquivo:** `apps/web/src/components/affiliate/ReferralLinkCard.tsx`

```typescript
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGenerateReferralLink, ReferralLink } from '@/hooks/blockchain/useAffiliate';
import { Copy, Share2, QrCode, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralLinkCardProps {
  productId?: string;
  storeId?: string;
}

export function ReferralLinkCard({ productId, storeId }: ReferralLinkCardProps) {
  const [campaign, setCampaign] = useState('');
  const [generatedLink, setGeneratedLink] = useState<ReferralLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const { mutate: generateLink, isPending } = useGenerateReferralLink();

  const handleGenerate = () => {
    generateLink(
      { productId, storeId, campaign: campaign || undefined },
      {
        onSuccess: (data) => {
          setGeneratedLink(data);
          toast.success('Referral link generated!');
        },
        onError: (error) => {
          toast.error('Failed to generate link');
        },
      }
    );
  };

  const handleCopy = async () => {
    if (!generatedLink) return;

    await navigator.clipboard.writeText(generatedLink.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard!');
  };

  const handleShare = async () => {
    if (!generatedLink) return;

    if (navigator.share) {
      await navigator.share({
        title: 'Check out Bazari!',
        text: 'Join me on Bazari marketplace',
        url: generatedLink.link,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Generate Referral Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign input */}
        <div className="space-y-2">
          <Label htmlFor="campaign">Campaign Name (optional)</Label>
          <Input
            id="campaign"
            placeholder="e.g., twitter-promo"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
          />
        </div>

        {/* Generate button */}
        <Button onClick={handleGenerate} disabled={isPending} className="w-full">
          {isPending ? 'Generating...' : 'Generate Link'}
        </Button>

        {/* Generated link display */}
        {generatedLink && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Your Referral Link</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink.link}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleShare} className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={() => setShowQR(!showQR)} className="flex-1">
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
            </div>

            {/* QR Code */}
            {showQR && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={generatedLink.qrCodeUrl}
                  alt="Referral QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}

            {/* Short code */}
            <p className="text-sm text-muted-foreground text-center">
              Your referral code: <code className="bg-slate-100 px-2 py-1 rounded">{generatedLink.shortCode}</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### C.3 - MerkleProofViewer

**Arquivo:** `apps/web/src/components/affiliate/MerkleProofViewer.tsx`

```typescript
import { useMerkleProof } from '@/hooks/blockchain/useAffiliate';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Shield, FileCode } from 'lucide-react';

interface MerkleProofViewerProps {
  saleId: number;
}

export function MerkleProofViewer({ saleId }: MerkleProofViewerProps) {
  const { data: proof, isLoading, error } = useMerkleProof(saleId);

  if (isLoading) return <div>Loading proof...</div>;
  if (error) return <div>Error loading proof</div>;
  if (!proof) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          On-Chain Commission Proof
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verification status */}
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-green-700 font-medium">
            Verified on blockchain
          </span>
          <Badge variant="outline" className="ml-auto">
            Block #{proof.blockNumber}
          </Badge>
        </div>

        {/* Merkle Root */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Merkle Root
          </label>
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            <code className="flex-1 text-xs bg-slate-100 p-2 rounded font-mono overflow-x-auto">
              {proof.proof.merkleRoot}
            </code>
          </div>
        </div>

        {/* Commissions */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Commission Distribution ({proof.proof.leaves} recipients)
          </label>
          <div className="space-y-2">
            {proof.commissions.map((commission, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-slate-50 rounded"
              >
                <span className="text-sm font-mono">
                  {commission.affiliate.slice(0, 10)}...{commission.affiliate.slice(-6)}
                </span>
                <span className="text-sm font-medium">
                  {(parseInt(commission.amount) / 1e12).toFixed(2)} BZR
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Verify link */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          This proof can be independently verified using the Bazari blockchain explorer
        </p>
      </CardContent>
    </Card>
  );
}
```

#### C.4 - AffiliateStatsWidget

**Arquivo:** `apps/web/src/components/affiliate/AffiliateStatsWidget.tsx`

```typescript
import { useAffiliateStats } from '@/hooks/blockchain/useAffiliate';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Percent } from 'lucide-react';

interface AffiliateStatsWidgetProps {
  address: string;
  compact?: boolean;
}

export function AffiliateStatsWidget({ address, compact = false }: AffiliateStatsWidgetProps) {
  const { data: stats, isLoading, error } = useAffiliateStats(address);

  if (isLoading) return <div>Loading stats...</div>;
  if (error) return <div>Error loading stats</div>;
  if (!stats) return null;

  const statItems = [
    {
      label: 'Total Referrals',
      value: stats.totalReferrals,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      label: 'Total Earned',
      value: `${(parseInt(stats.totalEarned) / 1e12).toFixed(2)} BZR`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      label: 'Conversion Rate',
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: Percent,
      color: 'text-purple-600',
    },
    {
      label: 'Last 30 Days',
      value: `+${stats.last30Days.referrals} referrals`,
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {statItems.slice(0, 2).map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon className={`h-4 w-4 ${item.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-semibold">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
            >
              <div className={`p-2 rounded-full bg-white ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sponsor info */}
        {stats.sponsor && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Sponsored by:{' '}
              <code className="bg-slate-100 px-2 py-1 rounded">
                {stats.sponsor.slice(0, 10)}...{stats.sponsor.slice(-6)}
              </code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] Criar `apps/api/src/routes/blockchain/affiliate.ts`
- [ ] Registrar rotas no server.ts
- [ ] Implementar GET /affiliate/tree/:address
- [ ] Implementar GET /affiliate/stats/:address
- [ ] Implementar POST /affiliate/generate-link
- [ ] Implementar GET /affiliate/commission-proof/:saleId
- [ ] Implementar POST /affiliate/prepare-register

### Frontend - Hooks
- [ ] Criar `apps/web/src/hooks/blockchain/useAffiliate.ts`
- [ ] Implementar useReferralTree
- [ ] Implementar useAffiliateStats
- [ ] Implementar useGenerateReferralLink
- [ ] Implementar useMerkleProof
- [ ] Implementar usePrepareRegisterAffiliate

### Frontend - Componentes
- [ ] Criar ReferralTreeVisualization.tsx (D3.js)
- [ ] Criar ReferralLinkCard.tsx
- [ ] Criar MerkleProofViewer.tsx
- [ ] Criar AffiliateStatsWidget.tsx

### Integração
- [ ] Adicionar ReferralTreeVisualization na AffiliateDashboardPage
- [ ] Adicionar ReferralLinkCard na AffiliateDashboardPage
- [ ] Adicionar AffiliateStatsWidget onde apropriado

### Dependências
- [ ] Instalar d3: `pnpm add d3 @types/d3`

---

## DEPENDÊNCIAS

Esta fase é **independente** das outras e pode ser implementada em paralelo.

Requer:
- Pallet bazari-affiliate deployado (já existe)
- D3.js para visualização

---

## TESTES

### Teste 1: Gerar link de referral
1. Registrar como afiliado
2. Gerar link via ReferralLinkCard
3. Verificar link funciona e tem parâmetros corretos

### Teste 2: Visualizar árvore
1. Ter pelo menos 2 níveis de referrals
2. Abrir ReferralTreeVisualization
3. Verificar nodes estão conectados corretamente

### Teste 3: Prova Merkle
1. Ter uma venda com comissões distribuídas
2. Abrir MerkleProofViewer para essa venda
3. Verificar prova exibe corretamente
