# UI/UX Implementation Prompts - Overview

**Status**: Ready for Execution
**Version**: 1.0
**Created**: 2025-11-14
**Total Prompts**: 14 prompts
**Total Effort**: 92 days (18.4 weeks with 1 dev, 9.2 weeks with 2 devs)
**Dependencies**: Gap Analysis, UI Specs, Pallet Specs, Component Patterns

---

## Table of Contents

1. [Purpose](#purpose)
2. [Prompt Structure](#prompt-structure)
3. [Execution Order](#execution-order)
4. [Effort Summary](#effort-summary)
5. [Dependencies](#dependencies)
6. [Quick Links](#quick-links)

---

## Purpose

This directory contains **14 implementation prompts** to address the 54% UI/UX gap identified in the Gap Analysis. Each prompt is a complete, self-contained implementation guide that can be copy-pasted to Claude Code for execution.

**What These Prompts Solve**:
- 80% gap in bazari-rewards (missions, streaks, cashback)
- 60% gap in bazari-dispute (jury voting, commit-reveal UI)
- 50% gap in bazari-affiliate (referral tree, multi-level commissions)
- 30% gap in bazari-escrow (visualization, auto-release countdown)
- Smaller gaps across commerce, attestation, fulfillment, fee pallets

**Design Philosophy**:
- Mobile-first responsive design
- WCAG 2.1 AA accessibility
- Real-time blockchain updates
- Optimistic UI patterns
- Progressive disclosure
- Zero blockchain knowledge assumptions

---

## Prompt Structure

Each prompt follows a consistent 9-section format:

### 1. Metadata Header
```
Phase: P0 | Priority: CRITICAL | Effort: 10 days | Pallets: bazari-rewards
```

### 2. Context (150 lines)
- Problem statement
- Current state
- Target state
- User value proposition

### 3. Objective (100 lines)
- Implementation goal
- Deliverables checklist
- Success criteria

### 4. Specifications (100 lines)
- UI Spec link
- Pallet Spec link
- Gap Analysis reference

### 5. Implementation Details (500 lines)
- Step-by-step guide
- Complete code examples
- File structure
- Component hierarchy

### 6. Acceptance Criteria (50 lines)
- Functional requirements
- Performance requirements
- Accessibility requirements

### 7. Testing Checklist (50 lines)
- Unit tests
- Integration tests
- Manual tests

### 8. Dependencies (30 lines)
- Required backend endpoints
- Blockchain pallet deployment
- Third-party libraries

### 9. Prompt for Claude Code (100 lines)
- Self-contained, copy-paste ready
- All context included
- No external lookups needed

**Total per prompt**: ~1000 lines (average)

---

## Execution Order

Execute prompts in **priority order** (P0 → P1 → P2 → P3):

### Phase 1: P0 - CRITICAL (7 weeks, 35 days)

**Goal**: Implement core missing features for blockchain parity

| Order | Prompt | Effort | Week |
|-------|--------|--------|------|
| 1 | `P0-CRITICAL/01-rewards-missions.md` | 10 days | 1-2 |
| 2 | `P0-CRITICAL/02-escrow-visualization.md` | 6 days | 3 |
| 3 | `P0-CRITICAL/03-commission-tracking.md` | 3 days | 3 |
| 4 | `P0-CRITICAL/04-affiliate-referrals.md` | 8 days | 4-5 |
| 5 | `P0-CRITICAL/05-dispute-voting.md` | 8 days | 6-7 |

**Completion Criteria**:
- [ ] All P0 prompts executed
- [ ] Tests passing (unit + integration)
- [ ] Mobile responsive verified
- [ ] Accessibility audit passed
- [ ] Real-time updates working

**Blockers**:
- Pallet deployment (bazari-rewards, bazari-dispute, bazari-affiliate)
- Backend endpoints for off-chain data
- ZARI token configured

---

### Phase 2: P1 - HIGH (5 weeks, 24 days)

**Goal**: UX improvements and admin features

| Order | Prompt | Effort | Week |
|-------|--------|--------|------|
| 6 | `P1-HIGH/01-order-enhancements.md` | 4 days | 8 |
| 7 | `P1-HIGH/02-escrow-admin.md` | 5 days | 9 |
| 8 | `P1-HIGH/03-attestation-cosign.md` | 3 days | 10 |
| 9 | `P1-HIGH/04-fee-split-visualization.md` | 2 days | 10 |

**Completion Criteria**:
- [ ] Admin features functional
- [ ] User testing completed
- [ ] Performance optimized

---

### Phase 3: P2 - MEDIUM (4 weeks, 22 days)

**Goal**: Advanced features and analytics

| Order | Prompt | Effort | Week |
|-------|--------|--------|------|
| 10 | `P2-MEDIUM/01-admin-dashboards.md` | 10 days | 11-12 |
| 11 | `P2-MEDIUM/02-advanced-ux.md` | 8 days | 13-14 |
| 12 | `P2-MEDIUM/03-analytics.md` | 4 days | 15 |

**Completion Criteria**:
- [ ] Analytics dashboards complete
- [ ] Performance benchmarks met

---

### Phase 4: P3 - LOW (2 weeks, 11 days)

**Goal**: Polish and advanced verification

| Order | Prompt | Effort | Week |
|-------|--------|--------|------|
| 13 | `P3-LOW/01-merkle-verification.md` | 6 days | 16-17 |
| 14 | `P3-LOW/02-advanced-features.md` | 5 days | 17-18 |

**Completion Criteria**:
- [ ] Documentation complete
- [ ] Production ready

---

## Effort Summary

### By Priority

| Priority | Prompts | Days | Weeks (1 dev) | Weeks (2 devs) | Description |
|----------|---------|------|---------------|----------------|-------------|
| **P0 - CRITICAL** | 5 | 35 | 7.0 | 3.5 | Core features, blocking |
| **P1 - HIGH** | 4 | 24 | 4.8 | 2.4 | Important UX improvements |
| **P2 - MEDIUM** | 3 | 22 | 4.4 | 2.2 | Advanced features |
| **P3 - LOW** | 2 | 11 | 2.2 | 1.1 | Nice-to-have polish |
| **TOTAL** | **14** | **92** | **18.4** | **9.2** | Complete implementation |

### By Pallet

| Pallet | Gap % | Prompts | Days | Priority |
|--------|-------|---------|------|----------|
| bazari-rewards | 80% | 1 | 10 | P0 |
| bazari-dispute | 60% | 1 | 8 | P0 |
| bazari-affiliate | 50% | 1 | 8 | P0 |
| bazari-escrow | 30% | 2 | 11 | P0, P1 |
| bazari-commerce | 5% | 2 | 7 | P0, P1 |
| bazari-attestation | 40% | 1 | 3 | P1 |
| bazari-fee | 90% | 1 | 2 | P1 |
| bazari-fulfillment | 15% | 1 | 2 | P2 |
| Cross-pallet | - | 4 | 41 | P2, P3 |

### Timeline Estimates

**Conservative (1 developer)**:
- P0: 7 weeks
- P1: 5 weeks
- P2: 4 weeks
- P3: 2 weeks
- **Total**: 18 weeks (4.5 months)

**Aggressive (2 developers)**:
- P0: 3.5 weeks (parallel work on rewards + escrow/disputes)
- P1: 2.5 weeks
- P2: 2 weeks
- P3: 1 week
- **Total**: 9 weeks (2.25 months)

**Recommended (2 developers + 20% buffer)**:
- **Total**: 11 weeks (2.75 months)

---

## Dependencies

### 1. Documentation Dependencies

All prompts reference these documents (must exist and be accurate):

| Document | Path | Purpose |
|----------|------|---------|
| Gap Analysis | `/root/bazari/UI_UX_GAP_ANALYSIS.md` | Identifies all gaps |
| UI Overview | `/root/bazari/knowledge/20-blueprints/ui-ux/01-OVERVIEW.md` | Design philosophy |
| Component Patterns | `/root/bazari/knowledge/20-blueprints/ui-ux/02-COMPONENT-PATTERNS.md` | Reusable patterns |
| Blockchain Integration | `/root/bazari/knowledge/20-blueprints/ui-ux/03-BLOCKCHAIN-INTEGRATION.md` | Hook patterns |
| UI Specs | `/root/bazari/knowledge/20-blueprints/ui-ux/pallets/*/UI-SPEC.md` | Per-pallet specs |
| Pallet Specs | `/root/bazari/knowledge/20-blueprints/pallets/*/SPEC.md` | Blockchain specs |

### 2. Blockchain Dependencies

**Pallets Must Be Deployed**:
- [ ] bazari-commerce (for CommissionRecorded event)
- [ ] bazari-escrow (for auto-release logic)
- [ ] bazari-rewards (for missions, ZARI token)
- [ ] bazari-attestation (for co-signature quorum)
- [ ] bazari-fulfillment (for courier staking)
- [ ] bazari-affiliate (for referral tree)
- [ ] bazari-fee (for fee configuration)
- [ ] bazari-dispute (for commit-reveal voting)

**Token Configuration**:
- [ ] ZARI token (AssetId: 1) configured in genesis
- [ ] BZR token (native) with sufficient test balance

### 3. Backend Dependencies

**API Endpoints Required**:
```
GET /api/sales/:saleId - Sale details
GET /api/sales/:saleId/commissions - Commission history
GET /api/users/:id/missions - Mission progress (cached)
GET /api/users/:id/streaks - Streak history
GET /api/users/:id/referrals - Referral tree (cached)
GET /api/couriers/:address/stats - Courier statistics
GET /api/ipfs/:cid/preview - IPFS content preview
```

**WebSocket Events**:
```
CommissionRecorded
MissionCompleted
EscrowLocked, FundsReleased
DisputeOpened, VotingEnded
ProofSubmitted, AttestationVerified
```

### 4. Library Dependencies

**New npm packages to install**:
```json
{
  "dependencies": {
    "d3": "^7.8.5",              // Tree visualizations
    "react-countdown": "^2.3.5",  // Countdown timers
    "qrcode.react": "^3.1.0",     // QR codes
    "react-calendar-heatmap": "^1.8.1", // Streak calendar
    "recharts": "^2.9.0",         // Charts
    "crypto-js": "^4.2.0"         // Commit-reveal hashing
  }
}
```

---

## Quick Links

### P0 - CRITICAL (Start Here)

1. **Rewards & Missions** (10 days)
   - Path: `P0-CRITICAL/01-rewards-missions.md`
   - Pallet: bazari-rewards
   - Pages: 4 (MissionsHubPage, StreakHistoryPage, CashbackDashboardPage, AdminMissionsManagementPage)
   - Components: 8 (MissionCard, StreakWidget, CashbackBalance, etc.)
   - Hooks: 8 (useMissions, useUserMissionProgress, useClaimReward, etc.)

2. **Escrow Visualization** (6 days)
   - Path: `P0-CRITICAL/02-escrow-visualization.md`
   - Pallet: bazari-escrow
   - Pages: 2 (EscrowManagementPage, AdminEscrowDashboard)
   - Components: 4 (EscrowCard, CountdownTimer, EscrowEventsLog, etc.)
   - Hooks: 4 (useEscrowDetails, useReleaseFunds, useRefundBuyer, etc.)

3. **Commission Tracking** (3 days)
   - Path: `P0-CRITICAL/03-commission-tracking.md`
   - Pallet: bazari-commerce
   - Pages: 2 (CommissionAnalyticsPage, SaleDetailPage)
   - Components: 3 (CommissionBreakdown, CommissionHistoryTable, etc.)
   - Hooks: 2 (useSale, useSaleCommissions)

4. **Affiliate Referrals** (8 days)
   - Path: `P0-CRITICAL/04-affiliate-referrals.md`
   - Pallet: bazari-affiliate
   - Pages: 2 (ReferralTreePage, CampaignManagementPage)
   - Components: 5 (ReferralTreeVisualization, ReferralLinkGenerator, etc.)
   - Hooks: 4 (useReferralTree, useRegisterReferral, useCampaigns, etc.)

5. **Dispute Voting** (8 days)
   - Path: `P0-CRITICAL/05-dispute-voting.md`
   - Pallet: bazari-dispute
   - Pages: 3 (DisputeDetailPage, MyDisputesPage, AdminDisputesDashboard)
   - Components: 5 (JuryVotingPanel, VotingStatus, etc.)
   - Hooks: 4 (useDisputeDetails, useCommitVote, useRevealVote, etc.)

### P1 - HIGH

6. **Order Enhancements** (4 days)
   - Path: `P1-HIGH/01-order-enhancements.md`
   - Enhancements: State machine, multi-store breakdown, receipt NFT

7. **Escrow Admin** (5 days)
   - Path: `P1-HIGH/02-escrow-admin.md`
   - Admin features: Refund UI, partial refund, history

8. **Attestation Co-Sign** (3 days)
   - Path: `P1-HIGH/03-attestation-cosign.md`
   - Features: Co-signature UI, quorum visualization

9. **Fee Split Visualization** (2 days)
   - Path: `P1-HIGH/04-fee-split-visualization.md`
   - Features: Fee breakdown card, platform fee display

### P2 - MEDIUM

10. **Admin Dashboards** (10 days)
    - Path: `P2-MEDIUM/01-admin-dashboards.md`
    - Dashboards: Fee config, courier slashing, campaign management

11. **Advanced UX** (8 days)
    - Path: `P2-MEDIUM/02-advanced-ux.md`
    - Features: Mission triggers, proof types, reputation display

12. **Analytics** (4 days)
    - Path: `P2-MEDIUM/03-analytics.md`
    - Analytics: Fee history, courier stats, dispute metrics

### P3 - LOW

13. **Merkle Verification** (6 days)
    - Path: `P3-LOW/01-merkle-verification.md`
    - Features: Review verification, commission verification

14. **Advanced Features** (5 days)
    - Path: `P3-LOW/02-advanced-features.md`
    - Features: VRF transparency, advanced charts

---

## How to Use These Prompts

### Option 1: Direct Execution (Recommended)

1. **Open prompt file**: Read the full prompt (e.g., `P0-CRITICAL/01-rewards-missions.md`)
2. **Copy "Prompt for Claude Code" section**: Scroll to Section 9
3. **Paste to Claude Code**: Copy-paste the entire self-contained prompt
4. **Execute**: Claude Code will implement the feature end-to-end
5. **Verify**: Run tests, check acceptance criteria

### Option 2: Incremental Execution

1. **Read Context**: Understand the problem (Section 1-3)
2. **Review Specs**: Check UI Spec and Pallet Spec links (Section 4)
3. **Implement Step-by-Step**: Follow Implementation Details (Section 5)
4. **Test**: Use Testing Checklist (Section 7)
5. **Verify**: Check Acceptance Criteria (Section 6)

### Option 3: Team Distribution

**Parallel Execution** (2 developers):
- **Dev 1**: P0-01 (rewards) + P0-03 (commission)
- **Dev 2**: P0-02 (escrow) + P0-04 (affiliate) + P0-05 (dispute)

**Sequential Dependencies**:
- P0-02 (escrow) must finish before P1-02 (escrow admin)
- P0-01 (rewards) must finish before P2-02 (mission triggers)
- P0-05 (dispute) must finish before P2-01 (admin disputes)

---

## Success Metrics

### Code Quality

- [ ] **Type Safety**: 100% TypeScript, no `any` types
- [ ] **Test Coverage**: ≥80% unit tests, ≥60% integration tests
- [ ] **Accessibility**: WCAG 2.1 AA compliant (tested with axe-core)
- [ ] **Performance**: Lighthouse score ≥90 (mobile)
- [ ] **Bundle Size**: <500kb gzipped (code splitting)

### UX Quality

- [ ] **Mobile-First**: Works on 360px screens (iPhone SE)
- [ ] **Touch-Friendly**: Minimum 44x44px touch targets
- [ ] **Fast Feedback**: <100ms UI updates (optimistic)
- [ ] **Real-Time**: <1s blockchain event propagation
- [ ] **Error Recovery**: Clear error messages + retry mechanisms

### Blockchain Integration

- [ ] **Cache Strategy**: React Query cache with 10s stale time
- [ ] **Event Listeners**: WebSocket subscriptions for all critical events
- [ ] **Gas Estimation**: Display estimated fees before transactions
- [ ] **Transaction Status**: Multi-step progress indicators
- [ ] **Error Handling**: Human-readable blockchain errors

---

## Troubleshooting

### Common Issues

**Issue**: "Pallet not found"
- **Solution**: Ensure blockchain node is running and pallet is deployed
- **Check**: `api.query.bazariRewards` exists in Polkadot.js console

**Issue**: "Events not firing"
- **Solution**: Check WebSocket connection and event subscription
- **Debug**: Enable `useDebugEvents()` hook to see all events

**Issue**: "Cache not invalidating"
- **Solution**: Verify event handlers call `queryClient.invalidateQueries()`
- **Debug**: Check React Query DevTools for stale queries

**Issue**: "UI not responsive"
- **Solution**: Test on real mobile device (not just browser DevTools)
- **Check**: Verify Tailwind breakpoints (md:, lg:)

**Issue**: "Accessibility violations"
- **Solution**: Run axe-core DevTools and fix violations
- **Check**: ARIA labels, keyboard navigation, color contrast

---

## Maintenance

### When to Update Prompts

1. **Pallet changes**: Update if extrinsics/events change
2. **UI spec changes**: Update if UI requirements change
3. **Gap analysis changes**: Update if new gaps identified
4. **Post-implementation**: Update with lessons learned

### Versioning

- **Version 1.0**: Initial prompts (2025-11-14)
- **Version 1.1**: After P0 completion (feedback integration)
- **Version 2.0**: After full implementation (lessons learned)

---

## Contact

**Questions?** Refer to:
- Gap Analysis: `/root/bazari/UI_UX_GAP_ANALYSIS.md`
- UI Overview: `/root/bazari/knowledge/20-blueprints/ui-ux/01-OVERVIEW.md`
- Blockchain Integration: `/root/bazari/knowledge/20-blueprints/ui-ux/03-BLOCKCHAIN-INTEGRATION.md`

**Blockers?** Check:
- Pallet deployment status
- Backend API availability
- Token configuration

---

**Document Status**: ✅ Complete - Ready for execution
**Last Updated**: 2025-11-14
**Next Review**: After P0 completion (Week 8)
