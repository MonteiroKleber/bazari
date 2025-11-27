# Bazari Frontend - Complete Index

**Generated**: November 14, 2025
**Repository**: /root/bazari/apps/web/src
**Status**: Comprehensive mapping complete

## Quick Navigation

1. **FRONTEND_SUMMARY.md** - Executive overview (high-level features, 10 minutes read)
2. **FRONTEND_MAPPING.md** - Detailed technical mapping (exhaustive reference, 30+ minute read)
3. **FRONTEND_INDEX.md** - This file (quick navigation guide)

---

## What You'll Find

### FRONTEND_SUMMARY.md
Best for: Project managers, designers, stakeholders
Contains:
- Feature overview (all 10 major systems)
- Statistics (pages, components, modules, hooks)
- Page categorization
- Blockchain integration status
- Key workflows
- Enhancement areas

### FRONTEND_MAPPING.md
Best for: Developers, technical leads, architects
Contains:
- Detailed page descriptions (56+ pages)
- Component inventory (200+ components)
- Module breakdown (7 major modules)
- Hook documentation (50+ hooks)
- Blockchain integration details
- Type definitions
- Route structure
- State management
- Security features

---

## Key Statistics

| Metric | Count |
|--------|-------|
| Total Pages | 56+ |
| Total Components | 200+ |
| Major Modules | 7 |
| Custom Hooks | 50+ |
| Application Routes | 80+ |
| UI Base Components | 30+ |
| Lines of Code | 100,000+ |

---

## System Categories

### 1. E-Commerce Platform
**Pages**: SearchPage, ProductDetailPage, CartPage, CheckoutPage, OrderPage, StorePublicPage
**Features**: Product catalog, shopping cart, checkout flow, order management, delivery tracking
**Status**: Complete

### 2. Social & Community
**Pages**: FeedPage, PostDetailPage, BookmarksPage, DiscoverPeoplePage, ProfilePublicPage
**Features**: Social feed, posts, comments, reactions, reputation
**Status**: Complete

### 3. Delivery & Logistics
**Pages**: 12 delivery pages including ActiveDeliveryPage, DeliveryDashboardPage
**Features**: GPS tracking, delivery requests, earnings, proof submission
**Status**: Complete + Blockchain integration

### 4. Governance & DAO
**Pages**: 11 governance pages including GovernancePage, ProposalsListPage, TreasuryPage
**Features**: Democracy proposals, council voting, treasury management
**Status**: UI Complete, backend pending for voting execution

### 5. Chat & Messaging
**Pages**: ChatInboxPage, ChatThreadPage, ChatNewPage, GroupAdminPage
**Features**: Real-time chat, groups, proposals in chat, receipts
**Status**: Complete

### 6. Affiliate Marketing
**Pages**: AffiliateDashboardPage, AffiliateMarketplacePage
**Features**: Custom marketplace, product promotion, commission tracking
**Status**: Complete

### 7. Wallet Management
**Pages**: WalletHome, AccountsPage, SendPage, ReceivePage
**Features**: Multi-asset support, QR codes, transaction history
**Status**: Complete

### 8. P2P Trading
**Pages**: P2PHomePage, P2POfferNewPage, P2POrderRoomPage
**Features**: BZR/ZARI trading, escrow, phase filtering
**Status**: Complete

### 9. Authentication & Security
**Pages**: 7 auth pages including CreateAccount, Unlock, RecoverPin
**Features**: Seed phrase, PIN, crypto key storage, device linking
**Status**: Complete

### 10. Admin & Dashboards
**Pages**: SellerDashboardPage, AnalyticsDashboard, DashboardPage
**Features**: Analytics, seller management, KPIs
**Status**: Core features complete

---

## Blockchain Features

### Fully Implemented
- Order creation & escrow
- Payment intent tracking
- Delivery proof submission (IPFS)
- Dispute opening
- Courier registration
- Review submission
- GPS waypoint recording
- Reputation aggregation

### Partial Implementation
- Governance voting UI
- Council motions
- Treasury requests UI
- Dispute voting

### Missing
- Governance voting execution
- Dispute jury voting
- Advanced multisig UI
- WebSocket notifications

---

## File Locations by Feature

### Authentication
- `/pages/auth/CreateAccount.tsx`
- `/pages/auth/ImportAccount.tsx`
- `/pages/auth/Unlock.tsx`
- `/modules/auth/` - Crypto utilities

### E-Commerce
- `/pages/ProductDetailPage.tsx`
- `/pages/ServiceDetailPage.tsx`
- `/modules/cart/pages/CartPage.tsx`
- `/modules/orders/pages/CheckoutPage.tsx`
- `/pages/OrderPage.tsx`

### Delivery
- `/pages/delivery/DeliveryDashboardPage.tsx`
- `/pages/delivery/ActiveDeliveryPage.tsx`
- `/components/delivery/` - Delivery components
- `/types/delivery.ts` - Delivery types

### Governance
- `/modules/governance/pages/` - All governance pages
- `/modules/governance/components/` - Governance components
- `/modules/governance/hooks/` - Governance hooks
- `/modules/governance/api/` - API integration

### Chat
- `/pages/chat/ChatThreadPage.tsx`
- `/components/chat/` - Chat components (29 components)
- `/hooks/useChat.ts` - Chat state management

### Blockchain
- `/hooks/useBlockchainQuery.ts`
- `/hooks/useBlockchainTx.ts`
- `/components/blockchain/` - Blockchain components

### Wallet
- `/modules/wallet/pages/` - Wallet pages
- `/modules/wallet/hooks/` - Wallet hooks
- `/modules/wallet/services/` - Polkadot integration

### Affiliate
- `/pages/AffiliateDashboardPage.tsx`
- `/components/affiliates/` - Affiliate components

---

## Route Map

### Public Routes
```
/                          Landing
/auth/create              Create account
/auth/import              Import account
/auth/unlock              Unlock account
/search                   Search products
/explore                  Browse products
/product/:id              Product detail
/service/:id              Service detail
/loja/:slug               Store public
/m/:slug                  Affiliate marketplace
/u/:handle                User profile (public)
/delivery                 Delivery landing
/vesting                  Vesting schedule
```

### Authenticated Routes (/app/*)
```
/app                      Main dashboard
/app/feed                 Social feed
/app/chat/*               Messaging
/app/cart                 Shopping cart
/app/checkout             Checkout
/app/orders/:id           Order details
/app/delivery/*           Delivery management
/app/seller/*             Seller management
/app/wallet/*             Wallet
/app/governance/*         Governance
/app/p2p/*                P2P trading
/app/affiliate/*          Affiliate system
```

---

## Component Catalog

### Most Used Components
1. **Card** - Container component (shadcn/ui)
2. **Button** - Action button (shadcn/ui)
3. **Dialog** - Modal dialog (shadcn/ui)
4. **Input** - Form input (shadcn/ui)
5. **ProposalCard** - Proposal display (custom)
6. **PostCard** - Social post (custom)
7. **DeliveryStatusTimeline** - Delivery tracking (custom)
8. **ProofCard** - Blockchain proof (custom)

### Component Categories
- **UI Base**: 30+ shadcn/ui components
- **Blockchain**: 3 components
- **Chat**: 29 components
- **Delivery**: 11 components
- **Social**: 21 components
- **Store**: 13 components
- **Governance**: 12 components
- **Affiliate**: 7 components
- **Wallet**: 6 components
- **Profile**: 3 components
- **Auth**: 11 components
- **PDP**: 7 components
- **Landing**: 8 components
- **Other**: 50+ components

---

## Key Hooks Reference

### Blockchain Hooks
```
useBlockchainQuery<T>()     - Generic read
useBlockchainTx()           - Generic write
useBlockchainOrders()       - Get orders
useCreateOrder()            - Create order
useSubmitProof()            - Submit proof
useOpenDispute()            - Open dispute
useRegisterCourier()        - Register courier
useSubmitReview()           - Submit review
useRecordWaypoint()         - Record GPS
```

### Domain Hooks
```
useCart()                   - Shopping cart
useChat()                   - Chat state
useDeliveryProfile()        - Delivery profile
useGeolocation()            - GPS location
useProfileReputation()      - Reputation data
useStoreCatalog()           - Store products
useSearch()                 - Search functionality
```

### Governance Hooks
```
useCouncilMotion()          - Council voting
useGovernanceEvents()       - Recent events
useProposalFilters()        - Filter proposals
useTreasuryRequests()       - Treasury data
useVotingData()             - Voting stats
```

---

## Important Patterns

### State Management
- **Global State**: Zustand stores (cart, chat, auth, wallet)
- **API State**: Custom hooks with caching (blockchain queries)
- **UI State**: React useState (local component state)

### Data Flow
1. User interaction → Event handler
2. State update or API call
3. Component re-render with new state
4. For blockchain: Sign tx → Submit → Poll status

### Error Handling
- Try/catch blocks
- Toast notifications (Sonner)
- User-friendly error messages
- Retry logic for API calls

### Loading States
- Skeleton loaders
- Spinner indicators
- Disabled buttons
- Progress indicators

---

## Development Workflow

### Adding a New Feature
1. Create page in `/pages/` or `/modules/feature/pages/`
2. Create components in `/components/feature/`
3. Create hooks in `/hooks/` or `/modules/feature/hooks/`
4. Add routes in `App.tsx`
5. Add translations in i18n files
6. Add types in `/types/`

### Integrating with Blockchain
1. Create query hook using `useBlockchainQuery<T>()`
2. Create mutation hook using `useBlockchainTx()`
3. Integrate in component with loading states
4. Add error handling
5. Add success/failure callbacks

---

## Technology Stack

### Frontend Framework
- React 18+
- TypeScript
- Vite (build tool)
- React Router v6

### UI & Styling
- shadcn/ui components
- Tailwind CSS
- Radix UI primitives

### State & Data
- Zustand (state management)
- React hooks
- Custom API calls

### Blockchain
- Polkadot.js
- Web3 integration
- IPFS for file storage

### Utilities
- react-i18next (translation)
- date-fns (dates)
- sonner (toast notifications)
- lucide-react (icons)

### Development
- TypeScript
- ESLint
- Vitest (testing)
- Playwright (e2e)

---

## Performance Optimizations

### Code Splitting
- Route-based code splitting
- Component lazy loading
- Dynamic imports

### Image Optimization
- Lazy loading (lazy-image component)
- Image gallery optimization
- Responsive images

### Caching
- API response caching
- Manual cache invalidation
- Auto-refresh on intervals

### Other
- Debounced search
- Request cancellation
- Skeleton loading states
- Infinite scroll pagination

---

## Security Measures

### Authentication
- PIN-based access
- Seed phrase backup
- Crypto key storage
- Session tokens

### Data Protection
- HTTPS/TLS
- Message encryption
- Signature verification
- Input validation

### Smart Contracts
- Transaction signing
- Gas estimation
- Error handling

---

## Mobile & Responsive

### Mobile Features
- Bottom navigation
- Touch-friendly UI
- Safe area padding
- Mobile-optimized layouts

### Responsive Design
- Mobile-first approach
- Breakpoints: mobile, tablet, desktop
- Flexible grid layouts
- Responsive images

### PWA Features
- Install prompt
- Update notification
- Offline support
- Service worker

---

## SEO Features

- Dynamic meta descriptions
- JSON-LD schema (products)
- Breadcrumb navigation
- Canonical URLs
- Open Graph tags
- Sitemap support

---

## Testing Coverage

### Types of Tests
- Unit tests (Vitest)
- Component tests
- Integration tests
- E2E tests (Playwright)

### Test Files
- `/pages/__tests__/`
- `/components/**/__tests__/`
- `/hooks/__tests__/`
- `/modules/governance/__tests__/e2e/`

---

## Documentation Structure

### Code Documentation
- JSDoc comments for functions
- Component prop documentation
- Type definitions in TypeScript
- Comments for complex logic

### File Headers
- Version history (V-x comments)
- Feature description
- Author/maintainer info

---

## Common Patterns

### Component Pattern
```
export function ComponentName() {
  const { data, loading, error } = useData()
  const { handler, state } = useLogic()
  
  if (loading) return <SkeletonLoader />
  if (error) return <ErrorDisplay />
  
  return <div>{content}</div>
}
```

### Hook Pattern
```
export function useCustomHook() {
  const [state, setState] = useState()
  useEffect(() => { /* init */ }, [])
  return { state, methods }
}
```

### API Pattern
```
export async function fetchData() {
  const response = await api.get(endpoint)
  return response.data
}
```

---

## Troubleshooting Guide

### Common Issues

**Blockchain connection fails**
- Check API endpoint configuration
- Verify network selection (testnet/mainnet)
- Check transaction signing

**Chat not loading**
- Check WebSocket connection
- Verify authentication token
- Clear browser cache

**Images not displaying**
- Check API base URL
- Verify lazy-image component
- Check CORS settings

**Governance voting not working**
- Check voting UI implementation
- Verify blockchain connection
- Check vote transaction

---

## Future Enhancements

### High Priority
1. Governance voting execution UI
2. Dispute jury voting interface
3. Treasury blockchain integration
4. Error standardization
5. Loading state improvements

### Medium Priority
1. Advanced multisig workflows
2. WebSocket notifications
3. Transaction confirmation modals
4. Covenant/guarantee system
5. Advanced analytics dashboard

### Low Priority
1. Admin console UI
2. Developer documentation
3. Blockchain explorer integration
4. API documentation UI
5. Advanced reporting

---

## Contact & Support

**Repository**: /root/bazari
**Main App**: /root/bazari/apps/web
**API**: /root/bazari/apps/api
**Blockchain**: /root/bazari-chain/pallets/

---

## Document Versions

| Document | Version | Date | Status |
|----------|---------|------|--------|
| FRONTEND_SUMMARY.md | 1.0 | Nov 14, 2025 | Complete |
| FRONTEND_MAPPING.md | 1.0 | Nov 14, 2025 | Complete |
| FRONTEND_INDEX.md | 1.0 | Nov 14, 2025 | Complete |

---

## Legend

- **✓ Complete** - Feature fully implemented and tested
- **~ Partial** - Feature partially implemented or pending tests
- **✗ Missing** - Feature not yet implemented
- **Blockchain** - Integrated with smart contracts
- **IPFS** - Stored on decentralized storage

