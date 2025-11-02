# Bazari Platform - Architecture Diagrams

This directory contains comprehensive architecture diagrams for the Bazari platform in Mermaid format.

## 📁 Diagrams Overview

### 1. System Architecture (`system-architecture.mmd`)
**High-level system overview showing all major components and their interactions.**

**Layers:**
- **Client Layer**: Web app, mobile app (future), wallet extension
- **API Gateway Layer**: Fastify API gateway, WebSocket server
- **Application Services Layer**: 8 core services (auth, profile, marketplace, orders, chat, p2p, delivery, social)
- **Infrastructure Services**: Media, notifications, search, analytics, reputation worker
- **Data Layer**: PostgreSQL, Redis, IPFS
- **Blockchain Layer**: BazariChain with 6 pallets

**Use Cases:**
- Understanding overall system architecture
- Identifying service boundaries
- Planning infrastructure scaling
- Onboarding new developers

### 2. Module Dependencies (`module-dependencies.mmd`)
**Dependency graph showing relationships between all 20 Bazari modules.**

**Module Categories:**
- **Core-Transversal** (5): auth, profile, wallet, media, notifications
- **Commerce** (5): marketplace, store, orders, cart, delivery
- **DeFi-Social** (5): p2p, governance, vesting, social, chat
- **Auxiliary** (5): affiliates, gamification, moderation, reputation, analytics

**Use Cases:**
- Understanding module coupling
- Planning feature development order
- Identifying circular dependencies
- Refactoring impact analysis

### 3. Data Flow (`data-flow.mmd`)
**End-to-end data flow from ingestion to output.**

**Stages:**
1. **Data Sources**: User input, blockchain events, external APIs
2. **Ingestion Layer**: API endpoints, WebSocket handlers, event listeners
3. **Processing Layer**: Business logic, validation, authorization
4. **Storage Layer**: PostgreSQL write, IPFS write, blockchain write
5. **Cache Layer**: Redis for hot data
6. **Query Layer**: Read operations across all storage systems
7. **Aggregation Layer**: Analytics and search indexing
8. **Output Layer**: API responses, WebSocket messages, notifications
9. **Background Jobs**: Reputation sync, nonce cleanup, IPFS pinning

**Use Cases:**
- Understanding data lifecycle
- Optimizing query performance
- Planning caching strategy
- Debugging data consistency issues

### 4. Deployment Architecture (`deployment.mmd`)
**Production deployment setup with infrastructure components.**

**Components:**
- **User Devices**: Browser, mobile, wallet extension
- **CDN**: Cloudflare for static assets
- **Load Balancer**: NGINX with SSL/TLS termination
- **Application Servers**: 3 Node.js instances (1 active, 2 future)
- **Background Workers**: Reputation sync, nonce cleanup, IPFS pinning
- **Database Layer**: PostgreSQL primary + 2 replicas (future)
- **Cache Layer**: Redis cluster
- **Storage Layer**: IPFS node + local filesystem
- **Blockchain Network**: 3 BazariChain nodes (1 validator, 2 future)
- **Monitoring**: Prometheus, Grafana, Loki
- **External Services**: PIX, email, SMS providers

**Use Cases:**
- Infrastructure planning
- Capacity planning
- Disaster recovery planning
- DevOps configuration

### 5. Security Architecture (`security-architecture.mmd`)
**Comprehensive security layers and controls.**

**Security Domains:**
1. **Perimeter Security**: Firewall, WAF, rate limiting
2. **Transport Security**: TLS 1.3, HSTS
3. **Authentication Layer**: SIWS, JWT, refresh tokens
4. **Authorization Layer**: RBAC, middleware, ownership checks
5. **Input Security**: XSS prevention, SQL injection prevention, Zod validation
6. **Session Security**: Nonce protection, token rotation, session revocation
7. **Data Security**: E2EE (Curve25519), no passwords (wallet signatures), data masking
8. **Blockchain Security**: Signature verification, on-chain validation, replay protection
9. **API Security**: CORS, CSP, CSRF protection
10. **Infrastructure Security**: Secret management, DB access control, audit logs
11. **Monitoring & Response**: Intrusion detection, alerts, incident response

**Use Cases:**
- Security audits
- Compliance documentation
- Threat modeling
- Security training

### 6. Blockchain Integration (`blockchain-integration.mmd`)
**Detailed view of off-chain ↔ on-chain integration.**

**Off-Chain Components:**
- API server
- Blockchain services (5): profiles, stores, governance, vesting, balances
- Background workers: reputation sync, block listener
- PostgreSQL database

**Communication Layer:**
- @polkadot/api (WebSocket)
- @polkadot/keyring (key management)

**On-Chain Components:**
- **Custom Pallets** (2): Profiles, Stores
- **Standard Pallets** (5): Balances, Democracy, Treasury, Council, Vesting
- **Runtime Storage**: Profiles, Stores, Vesting mappings

**Data Flow:**
- **Write Path**: API → Service → Polkadot.js → Extrinsic → Pallet → Storage
- **Read Path**: Storage → Query → Polkadot.js → Service → API → Client
- **Sync Path**: Blockchain → Worker → PostgreSQL (reputation, metadata)

**Use Cases:**
- Understanding hybrid architecture
- Planning on-chain/off-chain data split
- Debugging blockchain interactions
- Optimizing sync strategies

## 🎨 Viewing the Diagrams

### Online (Recommended)
1. **Mermaid Live Editor**: https://mermaid.live/
   - Copy diagram content
   - Paste into editor
   - View and export

2. **GitHub**:
   - View `.mmd` files directly in GitHub
   - Auto-renders Mermaid diagrams

### IDE/Editor
1. **VS Code**:
   ```bash
   code --install-extension bierner.markdown-mermaid
   ```
   - Open `.mmd` file
   - Right-click → "Open Preview"

2. **IntelliJ IDEA**:
   - Install "Mermaid" plugin
   - Open `.mmd` file
   - View in preview pane

### Export to Image
Using Mermaid CLI:
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i system-architecture.mmd -o system-architecture.png
```

## 🔄 Keeping Diagrams Updated

**When to Update:**
- Adding new modules
- Changing infrastructure
- Modifying security policies
- Adding/removing services
- Scaling deployment

**How to Update:**
1. Edit `.mmd` file in this directory
2. Validate using Mermaid Live Editor
3. Update this README if structure changes
4. Commit with descriptive message

## 📊 Diagram Statistics

| Diagram | Nodes | Connections | Complexity |
|---------|-------|-------------|------------|
| System Architecture | 30+ | 50+ | High |
| Module Dependencies | 20 | 60+ | High |
| Data Flow | 25+ | 40+ | Medium |
| Deployment | 35+ | 55+ | Very High |
| Security Architecture | 35+ | 35+ | Very High |
| Blockchain Integration | 25+ | 30+ | High |

**Total**: 6 comprehensive architecture diagrams covering all aspects of the platform.

## 🚀 Usage Examples

### Example 1: Planning New Feature
**Task**: Add NFT marketplace
**Diagrams to consult**:
1. Module Dependencies → Identify dependencies (marketplace, wallet, blockchain)
2. System Architecture → Identify services to extend
3. Data Flow → Plan data ingestion/storage
4. Blockchain Integration → Design on-chain storage

### Example 2: Security Audit
**Task**: Conduct security review
**Diagrams to consult**:
1. Security Architecture → Review all security layers
2. System Architecture → Identify attack surfaces
3. Deployment → Review infrastructure security
4. Data Flow → Identify sensitive data paths

### Example 3: Performance Optimization
**Task**: Improve API response time
**Diagrams to consult**:
1. Data Flow → Identify bottlenecks
2. Deployment → Review caching strategy
3. System Architecture → Identify slow services
4. Module Dependencies → Find circular calls

### Example 4: Scaling Strategy
**Task**: Scale to 10x users
**Diagrams to consult**:
1. Deployment → Plan horizontal scaling
2. System Architecture → Identify stateless services
3. Data Flow → Plan cache strategy
4. Blockchain Integration → Plan indexer nodes

## 📝 Conventions

**Colors:**
- 🔵 Blue: Client/Frontend
- 🟣 Purple: Gateway/Routing
- 🟠 Orange: Application Services
- 🟢 Green: Infrastructure Services
- 🔴 Red: Data Storage
- 🟡 Yellow: Blockchain
- ⚫ Gray: External Services

**Arrows:**
- Solid (`-->`) : Active/primary flow
- Dashed (`-.->`) : Future/optional flow
- Thick (`==>`) : High-volume flow

**Icons:**
- 🔐 Security
- 💾 Storage
- ⛓️ Blockchain
- 🌐 Network
- 📊 Analytics
- ⚙️ Processing

## 🔗 Related Documentation

- **Module Blueprints**: `/knowledge/20-blueprints/module-blueprints/`
- **Module Diagrams**: `/knowledge/10-modules/*/diagrams/`
- **Complete ERD**: `/knowledge/20-blueprints/schema/complete-erd.mmd`
- **Vision Documents**: `/knowledge/00-vision/`

---

**Last Updated**: 2025-11-02
**Maintainer**: Bazari Platform Team
**Version**: 1.0.0
