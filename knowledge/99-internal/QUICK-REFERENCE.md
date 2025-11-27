# Bazari Knowledge Base - Quick Reference Guide

## File Locations Map

### Main Navigation
- **Master Index**: `/root/bazari/knowledge/README.md`
- **Blueprints Overview**: `/root/bazari/knowledge/20-blueprints/`
- **Implementation Prompts**: `/root/bazari/knowledge/99-internal/implementation-prompts/`
- **Structure Analysis**: `/root/bazari/knowledge/99-internal/DOCUMENTATION-STRUCTURE-ANALYSIS.md` (THIS FILE)

### For Different Users

**Architects**:
```
/knowledge/README.md
  ↓
/20-blueprints/blockchain-integration/00-OVERVIEW.md
  ↓
/20-blueprints/blockchain-integration/05-IMPLEMENTATION-ROADMAP.md
  ↓
/20-blueprints/pallets/00-PALLETS-INDEX.md
```

**Developers**:
```
/99-internal/implementation-prompts/00-README.md
  ↓
Pick pallet: /20-blueprints/pallets/{pallet}/SPEC.md
  ↓
Follow guide: /99-internal/implementation-prompts/{phase}/{pallet}.md
  ↓
Integrate: /20-blueprints/pallets/{pallet}/INTEGRATION.md
```

**New Hires**:
```
/00-vision/bazari-vision.md
  ↓
/00-vision/bazari-architecture.md
  ↓
/10-modules/auth/ (example complete module)
  ↓
/00-vision/glossary.md
```

## Key Files Reference

### Blockchain Integration (Strategic)
| File | Purpose | Length |
|------|---------|--------|
| 00-OVERVIEW.md | 60% on-chain vision | ~500 lines |
| 01-CURRENT-STATE-ANALYSIS.md | 71 models breakdown | ~400 lines |
| 02-TARGET-ARCHITECTURE.md | Final architecture | ~300 lines |
| 03-UNIFICATION-STRATEGY.md | Order unification | ~250 lines |
| 04-PROOF-OF-COMMERCE.md | 7-layer protocol | ~350 lines |
| 05-IMPLEMENTATION-ROADMAP.md | 24-week plan | ~600 lines |

### Pallet Documentation (8 Pallets)
Each pallet has exactly 3 files:

**SPEC.md** (500-800 lines):
- Storage structures (Rust code)
- Extrinsics/functions
- Events, Errors
- Integration points
- Weight functions
- Test requirements

**IMPLEMENTATION.md** (200-400 lines):
- Week-by-week breakdown
- Setup instructions
- Code walkthrough
- Testing strategy
- Troubleshooting

**INTEGRATION.md** (300-600 lines):
- Service implementation
- Database changes
- API endpoints
- Event syncing
- Setup guide

### Implementation Prompts (18 Files)

**Phase 1 - Foundation** (Weeks 1-8):
1. 01-schema-unification.md - Prisma/Substrate mapping
2. 02-bazari-commerce.md - Orders on-chain
3. 03-bazari-escrow.md - Lock/Release escrow
4. 04-bazari-rewards.md - ZARI tokens

**Phase 2 - Proof of Commerce** (Weeks 9-16):
5. 01-bazari-attestation.md - Cryptographic proofs
6. 02-bazari-fulfillment.md - Courier registry
7. 03-bazari-affiliate.md - Commission DAG
8. 04-bazari-fee.md - Payment splits
9. 05-bazari-dispute.md - VRF + jury voting

**Phase 3 - Backend Integration** (Weeks 17-24):
10. 01-blockchain-service.md - Base service
11. 02-review-merkle-service.md - Merkle reviews
12. 03-gps-tracking-service.md - GPS tracking
13. 04-workers-cron.md - Background jobs
14. 05-frontend-integration.md - React hooks

## Naming Conventions

### Directory Structure
```
00-{name}     = Vision/Direction (priority)
10-{name}     = Modules (implementation)
20-{name}     = Blueprints (specs)
30-{name}     = Operations (maintenance)
99-{name}     = Internal (meta)
```

### Pallet Documentation
```
{pallet-name}/
├── SPEC.md           (ALWAYS UPPERCASE)
├── IMPLEMENTATION.md (ALWAYS UPPERCASE)
└── INTEGRATION.md    (ALWAYS UPPERCASE)
```

### File Prefixes
```
00-{title}.md    = Overview/Introduction
01-{title}.md    = First item
02-{title}.md    = Second item
...
99-{title}.md    = Special/Internal
```

## Status Emoji Legend

| Emoji | Meaning | Example |
|-------|---------|---------|
| 🎯 | Active/In Progress | 🎯 Priority 1 - CRITICAL |
| ✅ | Complete/Done | ✅ 100% Complete |
| ⏳ | Pending/TODO | ⏳ In Progress |
| ❌ | Deprecated | ❌ DESCONTINUADO |
| ⚠️ | Warning/Issue | ⚠️ Partial (MOCK) |
| 🆕 | New | 🆕 New Feature |

## Metadata Header Template

Every file starts with:
```markdown
# Title

**Status**: [🎯|✅|⏳|❌] Status
**Effort**: X days/weeks
**Dependencies**: pallet-X, pallet-Y
**Last Updated**: YYYY-MM-DD

---
```

## Key Statistics

| Metric | Value |
|--------|-------|
| Total Documents | ~156 markdown files |
| Total Lines | ~46,100 lines |
| Pallet Coverage | 8 pallets, 24 files |
| Module Coverage | 20 modules, 80 files |
| Implementation Phases | 3 phases, 14 prompts |
| Architecture Diagrams | 6 Mermaid diagrams |
| Completion Status | 100% for P1+P2, ⏳ for P3 |

## Document Type Sizes

| Type | Count | Avg Size |
|------|-------|----------|
| SPEC.md | 8 | 500 lines |
| IMPLEMENTATION.md | 8 | 300 lines |
| INTEGRATION.md | 8 | 400 lines |
| Prompt files | 18 | 500 lines |
| Architecture | 6 | 333 lines |
| Module docs | 80 | 250 lines |

## Dependency Flow

### Linear Dependency (P1)
```
schema-unification
       ↓
bazari-commerce
       ├─ bazari-escrow
       └─ bazari-rewards
```

### Parallel Dependencies (P2)
```
bazari-commerce (prerequisite)
       ↓
   ┌───┴───┬───────┐
   ↓       ↓       ↓
attestation affiliate fee
   ↓
fulfillment
   ↓
dispute
```

## Quick Lookup: Find a Topic

### "I need to understand {topic}"
- **Orders on-chain**: `/20-blueprints/pallets/bazari-commerce/SPEC.md`
- **Payments**: `/20-blueprints/pallets/bazari-escrow/SPEC.md`
- **Rewards/Tokens**: `/20-blueprints/pallets/bazari-rewards/SPEC.md`
- **Delivery Tracking**: `/20-blueprints/pallets/bazari-fulfillment/GPS-TRACKING.md`
- **Reviews System**: `/20-blueprints/pallets/bazari-fulfillment/REVIEWS-ARCHITECTURE.md`
- **Disputes**: `/20-blueprints/pallets/bazari-dispute/SPEC.md`
- **Affiliates**: `/20-blueprints/pallets/bazari-affiliate/SPEC.md`

### "I need to implement {feature}"
- **Any pallet**: `/99-internal/implementation-prompts/{phase}/{pallet}.md`
- **Schema changes**: `/99-internal/implementation-prompts/01-foundation/01-schema-unification.md`
- **Backend service**: `/20-blueprints/pallets/{pallet}/INTEGRATION.md`
- **Testing**: `/99-internal/implementation-prompts/99-templates/testing-template.md`

### "I need to understand architecture"
- **System overview**: `/20-blueprints/blockchain-integration/00-OVERVIEW.md`
- **Current state**: `/20-blueprints/blockchain-integration/01-CURRENT-STATE-ANALYSIS.md`
- **Target design**: `/20-blueprints/blockchain-integration/02-TARGET-ARCHITECTURE.md`
- **Timeline**: `/20-blueprints/blockchain-integration/05-IMPLEMENTATION-ROADMAP.md`
- **Database mapping**: `/20-blueprints/schema/SCHEMA-MAPPING.md`

## Cross-Reference Examples

### From bazari-commerce SPEC:
- Problem: See OVERVIEW.md
- Integration: See IMPLEMENTATION.md
- Backend: See INTEGRATION.md
- Dependencies: pallet-stores, pallet-balances
- Next step: bazari-escrow

### From Implementation Prompt:
- Specification: ../../../20-blueprints/pallets/{pallet}/SPEC.md
- Integration: ../../../20-blueprints/pallets/{pallet}/INTEGRATION.md
- Roadmap: ../../../20-blueprints/blockchain-integration/05-IMPLEMENTATION-ROADMAP.md
- Templates: ../99-templates/

## Document Generation Commands

```bash
# Count all markdown files
find /root/bazari/knowledge -name "*.md" | wc -l

# Check file sizes
wc -l /root/bazari/knowledge/20-blueprints/pallets/*/*.md

# List all pallet specs
ls -la /root/bazari/knowledge/20-blueprints/pallets/*/SPEC.md

# View blueprint structure
tree /root/bazari/knowledge/20-blueprints -L 2
```

## Update Workflow

1. **Read**: Find relevant document
2. **Edit**: Update content
3. **Update Metadata**:
   - Change `**Last Updated**` field
   - Increment `**Version**` if significant
4. **Document**: Add entry to changelog
5. **Reference**: Update related documents

## Best Practices

1. **Always check metadata** first for status/effort
2. **Follow the 3-layer pattern** (SPEC → IMPLEMENTATION → INTEGRATION)
3. **Use relative links** for cross-references
4. **Start with README** in any directory
5. **Check dependencies** before starting implementation
6. **Use status emojis** for quick visual scanning
7. **Keep docs in sync** with code changes
8. **Reference PRs** when updating documentation

---

**Generated**: 2025-11-14
**For**: Bazari Platform Development Team
**Version**: 1.0.0

