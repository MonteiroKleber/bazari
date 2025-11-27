# Advanced Features UI/UX - Implementation Prompt

**Phase**: P2 - MEDIUM Priority
**Priority**: MEDIUM
**Effort**: 6 days
**Dependencies**: bazari-attestation, bazari-rewards pallets
**Pallets**: bazari-attestation, bazari-rewards
**Version**: 1.0
**Last Updated**: 2025-11-14

---

## 📋 Context

Implement advanced UI features:
1. **Proof Type Visualization** - Icons and filters for 4 proof types
2. **IPFS Proof Viewer Enhancements** - Better preview capabilities
3. **Mission Completion Triggers** - WebSocket notifications for completed missions

**Current State** (from Gap Analysis Sections 4.2, 3.4):
- ❌ No proof type differentiation
- ❌ No IPFS preview enhancements
- ❌ No mission completion notifications

---

## 🎯 Objective

**Deliverables**:
- 3 component enhancements (ProofCard, IPFSViewer, MissionCard)
- 2 hooks (useMissionCompletedEvents, useProofTypeFilter)

---

## 🔨 Implementation Details

### Step 1: Enhance ProofCard with Type Filtering (2 days)

**Location**: `/root/bazari/apps/web/src/components/attestation/ProofCard.tsx` (Edit)

```typescript
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProofTypeIcon, ProofType } from './ProofTypeIcon';

const PROOF_TYPE_TABS = [
  { value: 'all', label: 'All Proofs' },
  { value: ProofType.HandoffProof, label: '🤝 Handoff' },
  { value: ProofType.DeliveryProof, label: '📦 Delivery' },
  { value: ProofType.PackingProof, label: '📦 Packing' },
  { value: ProofType.InspectionProof, label: '🔍 Inspection' },
];

export function ProofListWithFilters({ orderId }: { orderId: number }) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const { data: proofs } = useProofsByOrder(orderId);

  const filteredProofs = activeTab === 'all'
    ? proofs
    : proofs?.filter(p => p.proofType === activeTab);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {PROOF_TYPE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {filteredProofs?.map((proof) => (
          <ProofCard key={proof.id} proof={proof} />
        ))}
      </div>
    </div>
  );
}
```

---

### Step 2: Enhance IPFS Proof Viewer (2 days)

**Location**: `/root/bazari/apps/web/src/components/attestation/IPFSPreview.tsx` (Edit)

Add GPS map preview for proofs with GPS data:

```typescript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export function IPFSPreview({ cid }: { cid: string }) {
  const { data: content } = useQuery({
    queryKey: ['ipfs-content', cid],
    queryFn: async () => {
      const response = await fetch(`/api/ipfs/${cid}/preview`);
      return response.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proof Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Preview */}
        {content?.type === 'image' && (
          <img src={content.thumbnailUrl} alt="Proof" className="rounded-lg w-full" />
        )}

        {/* JSON Preview */}
        {content?.type === 'json' && (
          <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(content.data, null, 2)}
          </pre>
        )}

        {/* GPS Map Preview (NEW) */}
        {content?.gpsData && (
          <div className="h-64 rounded-lg overflow-hidden">
            <MapContainer
              center={[content.gpsData.latitude, content.gpsData.longitude]}
              zoom={15}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[content.gpsData.latitude, content.gpsData.longitude]}>
                <Popup>
                  {content.gpsData.address || 'Proof location'}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {/* Download Button */}
        <Button
          variant="outline"
          onClick={() => window.open(`https://ipfs.io/ipfs/${cid}`, '_blank')}
        >
          View on IPFS →
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### Step 3: Mission Completion Notifications (2 days)

**Hook**: `/root/bazari/apps/web/src/hooks/useMissionCompletedEvents.ts`

```typescript
import { useEffect } from 'react';
import { usePolkadotApi } from '@/providers/PolkadotProvider';
import { useToast } from '@/components/ui/use-toast';

export function useMissionCompletedEvents(userAddress: string) {
  const { api } = usePolkadotApi();
  const { toast } = useToast();

  useEffect(() => {
    if (!api || !userAddress) return;

    const unsubscribe = api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (
          event.section === 'bazariRewards' &&
          event.method === 'MissionCompleted'
        ) {
          const [user, missionId] = event.data;

          if (user.toString() === userAddress) {
            toast({
              title: '🎉 Mission Completed!',
              description: `You earned rewards for completing mission #${missionId}. Click to claim.`,
              action: {
                label: 'View Missions',
                onClick: () => window.location.href = '/app/rewards/missions',
              },
            });
          }
        }
      });
    });

    return () => {
      unsubscribe.then((unsub) => unsub());
    };
  }, [api, userAddress, toast]);
}
```

**Integration**: Add to main layout

```typescript
// /root/bazari/apps/web/src/app/layout.tsx
import { useMissionCompletedEvents } from '@/hooks/useMissionCompletedEvents';

export default function RootLayout({ children }) {
  const { user } = useSession();

  // Subscribe to mission completed events
  useMissionCompletedEvents(user?.address);

  return <html>{children}</html>;
}
```

---

## ✅ Acceptance Criteria

1. **Proof Type Filters**
   - [ ] Tabs filter proofs by type (All, Handoff, Delivery, Packing, Inspection)
   - [ ] Icons display correctly for each type

2. **IPFS Enhancements**
   - [ ] GPS map displays for proofs with location data
   - [ ] Image thumbnails load within 2s

3. **Mission Notifications**
   - [ ] Toast appears when mission completed
   - [ ] "View Missions" button links to missions page
   - [ ] Only shows for current user's missions

---

## 🧪 Testing

**Manual**:
- [ ] Filter proofs by type → verify only matching proofs shown
- [ ] Submit proof with GPS → verify map displays
- [ ] Complete mission → verify toast notification appears

---

## 🤖 Prompt for Claude Code

```
Implement Advanced Features UI/UX for bazari-attestation and bazari-rewards.

**Objective**:
1. Add proof type filtering tabs to ProofCard
2. Enhance IPFSPreview with GPS map preview
3. Implement useMissionCompletedEvents hook for WebSocket notifications

**Components**:
- /root/bazari/apps/web/src/components/attestation/ProofCard.tsx (edit)
- /root/bazari/apps/web/src/components/attestation/IPFSPreview.tsx (edit)
- /root/bazari/apps/web/src/hooks/useMissionCompletedEvents.ts (new)

**Testing**: Filter proofs, GPS map display, mission completion toast

**References**: /root/bazari/UI_UX_GAP_ANALYSIS.md Sections 4.2, 3.4
```

---

**Version**: 1.0
**Last Updated**: 2025-11-14
