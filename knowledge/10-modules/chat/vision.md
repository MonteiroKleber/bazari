# Chat Module (BazChat) - Vision & Purpose

## 🎯 Vision
**"BazChat: Sistema de mensagens E2EE (End-to-End Encrypted) integrado ao marketplace, suportando DMs, chat de pedidos, grupos comunitários, propostas de checkout in-chat, e gamificação com missões e badges."**

## 📋 Purpose
1. **E2EE Messaging** - Curve25519 encryption para todas as mensagens
2. **Multiple Contexts** - DM, store chat, order chat, groups
3. **In-Chat Commerce** - Checkout proposals, payment links
4. **Groups & Channels** - Community groups, DAO channels
5. **Gamification** - Missions, trust badges, opportunities
6. **Moderation** - Report system com votação comunitária

## 🌟 Key Principles
- **Privacy First** - E2EE com chaves derivadas de seed phrases
- **Commerce Integration** - Comprar diretamente via chat
- **Context-Aware** - Threads ligados a orders, stores, groups
- **Real-Time** - WebSocket para mensagens instantâneas
- **Decentralized Moderation** - Community voting on reports

## 🔐 Encryption Architecture
```
Client A               Server                Client B
   ↓                      ↓                      ↓
Generate keypair    Store ciphertext     Generate keypair
Encrypt message     Relay encrypted      Decrypt message
(Curve25519)        (Never sees plain)   (Curve25519)
```

## 📊 Thread Types
- **dm**: Direct message 1-on-1
- **store**: Chat com loja (buyer-seller)
- **order**: Chat específico de pedido
- **group**: Community groups/channels

## 💬 Message Types
- `text` - Plain text (encrypted)
- `audio` - Voice message
- `image` - Image attachment
- `file` - File attachment
- `proposal` - Checkout proposal
- `checkout` - Payment link
- `system` - System notification

## 🎮 Gamification Features
- **ChatMission** - Tasks with BZR rewards (share, review, referral)
- **ChatTrustBadge** - Bronze, Silver, Gold, Platinum levels
- **ChatOpportunity** - Jobs, freelance, partnerships posted in groups

## 🚨 Moderation System
- **ChatReport** - Report messages/profiles/groups
- **ChatReportVote** - Community votes on reports
- **Resolutions** - warning, suspend, ban, dismiss

## 🔮 Future Features
- Voice/video calls (WebRTC)
- Screen sharing
- Message reactions
- Thread search
- Message translation
- Ephemeral messages (disappearing)

**Status:** ✅ Implemented & Production-Ready (FASE 0-8 Complete)
