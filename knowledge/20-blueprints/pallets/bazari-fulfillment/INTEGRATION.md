# bazari-fulfillment Pallet - Backend Integration Guide

**Target**: Courier matching + assignment
**Timeline**: Week 13-14

## 🔧 BlockchainService Extension

```typescript
async registerCourier(account: string, stake: string, serviceAreas: number[]) {
  const extrinsic = this.api.tx.bazariFulfillment.registerCourier(stake, serviceAreas);
  const keyring = this.keyring.addFromAddress(account);
  return await this.signAndSend(extrinsic, keyring);
}

async assignCourier(orderId: number, courierAddress: string) {
  const extrinsic = this.api.tx.bazariFulfillment.assignCourier(orderId, courierAddress);
  return await this.signAndSend(extrinsic, this.platformAccount);
}
```

## 🎯 Matching Service

```typescript
@Injectable()
export class CourierMatchingService {
  async findBestCourier(orderLocation: { lat: number; lon: number }) {
    // Query all active couriers from PostgreSQL (synced from blockchain)
    const couriers = await this.prisma.courier.findMany({
      where: {
        isActive: true,
        stakeAmount: { gte: '1000' },
      },
      orderBy: { reputationScore: 'desc' },
    });

    // Find closest courier
    const best = couriers.find(c =>
      this.isWithinServiceArea(c.serviceAreas, orderLocation)
    );

    return best;
  }
}
```

## ✅ Integration Checklist
- [ ] Courier registration UI
- [ ] Auto-assignment on order creation
- [ ] Reputation updates after delivery
- [ ] Slashing via admin panel

## 📚 Next: [bazari-affiliate](../bazari-affiliate/INTEGRATION.md)
