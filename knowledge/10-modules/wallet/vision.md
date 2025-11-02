# Wallet Module - Vision & Purpose

## 🎯 Vision

**"Prover wallet Web3 não-custodial segura, simples e intuitiva para todos os usuários da Bazari, com suporte a múltiplas accounts e tokens (BZR, ZARI)."**

---

## 📋 Purpose

O módulo **Wallet** é **transversal** e responsável por:

1. **Key Management** - Geração, importação e armazenamento seguro de chaves
2. **Account Management** - Múltiplas accounts derivadas de um seed
3. **Asset Management** - Gestão de tokens (BZR, ZARI) e NFTs
4. **Transaction Signing** - Assinatura de transações on-chain
5. **Balance Tracking** - Consulta de saldos e histórico

---

## 🌟 Key Principles

### 1. Non-Custodial
- Usuário é dono das chaves privadas
- Seed armazenada localmente (IndexedDB)
- Nenhum servidor tem acesso às chaves

### 2. PIN-Protected
- Seed criptografada com PIN do usuário
- AES-256-GCM encryption
- Protegido contra brute force (rate limiting)

### 3. Multi-Account
- Derivação HD (Hierarchical Deterministic)
- Múltiplas accounts do mesmo seed
- BIP-39 mnemonic (12/24 palavras)

### 4. Developer-Friendly
- Polkadot.js integration
- TypeScript-first
- React hooks (useVaultAccounts, useChainProps)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Web)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Wallet Pages                                 │  │
│  │  - WalletHome, SendPage, ReceivePage         │  │
│  │  - AccountsPage, WalletDashboard              │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Crypto Store (Zustand)                       │  │
│  │  - Encrypted Seed (IndexedDB)                 │  │
│  │  - Active Account                             │  │
│  │  - Keyring (Polkadot.js)                      │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  PIN Service                                  │  │
│  │  - Encrypt/Decrypt Seed                       │  │
│  │  - Validate PIN Strength                      │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Polkadot Service                             │  │
│  │  - Query Balances (RPC)                       │  │
│  │  - Submit Transactions                        │  │
│  │  - Query History                              │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ▼ WSS/HTTP
┌─────────────────────────────────────────────────────┐
│              Blockchain Node (Substrate)             │
│  ┌───────────────────────────────────────────────┐  │
│  │  Balances Pallet                              │  │
│  │  - Native Token (BZR)                         │  │
│  │  - Query Balance                              │  │
│  │  - Transfer                                   │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Assets Pallet                                │  │
│  │  - Tokens (ZARI = asset ID 1)                │  │
│  │  - Query Balance                              │  │
│  │  - Transfer                                   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 Security Model

### Seed Storage
- **Location**: IndexedDB (browser)
- **Encryption**: AES-256-GCM with PBKDF2-derived key
- **Key Derivation**: PBKDF2(PIN, salt, 100000 iterations)
- **Salt**: Random 16 bytes per wallet

### PIN Protection
- **Length**: Min 6 digits (recommended 8+)
- **Strength**: Weak (<6), Medium (6-7), Strong (8+)
- **Attempts**: Max 3 failed attempts → 5 min lockout
- **Storage**: PIN never stored, only used for decryption

### Account Derivation
- **Path**: `//polkadot//0`, `//polkadot//1`, etc.
- **Algorithm**: sr25519 (Schnorrkel)
- **Mnemonic**: BIP-39 (12 or 24 words)

---

## 💰 Supported Assets

| Asset | Type | Decimals | Pallet |
|-------|------|----------|--------|
| **BZR** | Native | 12 | balances |
| **ZARI** | Token | 12 | assets (ID: 1) |

---

## 📊 Key Metrics

| Metric | Target |
|--------|--------|
| Wallet Creation Rate | >95% on signup |
| Transaction Success Rate | >99% |
| Avg Transaction Time | <10s |
| PIN Reset Rate | <5% |

---

## 🔮 Future Features

1. **Hardware Wallet Support** (Ledger, Trezor)
2. **Multi-Sig Wallets**
3. **WalletConnect Integration**
4. **QR Code Payments**
5. **Transaction History Export (CSV)**

---

**Document Owner:** Wallet Module Team
**Last Updated:** 2025-11-02
**Version:** 1.0.0
**Status:** ✅ Implemented & Production-Ready
