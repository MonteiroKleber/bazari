# bazari-rewards Pallet - UI/UX Documentation

**Status**: COMPLETE
**Priority**: P0 CRITICAL (80% gap)
**Total Lines**: 5,073 lines across 4 files
**Created**: 2025-11-14

---

## Files Generated

1. **UI-SPEC.md** (1,319 lines) - Master specification
   - Overview and gap analysis (20% → 100%)
   - 6 detailed user flows
   - 4 pages specifications
   - 8 components overview
   - 8 blockchain hooks overview
   - Data flow diagrams
   - Testing requirements
   - Acceptance criteria

2. **COMPONENTS.md** (1,343 lines) - Component catalog
   - Component hierarchy tree
   - 8 detailed component specifications:
     - MissionCard (with claim logic)
     - StreakWidget (fire icon, milestones)
     - CashbackBalance (ZARI balance display)
     - StreakCalendar (365-day heatmap)
     - MissionProgressBar (animated)
     - MissionTypeIcon (7 mission types)
     - CashbackHistory (table with pagination)
     - CreateMissionForm (DAO admin form)
   - Full TypeScript interfaces
   - Implementation code for each component
   - Usage examples
   - ASCII mockups
   - Testing checklist

3. **PAGES.md** (1,172 lines) - Pages specifications
   - 4 detailed page specifications:
     - MissionsHubPage (/app/rewards/missions) - 3 days effort
     - StreakHistoryPage (/app/rewards/streaks) - 2 days effort
     - CashbackDashboardPage (/app/rewards/cashback) - 2 days effort
     - AdminMissionsManagementPage (/app/admin/missions) - 3 days effort
   - Desktop/mobile layouts (ASCII mockups)
   - Components used per page
   - Blockchain integration (queries/mutations/subscriptions)
   - State management
   - User actions
   - States (loading/error/empty/success)
   - Responsiveness (desktop/tablet/mobile)
   - Accessibility (ARIA, keyboard nav)
   - Testing requirements
   - Implementation checklists

4. **HOOKS.md** (1,239 lines) - Blockchain hooks
   - 8 detailed hook implementations:
     - **Query Hooks** (4):
       - useMissions - Get all missions
       - useUserMissionProgress - Get user progress
       - useZariBalance - Get ZARI token balance
       - useStreakHistory - Get streak data
     - **Mutation Hooks** (3):
       - useCompleteMission - Claim mission reward
       - useCreateMission - Admin create mission
       - useGrantCashback - Mint ZARI cashback
     - **Subscription Hooks** (1):
       - useMissionCompletedEvents - Real-time updates
   - Full TypeScript implementation code
   - Cache strategies (stale time, gc time)
   - Error handling
   - Usage examples
   - Testing code
   - Dependencies graph

---

## Mission Types Documented

All 7 mission types with full UI examples:

1. **CompleteOrders** - Complete N orders → icon: 📦
2. **SpendAmount** - Spend X BZR → icon: 💰
3. **ReferUsers** - Refer Y users → icon: 👥
4. **CreateStore** - Create marketplace → icon: 🏪
5. **FirstPurchase** - First purchase bonus → icon: 🎉
6. **DailyStreak** - Daily streak (7, 30, 100 day milestones) → icon: 🔥
7. **Custom** - Admin-defined → icon: ⭐

---

## Implementation Roadmap

**Week 1: Core Features (5 days)**
- Day 1-2: Missions Hub Page + hooks + components
- Day 3: Streak Tracking (calendar, widget)
- Day 4: Cashback Dashboard
- Day 5: Real-time updates (WebSocket)

**Week 2: Admin & Polish (5 days)**
- Day 6-7: Admin Panel (DAO only)
- Day 8: Testing & bug fixes
- Day 9: Responsiveness & accessibility
- Day 10: Documentation & deployment

---

## Key Features

- **Missions Dashboard**: Central hub for gamification
- **Streak Tracking**: 365-day calendar heatmap with milestones (7/30/100 days)
- **Cashback Balance**: ZARI token display (transferable, tradable)
- **Real-time Updates**: WebSocket subscriptions for mission completion
- **Mobile-First**: Responsive design (360px+)
- **Accessibility**: WCAG 2.1 AA compliant
- **DAO Admin**: Mission creation interface (Council only)

---

## Technologies

- React 18
- TypeScript
- Next.js 14 (App Router)
- shadcn/ui
- @tanstack/react-query
- @polkadot/api
- react-calendar-heatmap (streak calendar)
- recharts (charts)
- react-hook-form + zod (forms)

---

## Gap Analysis Reference

From `/root/bazari/UI_UX_GAP_ANALYSIS.md` Section 3:

- **Current Coverage**: 20%
- **Target Coverage**: 100%
- **Gap**: 80% (MOST CRITICAL pallet)
- **Effort**: 10 days (2 weeks)
- **Priority**: P0 (CRITICAL)

**What Was Missing (now documented)**:
- Missions Hub (0% → 100%)
- Streak Tracking (0% → 100%)
- Cashback Dashboard (0% → 100%)
- Admin Panel (0% → 100%)
- Real-time Updates (0% → 100%)
- ZARI Token Display (0% → 100%)
- All 7 Mission Types (0% → 100%)

---

## Cross-References

- Pallet Spec: `/root/bazari/knowledge/20-blueprints/pallets/bazari-rewards/SPEC.md`
- Gap Analysis: `/root/bazari/UI_UX_GAP_ANALYSIS.md` (Section 3)
- Blockchain Integration: `/root/bazari/knowledge/20-blueprints/ui-ux/03-BLOCKCHAIN-INTEGRATION.md`
- Component Patterns: `/root/bazari/knowledge/20-blueprints/ui-ux/02-COMPONENT-PATTERNS.md`

---

## Next Steps

1. Review all 4 files (UI-SPEC.md, COMPONENTS.md, PAGES.md, HOOKS.md)
2. Approve implementation roadmap (10 days)
3. Begin Week 1: Missions Hub implementation
4. Set up blockchain hooks infrastructure
5. Create MissionCard component (highest priority)
6. Implement real-time WebSocket subscriptions

---

**Status**: READY FOR IMPLEMENTATION
**Approval Required**: Product Owner / Tech Lead
**Estimated Completion**: 2 weeks (10 working days)
