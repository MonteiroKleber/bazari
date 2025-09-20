# Bazari Web Wallet Module

This directory contains the web wallet experience for Bazari. It is designed to
consume the shared authentication vault (PIN + AES-GCM over IndexedDB) while
connecting directly to a local Bazarichain node via Polkadot.js.

## Structure

- `components/` reusable wallet UI (QR code, scanner, etc.).
- `hooks/` data hooks for chain metadata and vault state.
- `pages/` routed views (`WalletDashboard`, `AccountsPage`, `SendPage`, `ReceivePage`).
- `services/` Polkadot.js helpers for API connection, balances, tokens, and history.
- `store/` client-side stores (e.g. enabled tokens).
- `utils/` formatting helpers for balances and addresses.

## Key Concepts

- **Vault integration**: `modules/auth/crypto.store.ts` now supports multiple
  accounts using the same encryption (PBKDF2 + AES-GCM). All wallet flows reuse
  these helpers so private material never leaves the browser.
- **Chain connectivity**: `services/polkadot.ts` exposes a singleton
  `ApiPromise` connected to `ws://127.0.0.1:9944`, with retry/backoff logic and
  cached chain properties (SS58 prefix, symbol, decimals).
- **Live data**: balances and history subscribe to on-chain storage/events so
  the dashboard updates in real time without backend dependencies.
- **Token registry**: additional assets (via `pallet-assets`) are stored per
  account in localStorage (`wallet:tokens:v1`) and hydrated on demand.
- **Security**: signing requires the user PIN. Seeds are decrypted only in
  memory, immediately wiped, and extrusion uses ephemeral `@polkadot/keyring`
  pairs.

## Feature Flags

The current implementation works fully client-side. A future backend indexer
can be introduced behind a `FEATURE_WALLET_INDEXER` flag by replacing the
history service with API calls.

## Manual Testing Checklist

1. Create/import accounts, set active, export mnemonic, and remove accounts.
2. Add/remove custom tokens by `assetId` and confirm balances appear.
3. Send native and asset transfers (including QR recipient input) on a local
   node and watch history update.
4. Receive view should display the address with the network SS58 prefix and QR
   code, supporting copy/share actions.

Always run the local node (`ws://127.0.0.1:9944`) before starting the web app.
