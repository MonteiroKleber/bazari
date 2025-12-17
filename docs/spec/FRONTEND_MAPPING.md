# Bazari Frontend UI/UX Comprehensive Mapping

## Overview
Complete frontend codebase analysis of `/root/bazari/apps/web/src/` covering all pages, components, modules, and blockchain integration points.

---

## 1. PAGES & SCREENS (Core User Flows)

### 1.1 Authentication Pages (`/pages/auth/`)
- **WelcomePage.tsx** - Auth landing, directs to create/import/unlock flows
- **CreateAccount.tsx** - New account creation with PIN setup and seed phrase generation
- **ImportAccount.tsx** - Import existing account via seed phrase
- **Unlock.tsx** - PIN-based account unlock
- **RecoverPin.tsx** - PIN recovery mechanism
- **DeviceLink.tsx** - Device linking/pairing flow
- **GuestWelcomePage.tsx** - Guest user welcome screen

**Status**: Fully implemented with seed crypto, PIN strength indicators, backup tools

---

### 1.2 Dashboard & Core Pages
- **DashboardPage.tsx** - Main app dashboard (authenticated)
- **ProfileEditPage.tsx** - User profile editor
- **ProfilePublicPage.tsx** - Public profile view with:
  - Reputation score and tier
  - Badges and achievements
  - Followers/Following tabs
  - Posts tab
  - Store tab (if seller)
  - Reputation chart visualization
- **NotificationsPage.tsx** - Notification center

**Blockchain Integration**: 
- onChainProfileId field in profiles
- Reputation synced from blockchain

---

### 1.3 Product Discovery & Shopping
- **SearchPage.tsx** - Global search with filters
- **ExplorePage.tsx** - Browse/discover products and sellers
- **MarketplacePage.tsx** - Main marketplace view
- **ProductDetailPage.tsx** - Product Detail Page (PDP) featuring:
  - Image gallery with lazy loading
  - Product attributes (filtered by category spec)
  - Description block
  - Seller card with reputation badge
  - Shipping calculator
  - Related items carousel
  - JSON-LD SEO schema generation
  - Breadcrumb navigation
- **ServiceDetailPage.tsx** - Service listing detail (similar to PDP)
- **StorePublicPage.tsx** - Public store/marketplace view
- **SellersListPage.tsx** - List all sellers

**Components Used**:
- ImageGallery, ProductInfo, AttributesDisplay, DescriptionBlock
- SellerCard (with onChainStats, onChainStoreId)
- ShippingCalculator
- RelatedItems

**SEO Features**:
- Dynamic meta descriptions
- JSON-LD schema generation
- Canonical URLs
- Open Graph tags

---

### 1.4 Orders & Payment Flow
- **OrderPage.tsx** - Order details with:
  - Order status (PENDING, ESCROWED, SHIPPED, RELEASED, etc.)
  - Payment intents tracking
  - Escrow logs visualization
  - Delivery tracking integration
  - Order actions (confirm received, cancel)
  - Blockchain transaction details (txHashIn, txHashRelease, txHashRefund)
  - Delivery status timeline
- **CartPage.tsx** (in modules/cart) - Shopping cart management
- **CheckoutPage.tsx** (in modules/orders) - Checkout with:
  - Shipping address form
  - Multi-store order bundling
  - BZR price resolution
  - Order creation

**Blockchain Features**:
- Escrow contract references
- Transaction hash tracking
- Payment status machine (FUNDS_IN, RELEASED, REFUNDED, TIMEOUT)

---

### 1.5 Chat & Messaging
- **ChatInboxPage.tsx** - Chat thread list
- **ChatThreadPage.tsx** - Individual chat thread with:
  - Message list (real-time)
  - Chat composer with media support
  - Create proposal dialog
  - Group admin button (for group chats)
  - Message reactions
- **ChatNewPage.tsx** - Start new chat
- **ChatSettingsPage.tsx** - Chat settings
- **GroupAdminPage.tsx** - Manage group chat
- **SaleDetailsPage.tsx** - Sale transaction details in chat context
- **ReceiptViewerPage.tsx** - IPFS-stored receipt viewer

**Features**:
- WebRTC support for voice/video
- Crypto message support
- Proposal creation (multi-store)
- Group management
- Payment success confirmations

---

### 1.6 Social & Community
- **FeedPage.tsx** - Personalized social feed
- **PostDetailPage.tsx** - Individual post view
- **BookmarksPage.tsx** - Saved bookmarks
- **DiscoverPeoplePage.tsx** - People discovery
- **DiscoverTrendingPage.tsx** - Trending topics/posts

**Components**:
- PostCard, PostCardSkeleton
- CommentSection, CommentLikeButton
- LikeButton, RepostButton, BookmarkButton
- CreatePostButton, CreatePostModal, EditPostModal
- PollCard, ReactionPicker
- ProfileHoverCard, ProfileCardSkeleton
- TrendingTopics, WhoToFollow
- PersonalizedFeed
- ReputationChart, BadgeIcon

---

### 1.7 Seller Management
- **SellerDashboardPage.tsx** - Seller overview (simplified, routes to seller list)
- **SellerSetupPage.tsx** - Seller onboarding
- **SellerManagePage.tsx** - Manage individual store:
  - Products (create, edit, delete)
  - Orders
  - Commission policy
  - Affiliates management
- **SellerPublicPage.tsx** - Public seller storefront (branded v1)
- **SellerProductsPage.tsx** - Products listing
- **SellerOrdersPage.tsx** - Orders listing
- **NewListingPage.tsx** - Create new product/service listing
- **seller/CommissionPolicyPage.tsx** - Commission policy editor
- **seller/AffiliatesPage.tsx** - Manage seller's affiliates

**Features**:
- Multi-store support
- Category-based specs
- Inventory management
- Commission splits

---

### 1.8 Affiliate/Referral System
- **AffiliateDashboardPage.tsx** - Affiliate personal dashboard:
  - Marketplace creation
  - Product management
  - Sales stats
  - Revenue tracking
  - Custom marketplace with branding
- **AffiliateMarketplacePage.tsx** - Public affiliate marketplace view (`/m/:slug`)
- **promoter/MyAffiliationsPage.tsx** - Promoter's active affiliations

**Components**:
- CreateMarketplaceDialog - Create custom marketplace
- AddProductDialog - Add products to marketplace
- AffiliateStatusBanner - Show affiliate status
- AffiliationCard - Display single affiliation
- AffiliateRequestCard - Pending affiliate requests
- ApproveAffiliateDialog - Approve affiliate
- StoreSearchDialog - Find stores to promote

**Features**:
- Marketplace customization (colors, logo, banner)
- Commission percentage per product
- Featured product support
- View/click tracking
- Public marketplace slug URL

---

### 1.9 Delivery & Logistics
**Delivery Pages** (`/pages/delivery/`):
- **DeliveryLandingPage.tsx** - Public delivery onboarding landing
- **DeliveryProfileSetupPage.tsx** - Delivery partner profile setup:
  - Vehicle type selection
  - Service area radius
  - Availability toggle
- **DeliveryDashboardPage.tsx** - Delivery partner dashboard:
  - GPS status indicator
  - Active deliveries list
  - Availability toggle
  - Quick action buttons
  - KPI cards (deliveries, earnings, rating)
  - Geolocation auto-start
- **DeliveryRequestsListPage.tsx** - Available delivery requests
- **DeliveryRequestDetailPage.tsx** - Delivery request details
- **ActiveDeliveryPage.tsx** - Real-time active delivery tracking:
  - Status timeline
  - Address cards
  - Fee breakdown
  - Confirm pickup/delivery buttons
  - Cancel with reason dialog
  - Elapsed time timer
- **DeliveryHistoryPage.tsx** - Past deliveries
- **DeliveryEarningsPage.tsx** - Earnings/payment history
- **DeliveryPartnersPage.tsx** - Store's delivery partner list
- **RequestDeliveryPage.tsx** - Customer request delivery
- **StoreSearchPage.tsx** - Delivery partner finds stores
- **ComponentsTestPage.tsx** - Development component showcase

**Blockchain Integration**:
- GPS waypoints recorded to blockchain
- Review submission on blockchain
- Courier registration on-chain
- Delivery proof generation (IPFS CID)
- Rating system tied to courier address

**Components** (`/components/delivery/`):
- AddressCard, BenefitCard, FeatureCard
- FeeBreakdownCard, QuickActionButton
- DeliveryStatusTimeline, EmptyState
- GPSStatusIndicator, KPICard
- StepIndicator

**Types**:
- DeliveryRequest, DeliveryProfileStats, Address
- DeliveryRequestStatus enum (PENDING, ACCEPTED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, FAILED)

---

### 1.10 Governance & DAO
**Governance Pages** (`/modules/governance/pages/`):
- **GovernancePage.tsx** - Governance hub with:
  - Stats widget (total BZR locked, active proposals, council members)
  - Quick actions (vote, propose, treasury request)
  - Recent events timeline
  - Notification bell
  - Notification panel
- **ProposalsListPage.tsx** - All proposals with:
  - Advanced filters (status, type, proposer)
  - Search functionality
  - Filter chips display
  - Proposal cards
  - Types: DEMOCRACY, TREASURY, COUNCIL, TECHNICAL
- **ProposalDetailPage.tsx** - Individual proposal detail:
  - Status timeline
  - Vote information
  - Voting UI
  - Motion details
- **ReferendumsPage.tsx** - Democracy referendums
- **CouncilPage.tsx** - Council member management:
  - Council members list with badges
  - Council status
  - Voting buttons (Aye/Nay/Abstain)
  - Motion list
- **MultisigPage.tsx** - Multi-signature transaction flow:
  - Approval progress
  - Workflow stepper
  - Transaction history
- **TreasuryPage.tsx** - Treasury management with:
  - Treasury stats (balance, burn rate, spending)
  - Tabs: On-chain proposals vs Off-chain requests
  - Treasury requests sub-page
- **TreasuryRequestsPage.tsx** - Off-chain treasury requests
- **CreateTreasuryRequestPage.tsx** - Submit treasury request
- **TreasuryRequestDetailPage.tsx** - Treasury request view
- **CreateProposalPage.tsx** - Create new proposal

**Governance Components**:
- ProposalCard - Proposal summary with status
- CouncilMemberCard - Member info with voting power
- TreasuryRequestCard - Treasury request summary
- TreasuryStats - Treasury overview stats
- ConvictionSelector - Conviction voting UI
- CouncilVoteButtons - Vote action buttons
- CreateMotionModal - Create council motion
- EndorseModal - Endorse proposal
- VoteModal - Vote dialog
- CloseMotionButton - Close motion action

**Dashboard Components** (`governance/components/dashboard/`):
- GovernanceStatsWidget - Key stats
- QuickActions - Voting/proposal actions
- EventTimeline - Recent events
- VotingChart - Voting distribution

**Filter Components** (`governance/components/filters/`):
- AdvancedFilters - Complex filter UI
- FilterChips - Active filter pills
- SearchBar - Proposal search

**Multisig Components** (`governance/components/multisig/`):
- MultisigApprovalFlow - Approval process UI
- ApprovalProgressChart - Progress visualization
- TransactionHistory - TX history
- WorkflowStepper - Step tracker

**Notifications** (`governance/components/notifications/`):
- NotificationBell - Unread count badge
- NotificationPanel - Full notification list
- NotificationItem - Individual notification

**Types**:
- GovernanceProposal (id, type, proposer, status, createdAt)
- ProposalType: DEMOCRACY, TREASURY, COUNCIL, TECHNICAL
- ProposalStatus: SUBMITTED, VOTING, PASSED, FAILED, RESOLVED
- GovernanceStats

**Hooks**:
- useCouncilMotion - Council voting
- useCouncilStatus - Council info
- useGovernanceEvents - Recent events
- useGovernanceNotifications - WebSocket notifications
- useProposalFilters - Filter management
- useTreasuryRequests - Treasury requests
- useVotingData - Voting statistics

---

### 1.11 P2P Trading
**P2P Pages** (`/modules/p2p/pages/`):
- **P2PHomePage.tsx** - P2P marketplace with:
  - Tabs: BUY_BZR, SELL_BZR, BUY_ZARI, SELL_ZARI
  - Price filters (minBRL, maxBRL)
  - Phase filter (for ZARI)
  - ZARIPhaseBadge display
  - My offers list
  - Create offer button
- **P2POfferNewPage.tsx** - Create new P2P offer
- **P2POfferPublicPage.tsx** - View public offer
- **P2POrderRoomPage.tsx** - P2P transaction room (chat + escrow)
- **P2PMyOrdersPage.tsx** - User's P2P orders/trades
- **ZARIStatsPage.tsx** - ZARI token statistics and phase info

**Components**:
- ZARIPhaseBadge - Current ZARI phase display

**Features**:
- Asset types: BZR, ZARI
- Methods: PIX, Bank transfer, etc.
- Phase filtering (2A, 2B, 3)
- Escrow integration
- Real-time trading

---

### 1.12 Vesting
- **VestingPage.tsx** - Vesting schedule view (PUBLIC)
  - Token unlock schedule
  - Vesting periods
  - Release history

---

### 1.13 Wallet
**Wallet Pages** (`/modules/wallet/pages/`):
- **WalletHome.tsx** - Wallet navigation hub:
  - Routes: Overview, Accounts, Send, Receive
  - Tab-based navigation
- **WalletDashboard.tsx** - Wallet overview:
  - Account list
  - Total balance
  - Asset list
- **AccountsPage.tsx** - Manage wallet accounts
- **SendPage.tsx** - Send tokens
- **ReceivePage.tsx** - Receive tokens with:
  - QR code generation
  - Address copying
  - Public address display

**Components**:
- AddressQr - QR code display
- PinDialog - PIN verification
- Scanner - QR code scanner
- TokenList - Assets list
- TokenSelector - Asset picker
- Balance - Balance display component

**Features**:
- Polkadot native integration
- Multi-asset support (BZR, ZARI, other tokens)
- PIN protection
- QR code sharing
- Transaction history
- Fee estimation

**Hooks**:
- useApi - API connectivity
- useChainProps - Chain parameters
- useTransactionFee - Fee calculation
- useVaultAccounts - Account management

**Services**:
- assets.ts - Asset management
- balances.ts - Balance queries
- history.ts - Transaction history
- polkadot.ts - Polkadot integration

---

### 1.14 Analytics
- **AnalyticsDashboard.tsx** - Seller analytics dashboard
- **TestnetAccessPage.tsx** - Testnet access request/status

---

## 2. BLOCKCHAIN-RELATED UI COMPONENTS

### 2.1 Blockchain Components (`/components/blockchain/`)

#### ProofCard.tsx
- **Purpose**: Display delivery proof (GPS + photo)
- **Features**:
  - Proof submission status visualization
  - Attestor address display
  - IPFS CID link for evidence
  - Compact/expanded view modes
  - Transaction details (txHash, blockNumber)
  - Waypoint GPS data display
- **Integration**: useBlockchainProofs hook
- **Current Status**: Implemented with GPS tracking + IPFS integration

#### DisputePanel.tsx
- **Purpose**: Manage order disputes
- **Features**:
  - Create new dispute with evidence
  - View existing dispute status (OPENED, VOTING, RESOLVED)
  - Plaintiff/Defendant addresses
  - Evidence IPFS upload
  - Dispute voting display (when available)
  - Blockchain transaction tracking
- **Integration**: useBlockchainDispute (query), useOpenDispute (mutation)
- **Current Status**: Fully implemented, ready for voting UI enhancement

#### CourierCard.tsx
- **Purpose**: Display delivery courier profile
- **Features**:
  - Courier address and stats
  - Ratings display
  - Vehicle type
  - Availability status
  - Review summary

---

### 2.2 Blockchain Hooks

#### useBlockchainQuery.ts
- **Purpose**: Read-only blockchain queries
- **Key Functions**:
  - `useBlockchainQuery<T>()` - Generic query with auto-refresh
  - `useBlockchainOrders()` - Get orders list
  - `useBlockchainOrder()` - Get single order
  - `useBlockchainProofs()` - Get delivery proofs
  - `useBlockchainDispute()` - Get dispute details
  - `useBlockchainCourier()` - Get courier profile
  - `useCourierReviews()` - Get courier reviews
- **Features**:
  - Cache with manual invalidation
  - Auto-refresh on interval
  - Loading/error/success states
  - Abort on unmount
  - Success/error callbacks

#### useBlockchainTx.ts
- **Purpose**: Write blockchain transactions
- **Key Functions**:
  - `useBlockchainTx()` - Generic mutation
  - `useCreateOrder()` - Create order transaction
  - `useSubmitProof()` - Submit delivery proof
  - `useOpenDispute()` - Open dispute transaction
  - `useRegisterCourier()` - Register delivery courier
  - `useSubmitReview()` - Submit review transaction
  - `useRecordWaypoint()` - Record GPS waypoint
- **Features**:
  - Loading/success/error states
  - Optimistic updates
  - Success/error/settled callbacks
  - Transaction response tracking (txHash, blockNumber)

---

### 2.3 Chat Components with Blockchain Features

#### CreateProposalDialog.tsx
- Multi-store proposal creation
- Item selection from products
- Shipping method selection
- Commission percentage input
- Expiration date setting
- Total calculation

#### ProposalCard.tsx
- Proposal status display
- Item listing with pricing
- Shipping cost
- Total amount
- Commission info
- Expiration countdown
- Accept/reject actions
- Payment confirmation flow

#### MultiStoreProposalCard.tsx
- Multi-store variant of ProposalCard
- Aggregated totals
- Per-store breakdowns

#### CheckoutConfirmDialog.tsx
- Proposal acceptance confirmation
- Total amount review
- Payment confirmation

#### PaymentSuccessDialog.tsx
- Post-payment success screen
- Receipt CID display
- Sales data per store
- Transaction confirmation

#### ReceiptCard.tsx
- IPFS receipt display
- Transaction details
- Item breakdown

---

## 3. WALLET INTEGRATION

### 3.1 Balance Component (`/components/wallet/Balance.tsx`)
- Display current balance
- Asset selection
- Real-time balance updates

### 3.2 Wallet Hooks
- **useApi** - Wallet API calls
- **useChainProps** - Chain parameters
- **useTransactionFee** - Fee calculation
- **useVaultAccounts** - Account management

### 3.3 Wallet Features
- Multi-asset support (BZR, ZARI, other tokens)
- Account management
- Transaction history
- QR code sharing
- PIN-protected operations
- Fee estimation

---

## 4. ORDER & PAYMENT FLOWS

### 4.1 Order Lifecycle
1. **Create Order** (CheckoutPage)
   - Cart → Checkout page
   - Shipping address
   - Create order transaction
   
2. **Order Details** (OrderPage)
   - View order status
   - Track delivery (if applicable)
   - Confirm receipt
   - Cancel if allowed
   
3. **Payment Intent Tracking**
   - Status: PENDING → ESCROWED → FUNDS_IN → RELEASED
   - Alternative: REFUNDED, CANCELLED, TIMEOUT
   - Blockchain tx tracking (txHashIn, txHashRelease, txHashRefund)
   
4. **Dispute Resolution**
   - Open dispute if issue
   - Submit evidence (IPFS)
   - Jury voting
   - Resolution enforcement

### 4.2 Order Status Machine
```
PENDING
├── Payment submitted → ESCROWED
├── Funds in → FUNDS_IN
├── Shipped → SHIPPED
├── Confirmed → RELEASED (seller receives)
├── Refunded → REFUNDED
└── Cancelled → CANCELLED
└── Timeout → TIMEOUT (auto-refund)
```

### 4.3 Related Components
- **OrderPage.tsx** - Order details + delivery tracking
- **DeliveryStatusTimeline** - Timeline visualization
- **Cart management** - useCart store
- **CheckoutPage** - Order creation

---

## 5. DELIVERY TRACKING UI

### 5.1 Delivery Status States
- PENDING - Waiting for courier
- ACCEPTED - Courier accepted
- PICKED_UP - Item picked up
- IN_TRANSIT - On the way
- DELIVERED - Completed
- CANCELLED - Cancelled
- FAILED - Failed delivery

### 5.2 Delivery Components
- **DeliveryStatusTimeline** - Visual timeline of states
- **AddressCard** - Pickup/delivery addresses
- **FeeBreakdownCard** - Earnings breakdown
- **GPSStatusIndicator** - GPS signal quality
- **ActiveDeliveryCard** - Active delivery summary

### 5.3 Delivery Tracking Integration
- **In OrderPage** - Embedded delivery tracking
- **In ActiveDeliveryPage** - Full delivery management
- **GPS waypoint recording** - useRecordWaypoint hook
- **Distance & time estimates**
- **Courier contact info**

### 5.4 Delivery Blockchain Features
- GPS waypoints stored on-chain
- Delivery proofs (IPFS CID)
- Review submission on-chain
- Courier ratings aggregated on-chain
- Dispute integration for delivery issues

---

## 6. REPUTATION & REVIEW SYSTEM

### 6.1 Reputation Display Components
- **ReputationBadge.tsx** - Score + tier badge
- **ReputationChart.tsx** - Reputation history chart
- **BadgesList.tsx** - Achievement badges
- **ProfileHoverCard.tsx** - Profile preview with reputation

### 6.2 Reputation Data Points
- **Score**: Numeric reputation score
- **Tier**: Badge tier (e.g., Trusted, Master, etc.)
- **OnChain**: blockchain-verified reputation
- **Badges**: Achievement badges issued by platform

### 6.3 Review Integration
- **Review submission hook**: useSubmitReview
- **Delivery reviews**: Tied to courierAddress
- **Seller reviews**: Tied to store
- **Blockchain storage**: Reviews stored on-chain

### 6.4 Reputation Sources
- **Chat components**: TrustBadge display
- **Profile pages**: ReputationChart, BadgesList
- **Product pages**: Seller reputation on SellerCard
- **Delivery pages**: Courier rating on delivery cards

---

## 7. AFFILIATE/REFERRAL UI

### 7.1 Affiliate Dashboard Features
- Marketplace creation (name, colors, logo, banner)
- Product management (add/remove/feature)
- Sales tracking
- Commission earning tracking
- Custom marketplace URL (`/m/:slug`)
- Branding customization

### 7.2 Affiliate Components
- **CreateMarketplaceDialog** - Setup custom marketplace
- **AddProductDialog** - Add stores/products
- **AffiliateStatusBanner** - Show affiliation status
- **AffiliationCard** - Active affiliation display
- **AffiliateRequestCard** - Pending requests
- **ApproveAffiliateDialog** - Approve affiliates
- **StoreSearchDialog** - Find stores to promote

### 7.3 Affiliate Data Tracked
- Product views
- Product clicks
- Sales per product
- Commission percentages
- Revenue totals

### 7.4 Routes
- `/app/affiliate/dashboard` - Affiliate dashboard
- `/m/:slug` - Public affiliate marketplace
- `/app/promoter/affiliates` - Promoter affiliations
- `/app/seller/affiliates` - Seller's affiliates
- `/app/seller/commission-policy` - Commission settings

---

## 8. DISPUTE & GOVERNANCE UI

### 8.1 Dispute Workflow
1. **DisputePanel** - Open dispute with evidence
2. **Evidence Upload** - IPFS CID input
3. **Voting Phase** - Jury voting (not yet UI)
4. **Resolution** - Enforcement (not yet UI)

### 8.2 Governance Voting
- **ProposalsListPage** - Browse all proposals
- **ProposalDetailPage** - Vote on proposal
- **CouncilPage** - Council voting (Aye/Nay/Abstain)
- **VoteModal** - Voting dialog
- **ConvictionSelector** - Conviction voting UI

### 8.3 Treasury Management
- **TreasuryPage** - Treasury overview + off-chain requests
- **TreasuryRequestsPage** - Off-chain treasury requests
- **CreateTreasuryRequestPage** - Submit request
- **TreasuryRequestDetailPage** - View request
- **TreasuryStats** - Stats widget
- **TreasuryRequestCard** - Request summary

### 8.4 Governance Types
- **DEMOCRACY** - General proposals
- **TREASURY** - Treasury spending
- **COUNCIL** - Council motions
- **TECHNICAL** - Technical committee

---

## 9. MISSION/REWARDS & GAMIFICATION

### 9.1 Chat Mission Features
- **MissionCard.tsx** - Display mission/challenge
- **OpportunityCard.tsx** - Opportunity highlight
- **PromoterRanking.tsx** - Leaderboard ranking

### 9.2 Reputation Badges
- **BadgeIcon.tsx** - Badge display
- **BadgesList.tsx** - Multiple badges
- **ReputationBadge.tsx** - Reputation level badge

### 9.3 Achievements
- Stored in user profile
- Issued by platform
- Displayed on profile
- Multi-language labels

---

## 10. ADMIN & DASHBOARD UI

### 10.1 Admin/Seller Dashboards
- **SellerDashboardPage** - Seller overview (simplified)
- **SellerManagePage** - Individual store management
- **SellerProductsPage** - Product catalog
- **SellerOrdersPage** - Orders management
- **DeliveryPartnersPage** - Store's delivery partners
- **DeliveryDashboardPage** - Delivery partner dashboard

### 10.2 Dashboard Components
- **KPICard** - Key performance indicator
- **QuickActions** - Quick action buttons
- **RecentActivity** - Activity feed
- **QuickActionsGrid** - Grid of actions

### 10.3 Analytics
- **AnalyticsDashboard.tsx** - Seller analytics
- **GovernanceStatsWidget** - Governance stats
- **VotingChart** - Voting distribution
- **ReputationChart** - Reputation history

---

## 11. CURRENT BLOCKCHAIN INTEGRATION STATUS

### 11.1 Fully Implemented
- Order creation & tracking
- Payment intent tracking (escrow)
- Delivery proof submission (IPFS)
- Dispute opening
- Courier registration
- Review submission
- GPS waypoint recording
- Reputation aggregation

### 11.2 Partially Implemented
- Governance voting UI (voting modal exists)
- Council motions (buttons implemented)
- Treasury requests (UI only, blockchain pending)
- Dispute voting (voting UI missing)

### 11.3 Not Yet Implemented
- Governance voting backend/blockchain
- Dispute jury voting
- Advanced multisig workflows
- Treasury request blockchain integration
- Advanced governance notifications (WebSocket)

---

## 12. KEY HOOKS & API INTEGRATION

### 12.1 Blockchain Hooks (Ready to Use)
- `useBlockchainQuery<T>()` - Generic read queries
- `useBlockchainTx()` - Generic write transactions
- `useBlockchainOrders()` - Orders query
- `useCreateOrder()` - Order creation mutation
- `useSubmitProof()` - Proof submission mutation
- `useOpenDispute()` - Dispute creation mutation
- `useRegisterCourier()` - Courier registration mutation
- `useSubmitReview()` - Review submission mutation
- `useRecordWaypoint()` - GPS recording mutation

### 12.2 Domain-Specific Hooks
- **useDeliveryProfile()** - Delivery profile
- **useGeolocation()** - GPS positioning
- **useCart()** - Cart management
- **useChat()** - Chat state management
- **useProfileReputation()** - Reputation data
- **useSearch()** - Search functionality
- **useStoreCatalog()** - Store products
- **useUnreadNotifications()** - Notification count

### 12.3 Governance Hooks
- **useCouncilMotion()** - Council voting
- **useCouncilStatus()** - Council info
- **useGovernanceEvents()** - Recent events
- **useGovernanceNotifications()** - WebSocket notifications
- **useProposalFilters()** - Filter management
- **useTreasuryRequests()** - Treasury requests
- **useVotingData()** - Voting statistics

---

## 13. COMPONENT LIBRARY

### 13.1 UI Base Components (`/components/ui/`)
- button, card, dialog, input, label
- badge, avatar, tabs, modal
- slider, select, checkbox, radio-group
- progress, skeleton, switch
- dropdown-menu, hover-card, popover
- alert, alert-dialog, separator
- pagination, collapsible, textarea
- lazy-image (with fallback loading)

### 13.2 Feature Components
- **Store Components**: FilterModal, FilterButton, SortDropdown, PriceFilter, AttributeFilter, CategoryFilter, TypeFilter, SearchBar, CatalogPagination, ActiveFiltersBadges
- **Social Components**: CreatePostModal, PostCard, CommentSection, ReactionPicker, TrendingTopics, WhoToFollow
- **Delivery Components**: AddressCard, FeeBreakdownCard, DeliveryStatusTimeline, GPSStatusIndicator
- **Chat Components**: ChatComposer, MessageList, CreateProposalDialog, ProposalCard, ReceiptCard

---

## 14. MISSING FEATURES & GAPS

### 14.1 Blockchain-Related Gaps
- Governance voting execution UI (vote submitted but no confirmation)
- Dispute jury voting interface
- Treasury proposal blockchain execution
- Advanced multisig workflow UI
- Real-time WebSocket governance notifications
- Covenant/guarantee system UI

### 14.2 UX Improvements Needed
- Governance voting visual feedback
- Transaction confirmation modals
- Blockchain error message standardization
- Loading states for blockchain operations
- Retry logic UI for failed transactions

### 14.3 Missing Pages
- Admin console (system-wide governance)
- Covenant/guarantee management
- Advanced analytics
- Developer documentation
- Blockchain explorer integration

---

## 15. ROUTE STRUCTURE

### Public Routes (No Auth Required)
```
/                       - Landing page
/search                 - Search
/explore                - Browse
/marketplace            - Marketplace
/product/:id            - Product detail
/service/:id            - Service detail
/s/:shopSlug           - Seller storefront (branded)
/loja/:slug            - Store public
/m/:slug               - Affiliate marketplace
/delivery              - Delivery landing
/vesting               - Vesting schedule
/testnet               - Testnet access
/auth/*                - Authentication flows
/u/:handle             - Public profile
```

### Authenticated Routes (/app/*)
```
/app                   - Dashboard
/app/feed              - Social feed
/app/notifications     - Notifications
/app/profile/edit      - Profile editor
/app/posts/:postId     - Post detail
/app/bookmarks         - Saved posts
/app/discover/*        - Discovery pages
/app/analytics         - Analytics
/app/seller/*          - Seller management
/app/new               - Create listing
/app/cart              - Shopping cart
/app/checkout          - Checkout
/app/orders/:id        - Order details
/app/orders/:id/pay    - Order payment
/app/p2p/*             - P2P trading
/app/chat/*            - Messaging
/app/delivery/*        - Delivery management
/app/governance/*      - Governance voting
/app/wallet/*          - Wallet management
/app/affiliate/*       - Affiliate management
```

---

## 16. STATE MANAGEMENT

### 16.1 Store-Based State
- **useCart()** - Cart items (Zustand)
- **useChat()** - Chat threads & messages
- **useAuth()** - Authentication state
- **useTokenStore()** - Wallet tokens

### 16.2 API-Based State
- **useBlockchainQuery()** - Blockchain data with caching
- **useBlockchainTx()** - Transaction state
- **useDeliveryProfile()** - User delivery profile
- **useGeolocation()** - GPS location

### 16.3 UI State
- React hooks (useState) for local UI state
- URL params for routing state
- useSearchParams for filters

---

## 17. TRANSLATION & LOCALIZATION

### 17.1 i18n Setup
- react-i18next
- Translation keys organized by feature
- Multi-language support (PT, EN, ES)
- Date/time localization via date-fns

### 17.2 Key Namespaces
- `auth.` - Authentication screens
- `order.` - Order management
- `delivery.` - Delivery system
- `chat.` - Messaging
- `governance.` - Voting
- `blockchain.` - Blockchain operations
- `wallet.` - Wallet operations
- `social.` - Community/social
- `seller.` - Seller management
- `nav.` - Navigation labels

---

## 18. PERFORMANCE & PWA FEATURES

### 18.1 PWA Components
- **InstallPrompt** - App installation prompt
- **UpdatePrompt** - App update notification
- **OfflineIndicator** - Network status
- **PullToRefreshIndicator** - Mobile refresh

### 18.2 Performance Features
- Lazy image loading (lazy-image component)
- Image gallery optimization
- Component skeleton loading states
- Infinite scroll pagination
- Debounced search
- Request cancellation on unmount

### 18.3 Mobile Optimizations
- Mobile bottom navigation
- Touch-friendly UI
- Safe area padding
- Responsive grid layouts

---

## 19. SECURITY & AUTH

### 19.1 Authentication
- Seed phrase backup
- PIN-protected accounts
- Crypto key storage
- Session management
- Device linking

### 19.2 Components
- **RequireAuth** - Route guard
- **SessionBoundary** - Session management
- **SeedBackupTools** - Seed phrase tools
- **EnhancedPinStrengthIndicator** - PIN validation
- **WordChipSelector** - Seed phrase entry

### 19.3 Cryptography
- Polkadot keyring integration
- Message signing
- SIWS (Sign in with Substrate)
- Encrypted seed storage

---

## SUMMARY

The Bazari frontend is a **comprehensive web3 marketplace** with:

1. **Core Marketplace**: Products, services, stores, search, discovery
2. **Social Features**: Feed, posts, reputation, badges, followers
3. **Order Management**: Cart, checkout, payment tracking, order details
4. **Delivery System**: Courier management, GPS tracking, proof submission
5. **Governance**: Democracy proposals, council voting, treasury management
6. **Wallet**: Multi-asset support, transactions, account management
7. **Affiliate System**: Custom marketplaces, product promotion, earning tracking
8. **Chat/Messaging**: Real-time messaging, proposals, receipts, group chats
9. **P2P Trading**: BZR/ZARI peer-to-peer trading with escrow
10. **Blockchain Integration**: Smart contracts, disputes, proofs, reviews, ratings

All major features have blockchain integration points for decentralized trust, reputation, and transaction management.

