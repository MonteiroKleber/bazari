# bazari-affiliate UI/UX Specifications - COMPLETE

**Generated**: 2025-11-14
**Status**: ✅ COMPLETE - Ready for Implementation
**Priority**: P0 CRITICAL (50% gap → 100% coverage)
**Effort**: 8 days
**Coverage Achievement**: 50% → 100%

---

## 📊 Executive Summary

Complete UI/UX specifications generated for the **bazari-affiliate** pallet, addressing the critical 50% gap identified in the UI/UX Gap Analysis. This is the **most critical feature for viral growth**, implementing a multi-level referral system with Merkle DAG privacy.

### Gap Closure

| Feature | Before | After | Status |
|---------|--------|-------|--------|
| Referral Link Generation | ❌ 0% | ✅ 100% | Complete spec |
| Referral Tree Visualization | ❌ 0% | ✅ 100% | D3.js implementation |
| Multi-Level Commissions | ⚠️ 50% | ✅ 100% | Full breakdown |
| Campaign Management | ❌ 0% | ✅ 100% | CRUD operations |
| Merkle Proof Verification | ❌ 0% | ✅ 100% | Privacy UI |
| Real-Time Updates | ❌ 0% | ✅ 100% | WebSocket hooks |

---

## 📁 Generated Files

### 1. UI-SPEC.md (2,356 lines / 75 KB)
**Location**: `/root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-affiliate/UI-SPEC.md`

**Contents**:
- Section 1: Overview (current 50%, target 100%, detailed gaps)
- Section 2: User Flows (5 complete flows)
  * Generate Referral Link (unique URL + QR code)
  * Share Referral Link (WhatsApp, Twitter, Email)
  * View Referral Tree (5-level DAG visualization)
  * Earn Multi-Level Commission (Level 0-4 breakdown)
  * Create Campaign (Store/DAO with custom rates)
- Section 3: Pages Required (2 pages)
  * ReferralTreePage (/app/affiliate/referrals) - PRIMARY
  * CampaignManagementPage (/app/affiliate/campaigns)
- Section 4: Components Required (7 components)
- Section 5: Blockchain Hooks (6 hooks)
- Section 6: Data Flow (referral → sale → commission split → payment)
- Section 7: Gaps & Implementation Plan (8-day roadmap)
- Section 8: Testing Requirements
- Section 9: Acceptance Criteria

**Key Features**:
- Complete commission structure: 5% → 2.5% → 1.25% → 0.625% → 0.3125%
- Referral link format: `https://bazari.xyz/r/0xAlice`
- Merkle DAG privacy model (only root on-chain)
- Real-time commission flow animations

---

### 2. COMPONENTS.md (1,352 lines / 41 KB)
**Location**: `/root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-affiliate/COMPONENTS.md`

**Contents**:
- Component Hierarchy (visual tree)
- Components Catalog (7 core components):
  1. **ReferralLinkGenerator**: URL + QR code + social sharing
  2. **ReferralTreeVisualization**: Interactive D3.js tree (5 levels, zoom/pan)
  3. **ReferralStats**: Total referrals, active buyers, earnings
  4. **CommissionBreakdownCard**: Visual split by level (L0-L4)
  5. **CreateCampaignForm**: Modal form with live preview
  6. **CampaignDetailCard**: Stats, budget progress, actions
  7. **MerkleProofViewer**: Privacy-preserving verification UI
- Shared Components (EmptyState, Skeleton loaders)
- Component Dependencies Graph
- Design Tokens (colors, spacing, typography)
- Accessibility Guidelines (WCAG 2.1 AA)

**Implementation Details**:
- Full TypeScript interfaces for all props
- Complete implementation code (ready to copy-paste)
- State management patterns
- Performance optimizations (virtualization, lazy loading)

---

### 3. PAGES.md (1,036 lines / 39 KB)
**Location**: `/root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-affiliate/PAGES.md`

**Contents**:
- Pages Overview (2 pages)
- **ReferralTreePage** (PRIMARY - MOST COMPLEX):
  * Layout: 2-column (Tree 70% | Sidebar 30%)
  * D3.js tree specification (nodes, edges, animations)
  * Level filter tabs (All, L1, L2, L3, L4)
  * Search functionality
  * Real-time updates (WebSocket)
  * Responsive behavior (desktop, tablet, mobile)
  * Performance optimizations (code splitting, caching)
- **CampaignManagementPage**:
  * Tabs: Active, Scheduled, Paused, Expired
  * Create campaign form (modal)
  * Campaign list with filters
  * Access control (Store owners, DAO)
- Routing & Navigation
- SEO & Metadata
- Error Handling

**Technical Highlights**:
- Mobile-responsive (touch gestures, bottom sheets)
- Incremental loading (levels 0-2 first, then 3-4 on demand)
- CSV export functionality
- Real-time budget depletion alerts

---

### 4. HOOKS.md (1,211 lines / 34 KB)
**Location**: `/root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-affiliate/HOOKS.md`

**Contents**:
- Hooks Overview (6 total hooks)
- **Query Hooks** (3 hooks):
  1. `useReferralTree`: Recursive BFS, up to 5 levels
  2. `useCampaigns`: Filter by store/status
  3. `useCommissionHistory`: Paginated earnings
- **Mutation Hooks** (2 hooks):
  1. `useRegisterReferral`: Register new referral
  2. `useCreateCampaign`: Create affiliate campaign
- **Subscription Hooks** (1 hook):
  1. `useCommissionSplitEvents`: Real-time notifications
- Utility Hooks (`useAffiliateStats`, `useMerkleProof`)
- Error Handling (common error types, patterns)
- Testing (unit tests, integration tests)

**Implementation Details**:
- React Query integration
- Polkadot.js API calls
- WebSocket event listeners
- Cache invalidation strategies
- Optimistic updates

---

## 🎯 Commission Structure (Core Mechanic)

```
Sale: 100 BZR order
├─ Level 0 (Direct Referrer): 5.00 BZR (5.00%)
├─ Level 1: 2.50 BZR (2.50%)
├─ Level 2: 1.25 BZR (1.25%)
├─ Level 3: 0.625 BZR (0.625%)
└─ Level 4: 0.3125 BZR (0.3125%)
───────────────────────────────────────
Total Commission: 9.6875 BZR (9.69%)
Seller Receives: 90.3125 BZR (90.31%)
```

**Formula**: `Level N commission = 5% × (0.5 ^ N)`

---

## 🏗️ Implementation Roadmap (8 Days)

### Day 1-2: Referral Link & QR Code (2 days)
- ReferralLinkGenerator component
- QR code generation (qrcode.react)
- Social share integration
- Redirect route `/r/:address`

### Day 3-5: Referral Tree Visualization (3 days)
- D3.js tree component
- useReferralTree hook (recursive BFS)
- Level filter tabs
- Search functionality
- Real-time updates (WebSocket)
- ReferralStats sidebar

### Day 6: Commission Breakdown & History (1 day)
- CommissionBreakdownCard component
- useCommissionHistory hook
- Integration with OrderPage

### Day 7: Campaign Management (1 day)
- CreateCampaignForm modal
- CampaignDetailCard component
- CampaignManagementPage
- useCreateCampaign hook

### Day 8: Merkle Proof & Real-Time (1 day)
- MerkleProofViewer component
- useCommissionSplitEvents hook
- Toast notifications
- Commission flow animation
- E2E testing

---

## 🧪 Testing Requirements

### Unit Tests
- Component rendering (7 components)
- Hook functionality (6 hooks)
- Utility functions (formatting, validation)

### Integration Tests
- Blockchain interactions (queries, mutations)
- WebSocket subscriptions
- Cache invalidation

### E2E Tests (Playwright)
- Complete referral flow (generate link → register → earn commission)
- Campaign creation flow
- Tree visualization interactions

**Coverage Target**: 80%+

---

## 📦 Dependencies

### New Dependencies Required
```json
{
  "d3": "^7.8.5",              // Tree visualizations
  "qrcode.react": "^3.1.0",     // QR codes
  "recharts": "^2.9.0",         // Charts (optional)
  "@tanstack/react-query": "^4.36.0", // Already installed
  "@polkadot/api": "^10.11.0"   // Already installed
}
```

### Backend Dependencies
- Backend API for Merkle proof generation
- PostgreSQL indexing for referral trees (performance)
- WebSocket server for real-time events

---

## ✅ Acceptance Criteria

### Functional Requirements
- ✅ Referral link generation works (unique URL + QR code)
- ✅ Tree renders up to 5 levels (D3.js)
- ✅ Commission split calculates correctly (5% decay)
- ✅ Real-time notifications appear (< 5s latency)
- ✅ Campaigns can be created/paused/deleted
- ✅ Merkle proof verification succeeds

### Non-Functional Requirements
- ✅ Tree loads in < 2s (cached)
- ✅ Handles 1000+ nodes without lag
- ✅ Mobile-responsive (360px+)
- ✅ WCAG 2.1 AA compliant

### Business Metrics (Post-Launch)
- **Viral Coefficient (K)**: > 1.2 (target)
- **Conversion Rate**: Referral link → Registration > 15%
- **Average Referrals per User**: > 3
- **Commission Payout Efficiency**: > 80% of budget used

---

## 🚀 Next Steps

1. **Review**: Frontend team reviews all 4 specs
2. **Approval**: UX team approves designs
3. **Implementation**: Start Day 1 (ReferralLinkGenerator)
4. **Testing**: Write tests alongside implementation
5. **Deployment**: Gradual rollout (beta → production)

---

## 📚 Cross-References

- **Gap Analysis**: /root/bazari/UI_UX_GAP_ANALYSIS.md (Section 6)
- **Pallet Spec**: /root/bazari/knowledge/20-blueprints/pallets/bazari-affiliate/SPEC.md
- **Implementation Guide**: /root/bazari/knowledge/20-blueprints/pallets/bazari-affiliate/IMPLEMENTATION.md

---

## 📊 File Statistics

| File | Lines | Size | Completeness |
|------|-------|------|--------------|
| UI-SPEC.md | 2,356 | 75 KB | ✅ 100% |
| COMPONENTS.md | 1,352 | 41 KB | ✅ 100% |
| PAGES.md | 1,036 | 39 KB | ✅ 100% |
| HOOKS.md | 1,211 | 34 KB | ✅ 100% |
| **TOTAL** | **5,955** | **189 KB** | **✅ 100%** |

---

**Status**: ✅ **COMPLETE - READY FOR IMPLEMENTATION**

**Critical for Viral Growth**: This is the most important feature for user acquisition. Multi-level referrals create exponential growth (K > 1.2 target).

**Estimated ROI**: 
- Development Cost: 8 days (1 dev)
- Expected Impact: 3x user growth in 6 months
- Commission Cost: ~10% of sales (sustainable)

---

*Generated by: Claude Code Senior Architect*
*Date: 2025-11-14*
*Version: 1.0 FINAL*
