# Wallet Module - Use Cases

## 👤 Actors
- **User** - Usuário da plataforma
- **System** - Frontend (sem backend para wallet)

## 📋 Core Use Cases

### UC-01: Create Wallet
1. User acessa `/auth/create`
2. System gera mnemonic (12 palavras)
3. User confirma que salvou mnemonic
4. User define PIN (6+ dígitos)
5. System deriva seed do mnemonic
6. System criptografa seed com PIN (AES-256-GCM)
7. System armazena em IndexedDB
8. System carrega keyring com account //0
9. Wallet criada

### UC-02: Import Wallet
1. User acessa `/auth/import`
2. User insere mnemonic (12/24 palavras)
3. System valida mnemonic (checksum)
4. User define PIN
5. System criptografa e armazena seed
6. Wallet importada

### UC-03: Unlock Wallet
1. User insere PIN
2. System descriptografa seed
3. System carrega keyring
4. Wallet unlocked

### UC-04: Send BZR
1. User acessa `/app/wallet/send`
2. User seleciona token (BZR)
3. User insere recipient address
4. User insere amount
5. System calcula fee
6. User confirma
7. System assina transação
8. System submits to chain
9. System aguarda confirmação
10. Transaction complete

### UC-05: Receive BZR
1. User acessa `/app/wallet/receive`
2. System exibe QR code com address
3. User compartilha address/QR
4. Sender envia tokens
5. System detecta transaction (polling/subscription)
6. Balance updated

### UC-06: View Balance
1. User acessa `/app/wallet`
2. System consulta balances (RPC):
   - BZR (native balance)
   - ZARI (assets pallet)
3. System formata valores (12 decimals)
4. User vê saldos

### UC-07: View Transaction History
1. User acessa `/app/wallet/history`
2. System consulta transactions:
   - Sent transfers
   - Received transfers
3. System pagina resultados
4. User vê histórico

### UC-08: Switch Account
1. User acessa `/app/wallet/accounts`
2. System lista accounts (//0, //1, //2)
3. User seleciona account //1
4. System atualiza active account
5. All future transactions use //1

### UC-09: Add New Account
1. User clica "Add Account"
2. System deriva next account (//N)
3. Account added to list
4. User pode switch to new account

### UC-10: Recover Wallet (Lost PIN)
1. User acessa `/auth/recover-pin`
2. User insere mnemonic
3. System deriva seed
4. System valida que wallet exists
5. User define new PIN
6. System re-encripta seed
7. Wallet recovered

---

**Document Owner:** Wallet Module Team
**Last Updated:** 2025-11-02
**Version:** 1.0.0
