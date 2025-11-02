# Store Module - Vision & Purpose

## 🎯 Vision
**"Empoderar empreendedores a criar lojas tokenizadas, descentralizadas e soberanas com governança própria e catálogo on-chain."**

## 📋 Purpose
1. **Tokenized Stores** - Lojas como NFTs on-chain
2. **IPFS Catalog** - Catálogo versionado em IPFS
3. **Multi-Store** - Múltiplas lojas por usuário
4. **Operators** - Delegar gestão sem transferir ownership
5. **On-Chain Sync** - Sincronização automática com blockchain

## 🌟 Key Principles
- **Self-Sovereign** - Loja é do dono (NFT ownership)
- **Portable** - Catálogo em IPFS (plataforma-agnostic)
- **Versioned** - Histórico de publicações on-chain
- **Decentralized Governance** - Lojas podem ter DAO próprio

## 🏗️ Architecture
```
SellerProfile (DB) ←→ Store NFT (On-Chain)
     ↓                      ↓
Catalog (DB)    →    IPFS (CID)
     ↓                      ↓
Products       →    store.json
```

## 📦 On-Chain Structure
```typescript
// Store NFT Metadata (IPFS)
{
  "name": "Alice's Store",
  "description": "Handmade crafts",
  "image": "ipfs://Qm.../logo.png",
  "metadataCid": "Qm.../store.json",
  "categoriesCid": "Qm.../categories.json",
  "productsCid": "Qm.../products.json",
  "version": 1
}
```

## 🔐 Access Control
- **Owner** - Full control (SS58 address)
- **Operators** - Can manage products, não podem transfer NFT
- **Public** - Can view catalog

## 🔮 Future Features
1. **Store DAO** - Lojas governadas por token holders
2. **Revenue Sharing** - Split automático de receitas
3. **Store Analytics** - Dashboard on-chain
4. **Cross-Chain Stores** - Lojas em múltiplas chains

**Status:** ✅ Implemented & Production-Ready
