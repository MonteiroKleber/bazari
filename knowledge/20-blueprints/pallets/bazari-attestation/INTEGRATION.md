# bazari-attestation Pallet - Backend Integration Guide

**Target**: NestJS API + IPFS
**Timeline**: Week 11-12 of Sprint Plan

---

## 🎯 Integration Overview

1. Upload proof files (photos, GPS, signatures) to IPFS
2. Submit IPFS CID to blockchain
3. Collect co-signatures from required parties
4. Auto-verify when quorum reached

---

## 🔧 Step 1: IPFS Service

Create `/root/bazari/apps/api/src/services/ipfs/ipfs.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { create, IPFSHTTPClient } from 'ipfs-http-client';

export interface ProofData {
  orderId: string;
  proofType: 'HandoffProof' | 'DeliveryProof';
  timestamp: string;
  location?: {
    lat: number;
    lon: number;
    accuracy: number;
  };
  photos: string[]; // Base64 or URLs
  signatures: Record<string, string>;
  metadata?: any;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private client: IPFSHTTPClient;

  constructor() {
    this.client = create({
      url: process.env.IPFS_API_URL || 'http://127.0.0.1:5001',
    });
  }

  /**
   * Upload proof to IPFS
   */
  async uploadProof(proof: ProofData): Promise<string> {
    try {
      const proofJson = JSON.stringify(proof, null, 2);
      const result = await this.client.add(proofJson);

      this.logger.log(`Proof uploaded to IPFS: ${result.path}`);

      return result.path; // Returns CID
    } catch (error) {
      this.logger.error('Failed to upload proof to IPFS', error);
      throw error;
    }
  }

  /**
   * Retrieve proof from IPFS
   */
  async getProof(cid: string): Promise<ProofData> {
    try {
      const chunks = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }

      const proofJson = Buffer.concat(chunks).toString();
      return JSON.parse(proofJson);
    } catch (error) {
      this.logger.error('Failed to retrieve proof from IPFS', error);
      throw error;
    }
  }
}
```

---

## 🔄 Step 2: Extend BlockchainService

```typescript
/**
 * Submit proof to blockchain
 */
async submitProof(
  submitter: string,
  orderId: number,
  proofType: 'HandoffProof' | 'DeliveryProof',
  ipfsCid: string,
  requiredSigners: string[],
  threshold: number,
): Promise<{ attestationId: number; txHash: string }> {
  const extrinsic = this.api.tx.bazariAttestation.submitProof(
    orderId,
    proofType,
    ipfsCid,
    requiredSigners,
    threshold,
  );

  const submitterKeyring = this.keyring.addFromAddress(submitter);
  const result = await this.signAndSend(extrinsic, submitterKeyring);

  const proofSubmittedEvent = result.events.find(
    ({ event }) => this.api.events.bazariAttestation.ProofSubmitted.is(event)
  );

  const attestationId = proofSubmittedEvent.event.data[0].toNumber();
  const txHash = result.status.asInBlock.toString();

  return { attestationId, txHash };
}

/**
 * Co-sign proof
 */
async coSignProof(signer: string, attestationId: number): Promise<string> {
  const extrinsic = this.api.tx.bazariAttestation.coSign(attestationId);
  const signerKeyring = this.keyring.addFromAddress(signer);
  const result = await this.signAndSend(extrinsic, signerKeyring);
  return result.status.asInBlock.toString();
}

/**
 * Get attestation from blockchain
 */
async getAttestation(attestationId: number) {
  const attestation = await this.api.query.bazariAttestation.attestations(attestationId);
  return attestation.toJSON();
}
```

---

## 📦 Step 3: Proof Service

Create `/root/bazari/apps/api/src/services/proofs/proof.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { IpfsService, ProofData } from '../ipfs/ipfs.service';

@Injectable()
export class ProofService {
  private readonly logger = new Logger(ProofService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private ipfs: IpfsService,
  ) {}

  /**
   * Submit handoff proof (Seller → Courier)
   */
  async submitHandoffProof(
    orderId: string,
    sellerId: string,
    courierId: string,
    photos: string[],
    location?: { lat: number; lon: number },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });

    // Get wallet addresses
    const sellerProfile = await this.prisma.profile.findUnique({
      where: { id: sellerId },
    });
    const courierProfile = await this.prisma.profile.findUnique({
      where: { id: courierId },
    });
    const buyerProfile = await this.prisma.profile.findUnique({
      where: { id: order.userId },
    });

    // Create proof data
    const proofData: ProofData = {
      orderId,
      proofType: 'HandoffProof',
      timestamp: new Date().toISOString(),
      location: location ? { ...location, accuracy: 10 } : undefined,
      photos,
      signatures: {
        seller: 'pending',
        courier: 'pending',
      },
      metadata: {
        packageWeight: order.metadata?.weight,
        trackingId: order.metadata?.trackingId,
      },
    };

    // Upload to IPFS
    const ipfsCid = await this.ipfs.uploadProof(proofData);

    // Submit to blockchain (2-of-3: seller, courier, buyer)
    const { attestationId, txHash } = await this.blockchain.submitProof(
      sellerProfile.walletAddress,
      parseInt(orderId.replace('chain_', '')),
      'HandoffProof',
      ipfsCid,
      [
        sellerProfile.walletAddress,
        courierProfile.walletAddress,
        buyerProfile.walletAddress,
      ],
      2, // 2-of-3 threshold
    );

    this.logger.log(`Handoff proof submitted: attestationId=${attestationId}`);

    return { attestationId, ipfsCid, txHash };
  }

  /**
   * Co-sign proof
   */
  async coSignProof(attestationId: number, userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    const txHash = await this.blockchain.coSignProof(
      profile.walletAddress,
      attestationId,
    );

    return { txHash };
  }

  /**
   * Get proof from IPFS
   */
  async getProof(ipfsCid: string) {
    return this.ipfs.getProof(ipfsCid);
  }
}
```

---

## 🛣️ Step 4: API Routes

```typescript
import { Router } from 'express';
import { ProofService } from '../services/proofs/proof.service';

const router = Router();

/**
 * POST /api/proofs/handoff
 * Submit handoff proof
 */
router.post('/handoff', async (req, res) => {
  try {
    const result = await proofService.submitHandoffProof(
      req.body.orderId,
      req.user.id,
      req.body.courierId,
      req.body.photos,
      req.body.location,
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/proofs/:attestationId/sign
 * Co-sign proof
 */
router.post('/:attestationId/sign', async (req, res) => {
  try {
    const result = await proofService.coSignProof(
      parseInt(req.params.attestationId),
      req.user.id,
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/proofs/:cid
 * Get proof from IPFS
 */
router.get('/:cid', async (req, res) => {
  try {
    const proof = await proofService.getProof(req.params.cid);
    res.json(proof);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 🧪 Testing

```bash
# 1. Submit handoff proof
curl -X POST http://localhost:3000/api/proofs/handoff \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "orderId": "chain_123",
    "courierId": "courier1",
    "photos": ["base64..."],
    "location": {"lat": -23.5505, "lon": -46.6333}
  }'

# 2. Courier co-signs
curl -X POST http://localhost:3000/api/proofs/0/sign \
  -H "Authorization: Bearer $COURIER_TOKEN"

# 3. Verify (should be verified after 2nd signature)
curl http://localhost:3000/api/orders/chain_123/attestations
```

---

## ✅ Integration Checklist

- [ ] IPFS service running (ipfs daemon)
- [ ] IpfsService implemented
- [ ] ProofService created
- [ ] Routes for proof submission/co-signing
- [ ] Sync worker for attestation events
- [ ] Frontend UI for proof upload/signing

---

## 📚 Next Steps

After completing bazari-attestation:
1. Implement [bazari-fulfillment](../bazari-fulfillment/INTEGRATION.md) (courier matching)
2. Integrate proofs with order delivery flow
3. Test complete Proof of Commerce flow
