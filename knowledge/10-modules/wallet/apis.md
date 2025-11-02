# Wallet Module - API Reference

## ⚠️ No REST API

O módulo Wallet **não possui backend API**. Todas as operações são realizadas **client-side** (frontend) interagindo diretamente com a blockchain via RPC.

---

## 🔗 Blockchain RPC Methods

### 1. Query Balance (BZR)

```typescript
import { ApiPromise } from '@polkadot/api'

const balance = await api.query.system.account(address)
// Returns: { data: { free, reserved, frozen }, nonce }
```

### 2. Query Asset Balance (ZARI)

```typescript
const assetBalance = await api.query.assets.account(assetId, address)
// assetId = 1 (ZARI)
// Returns: { balance }
```

### 3. Transfer BZR

```typescript
const tx = api.tx.balances.transfer(recipientAddress, amount)
const hash = await tx.signAndSend(account)
```

### 4. Transfer ZARI

```typescript
const tx = api.tx.assets.transfer(assetId, recipientAddress, amount)
const hash = await tx.signAndSend(account)
```

### 5. Query Transaction Fee

```typescript
const info = await tx.paymentInfo(account)
// Returns: { partialFee, weight }
```

---

## 🪝 React Hooks

### useVaultAccounts()

```typescript
const { accounts, activeAccount, setActiveAccount } = useVaultAccounts()
```

### useChainProps()

```typescript
const { ss58Format, tokenSymbol, tokenDecimals } = useChainProps()
```

### useTransactionFee()

```typescript
const { fee, loading } = useTransactionFee(tx, account)
```

---

## 🔐 Crypto Utils

### generateMnemonic()

```typescript
import { mnemonicGenerate } from '@polkadot/util-crypto'
const mnemonic = mnemonicGenerate(12) // or 24
```

### validateMnemonic()

```typescript
import { mnemonicValidate } from '@polkadot/util-crypto'
const isValid = mnemonicValidate(mnemonic)
```

### encryptSeed()

```typescript
import { encryptSeed } from '@/modules/wallet/pin/PinService'
const { encryptedSeed, iv, salt } = await encryptSeed(seed, pin)
```

### decryptSeed()

```typescript
const seed = await decryptSeed(encryptedSeed, iv, salt, pin)
```

---

**Document Owner:** Wallet Module Team
**Last Updated:** 2025-11-02
**Version:** 1.0.0
