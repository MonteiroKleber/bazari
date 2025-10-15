# BazChat User Guide

Complete guide for using BazChat - the integrated chat, commerce, and social platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Direct Messages](#direct-messages)
3. [Groups & Communities](#groups--communities)
4. [Commerce in Chat](#commerce-in-chat)
5. [AI Assistant](#ai-assistant)
6. [Social Features](#social-features)
7. [Privacy & Security](#privacy--security)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### First Steps

1. **Sign in with your Polkadot wallet**
   - Connect your wallet on the Bazari platform
   - Your chat identity is linked to your wallet address

2. **Complete your profile**
   - Go to Settings → Profile
   - Add a display name, avatar, and bio
   - Your profile helps build trust in the community

3. **Understanding encryption**
   - All messages are end-to-end encrypted (E2EE)
   - Encryption keys are stored locally in your browser
   - If you clear browser data, you'll lose access to message history

### Interface Overview

```
┌─────────────────────────────────────────────┐
│  [≡] BazChat              [🔍] [⚙️] [👤]   │
├──────────────┬──────────────────────────────┤
│              │                              │
│  Threads     │   Active Conversation        │
│              │                              │
│  📧 Alice    │   Alice: Hey! Check this out │
│  📧 Bob      │   [Image preview]            │
│  🏪 Store1   │                              │
│  👥 Group    │   You: Nice! How much?       │
│              │                              │
│              │   Alice: $50. Want it?       │
│              │   [Proposal Card]            │
│              │   • Item: Widget             │
│              │   • Price: $50               │
│              │   [Accept] [Decline]         │
│              │                              │
│              ├──────────────────────────────┤
│              │ 📎 🤖 [Message...] [Send →] │
└──────────────┴──────────────────────────────┘
```

## Direct Messages

### Starting a Conversation

1. Click the **New Message** button (➕)
2. Search for a user by name or username
3. Type your message and press Enter

### Message Features

#### Text Formatting
- **Bold**: Wrap text with `*asterisks*`
- *Italic*: Wrap text with `_underscores_`
- Code: Wrap text with `` `backticks` ``

#### Mentions
- Type `@` followed by username to mention someone
- Suggestions will appear as you type
- Mentioned users receive notifications

#### Media Sharing
1. Click the 📎 (paperclip) button
2. Select file: images, videos, audio, or PDFs
3. Max size: 50MB per file
4. Files are encrypted before upload

#### Voice Messages
1. Click the 🎤 (microphone) button
2. Hold to record, release to send
3. Recordings are automatically transcribed (if AI enabled)

### AI Assistant Features

Click the 🤖 (bot) button to access:

#### Translation
- Translate messages to any language
- Auto-detect source language
- Supports 200+ languages via NLLB

#### Smart Replies
- AI suggests context-appropriate responses
- Based on conversation history
- Customize suggestions

#### Transcription
- Voice messages auto-transcribed
- Supports multiple languages
- Edit transcripts before sending

## Groups & Communities

### Creating a Group

1. Click **New Group** (➕ → Group)
2. Fill in details:
   - **Name**: Group name (required)
   - **Description**: What's the group about?
   - **Type**:
     - Community: Large public group
     - Channel: Broadcast-only
     - Private: Invite-only
3. Add initial members
4. Click **Create**

### Group Roles

- **Owner**: Full control, can delete group
- **Admin**: Manage members, edit settings
- **Moderator**: Remove messages, timeout users
- **Member**: Send messages, view content

### Group Polls

Create polls to make decisions:

1. In group chat, click **Create Poll**
2. Enter question (e.g., "Which feature next?")
3. Add 2-10 options
4. Set expiration (optional)
5. Vote: Click your choice and confirm

**Features**:
- One vote per person
- Live results after voting
- Auto-closes at expiration
- Results ranked by votes

## Commerce in Chat

### Selling in Chat

#### Create a Proposal

1. In any DM or group, click **Create Proposal** (💰)
2. Add items:
   - SKU (product code)
   - Name & description
   - Quantity
   - Price per unit
3. Add shipping (optional):
   - Method (standard/express)
   - Cost
4. Set commission (0-25%):
   - Reward promoters who bring sales
   - Platform takes 1% fee
5. Send proposal

#### Proposal Card

```
┌─────────────────────────────────────┐
│ 💰 Sales Proposal                   │
├─────────────────────────────────────┤
│ 📦 Widget Pro                       │
│    Qty: 2 × $50.00 = $100.00      │
│                                     │
│ 🚚 Shipping: Standard - $10.00     │
│                                     │
│ 💵 Total: $110.00                  │
│                                     │
│ ℹ️ Commission: 10% ($11.00)        │
│                                     │
│ [Accept Proposal] [Decline]        │
└─────────────────────────────────────┘
```

### Buying in Chat

#### Accept a Proposal

1. Review proposal details carefully
2. Check seller's trust badge (if any)
3. Click **Accept Proposal**
4. Confirm transaction in wallet
5. Receive NFT receipt

#### Payment Process

```
User Action → Wallet Confirm → Smart Contract → Receipt NFT
                                      ↓
                         Split: Seller (89%)
                                Promoter (10%)
                                Platform (1%)
```

### Commission System

#### For Promoters

Earn commissions by sharing products:

1. Find products to promote
2. Share with potential buyers
3. When they buy, you earn commission
4. Track earnings in **Cashback** section

#### For Sellers

Set commission rates:

1. Go to **Store Settings**
2. Set commission mode:
   - **Open**: Anyone can earn
   - **Followers**: Only followers
   - **Affiliates**: Selected users
3. Set percentage (0-25%)
4. Set daily cap (optional)

### Missions & Rewards

Complete missions to earn BZR tokens:

#### Available Missions

- **First Sale**: Complete your first transaction (50 BZR)
- **Daily Login**: Log in 7 days straight (20 BZR)
- **Community Helper**: Answer 10 questions (30 BZR)
- **Top Promoter**: Earn $100 commissions (100 BZR)

Track progress in **Missions** tab.

### Cashback

Earned cashback can be redeemed:

1. Go to **Cashback** section
2. View balance (in BZR)
3. Click **Redeem**
4. Choose amount to withdraw
5. Confirm in wallet

## Social Features

### Trust Badges

Trust badges show reputation levels:

#### Badge Levels

🛡️ **Bronze**
- 100+ reputation points
- 5+ completed sales
- Account 30+ days old
- Max 2 reports

🛡️ **Silver**
- 500+ reputation points
- 20+ completed sales
- Account 90+ days old
- Max 1 report

🏆 **Gold**
- 2000+ reputation points
- 100+ completed sales
- Account 180+ days old
- No reports

👑 **Platinum**
- 10,000+ reputation points
- 500+ completed sales
- Account 365+ days old
- No reports

### Earning Reputation

**Positive Actions** (+points):
- Complete sale (+10)
- Receive positive review (+5)
- Help community member (+3)
- Verified transaction (+2)

**Negative Actions** (-points):
- Report confirmed against you (-50)
- Canceled order (-5)
- Negative review (-3)

### Reporting Content

If you see inappropriate content:

1. Click **⋮** (options) on message/profile
2. Select **Report**
3. Choose reason:
   - Spam
   - Harassment
   - Scam
   - Inappropriate content
   - Hate speech
   - Violence
   - Impersonation
4. Add details (min 10 characters)
5. Submit

#### DAO-Light Moderation

Reports are reviewed by the community:

1. **Report submitted** → Status: Pending
2. **Community votes** → Weighted by reputation
3. **Auto-resolves** at 20 total votes
4. **Outcome**:
   - **Approved**: Warning or timeout issued
   - **Rejected**: Report dismissed

**Vote Weight**:
- 0-99 reputation: 1x vote
- 100-499: 2x vote
- 500-1999: 3x vote
- 2000-9999: 4x vote
- 10000+: 5x vote (max)

## Privacy & Security

### End-to-End Encryption

**How it works**:
1. Messages encrypted on your device
2. Server only sees encrypted data
3. Only recipient can decrypt
4. Keys stored in browser

**Important**:
- Clear browser data = lose message history
- No cloud backup by default
- Export encryption keys to backup

### Backing Up Keys

1. Go to **Settings** → **Security**
2. Click **Export Encryption Keys**
3. Save file securely (encrypted)
4. To restore: **Import Encryption Keys**

### Privacy Settings

Control what others see:

- **Online Status**: Show/hide when active
- **Read Receipts**: Show/hide when read
- **Typing Indicators**: Show/hide when typing
- **Profile Visibility**: Public/Followers/Private

### Blocking Users

1. Open conversation with user
2. Click **⋮** → **Block User**
3. They can't message or see your profile
4. Unblock anytime in Settings

## Troubleshooting

### Connection Issues

**"Disconnected" banner appears**:
1. Check internet connection
2. Wait for auto-reconnect (max 10 attempts)
3. Refresh page if not reconnecting
4. Check system status at status.bazari.com

**Messages stuck in queue**:
- Shown as "X messages in queue"
- Will send when reconnected
- Queue holds up to 100 messages
- Messages older than 5 minutes dropped

### Encryption Issues

**"Error decrypting message"**:
1. Ask sender to resend
2. Try exporting/importing keys
3. Contact support if persistent

**Lost message history**:
- Cannot be recovered if keys lost
- Always backup encryption keys
- Consider enabling cloud backup (coming soon)

### Performance Issues

**Chat loading slowly**:
1. Clear browser cache
2. Reduce number of open threads
3. Disable message sync for old threads
4. Check browser console for errors

**Messages not sending**:
1. Check connection status
2. Verify file size (<50MB)
3. Try resending
4. Check if recipient blocked you

### AI Features Not Working

**AI Assistant unavailable**:
- Feature requires AI models deployed
- Check if server is in MOCK mode
- Alternative: Manual translation/transcription

## Advanced Features

### Keyboard Shortcuts

- `Ctrl/Cmd + K`: Quick thread search
- `Ctrl/Cmd + N`: New message
- `Ctrl/Cmd + /`: Show shortcuts
- `↑`: Edit last message
- `Esc`: Close modals
- `@`: Mention user
- `/`: Slash commands (coming soon)

### Developer Mode

Enable in Settings → Advanced:
- See encryption debug info
- View WebSocket messages
- Export diagnostic logs
- Test MOCK features

### API Access

For developers building on BazChat:
- See [CHAT_API.md](../api/CHAT_API.md)
- Generate API token in Settings
- Rate limits: 100 req/min
- WebSocket: 1 connection/user

## Getting Help

### Support Channels

- **Help Center**: help.bazari.com
- **Community**: Join #support channel
- **GitHub**: github.com/anthropics/bazari/issues
- **Email**: support@bazari.com

### Status Page

Check system status: status.bazari.com
- API uptime
- WebSocket status
- Blockchain sync
- AI model availability

### Feature Requests

Request features:
1. Go to **Settings** → **Feedback**
2. Describe feature
3. Vote on existing requests
4. Track implementation status

---

**Version**: 1.0
**Last Updated**: 2025-10-12
**Feedback**: docs@bazari.com
