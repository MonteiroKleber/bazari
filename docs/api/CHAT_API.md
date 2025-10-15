# BazChat API Documentation

Complete API reference for BazChat - the integrated chat, commerce, and social platform.

## Table of Contents

- [Authentication](#authentication)
- [WebSocket Protocol](#websocket-protocol)
- [Chat API](#chat-api)
- [Commerce API](#commerce-api)
- [AI API](#ai-api)
- [Social API](#social-api)
- [Monetization API](#monetization-api)
- [WebRTC API](#webrtc-api)

## Authentication

All HTTP endpoints require Bearer token authentication:

```
Authorization: Bearer <access_token>
```

WebSocket connections authenticate via query parameter:

```
ws://localhost:3000/chat/ws?token=<access_token>
```

## WebSocket Protocol

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/chat/ws?token=' + token);
```

### Message Format

All messages follow this structure:

```typescript
interface WsMessage {
  op: string;           // Operation type
  data: any;           // Payload
}
```

### Client → Server Messages

#### Send Message
```json
{
  "op": "send",
  "data": {
    "threadId": "thread_123",
    "type": "text",
    "ciphertext": "encrypted_content",
    "mediaCid": "optional_ipfs_cid",
    "meta": {}
  }
}
```

#### Typing Indicator
```json
{
  "op": "typing",
  "data": {
    "threadId": "thread_123",
    "typing": true
  }
}
```

#### Read Receipt
```json
{
  "op": "read",
  "data": {
    "messageId": "msg_123"
  }
}
```

#### WebRTC Signaling
```json
{
  "op": "rtc:offer",
  "data": {
    "callId": "call_123",
    "from": "profile_abc",
    "to": "profile_xyz",
    "sdp": { ... },
    "type": "video"
  }
}
```

### Server → Client Messages

#### New Message
```json
{
  "op": "message",
  "data": {
    "id": "msg_123",
    "threadId": "thread_123",
    "from": "profile_abc",
    "type": "text",
    "ciphertext": "...",
    "createdAt": 1234567890
  }
}
```

#### Receipt
```json
{
  "op": "receipt",
  "data": {
    "messageId": "msg_123",
    "status": "sent|delivered|read"
  }
}
```

## Chat API

### Threads

#### List Threads
```http
GET /api/chat/threads?cursor=123&limit=20
```

Response:
```json
{
  "threads": [
    {
      "id": "thread_123",
      "kind": "dm",
      "participants": ["profile_a", "profile_b"],
      "lastMessageAt": 1234567890
    }
  ],
  "nextCursor": 456
}
```

#### Create Thread
```http
POST /api/chat/threads
Content-Type: application/json

{
  "participantId": "profile_xyz",
  "kind": "dm"
}
```

### Messages

#### Get Messages
```http
GET /api/chat/messages?threadId=thread_123&cursor=100&limit=50
```

Response:
```json
{
  "messages": [
    {
      "id": "msg_123",
      "threadId": "thread_123",
      "from": "profile_abc",
      "type": "text",
      "ciphertext": "...",
      "createdAt": 1234567890
    }
  ],
  "nextCursor": 50
}
```

### Groups

#### Create Group
```http
POST /api/chat/groups
Content-Type: application/json

{
  "name": "My Group",
  "description": "Group description",
  "kind": "community",
  "isPublic": true,
  "initialMembers": ["profile_1", "profile_2"]
}
```

#### Invite to Group
```http
POST /api/chat/groups/:groupId/invite
Content-Type: application/json

{
  "memberId": "profile_xyz"
}
```

### Media Upload

```http
POST /api/chat/upload
Content-Type: multipart/form-data

file: <binary>
```

Response:
```json
{
  "cid": "QmHash...",
  "encryptionKey": "base64_key",
  "mimetype": "image/jpeg",
  "filename": "photo.jpg",
  "size": 12345
}
```

## Commerce API

### Proposals

#### Create Proposal
```http
POST /api/chat/proposals
Content-Type: application/json

{
  "threadId": "thread_123",
  "items": [
    {
      "sku": "PROD-001",
      "name": "Product Name",
      "qty": 2,
      "price": "10.50"
    }
  ],
  "shipping": {
    "method": "standard",
    "price": "5.00"
  },
  "total": "26.00",
  "commissionPercent": 10
}
```

#### Get Proposal
```http
GET /api/chat/proposals/:proposalId
```

#### Checkout
```http
POST /api/chat/checkout
Content-Type: application/json

{
  "proposalId": "proposal_123",
  "promoterId": "optional_profile_id"
}
```

Response:
```json
{
  "saleId": "sale_123",
  "txHash": "0x...",
  "receiptNftCid": "QmHash...",
  "splits": {
    "seller": "85.00",
    "promoter": "10.00",
    "platform": "1.00"
  }
}
```

### Store Settings

#### Get Settings
```http
GET /api/chat/settings/store/:storeId
```

#### Update Settings
```http
PUT /api/chat/settings/store/:storeId
Content-Type: application/json

{
  "mode": "open",
  "percent": 15,
  "minReputation": 100,
  "dailyCommissionCap": "1000.00"
}
```

## AI API

### Translation

```http
POST /api/chat/ai/translate
Content-Type: application/json

{
  "text": "Hello world",
  "sourceLang": "en",
  "targetLang": "pt"
}
```

### Speech-to-Text

```http
POST /api/chat/ai/transcribe
Content-Type: multipart/form-data

file: <audio_file>
language: pt
```

### Suggest Reply

```http
POST /api/chat/ai/suggest
Content-Type: application/json

{
  "threadId": "thread_123",
  "conversationHistory": ["Olá!", "Oi, tudo bem?"]
}
```

## Social API

### Reports

#### Create Report
```http
POST /api/chat/reports
Content-Type: application/json

{
  "reportedId": "profile_xyz",
  "contentType": "message",
  "contentId": "msg_123",
  "reason": "spam",
  "description": "Detailed description"
}
```

#### Vote on Report
```http
POST /api/chat/reports/:reportId/vote
Content-Type: application/json

{
  "vote": "approve"
}
```

### Trust Badges

```http
GET /api/chat/badges/:profileId
```

Response:
```json
{
  "badge": {
    "id": "badge_123",
    "level": "gold",
    "nftId": "0x...",
    "issuedAt": 1234567890
  }
}
```

## Monetization API

### Missions

#### List Missions
```http
GET /api/chat/missions
```

#### Complete Mission
```http
POST /api/chat/missions/:missionId/complete
Content-Type: application/json

{
  "progress": 10
}
```

### Cashback

#### Get Balance
```http
GET /api/chat/cashback/balance
```

#### Redeem
```http
POST /api/chat/cashback/redeem
Content-Type: application/json

{
  "amount": "50.00"
}
```

### Rankings

```http
GET /api/chat/ranking/promoters?period=30d&limit=10
```

### Opportunities

```http
GET /api/chat/opportunities?type=freelance&status=open
```

## WebRTC API

### Calls

#### Start Call
```http
POST /api/chat/calls
Content-Type: application/json

{
  "threadId": "thread_123",
  "calleeId": "profile_xyz",
  "type": "video"
}
```

#### End Call
```http
DELETE /api/chat/calls/:callId
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": []
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limits

- **HTTP API**: 100 requests/minute per user
- **WebSocket**: 1 connection per user
- **Messages**: 50 messages/minute per thread

## Best Practices

1. **Always encrypt messages client-side** before sending
2. **Handle reconnections** with exponential backoff
3. **Queue messages** when offline
4. **Batch operations** when possible
5. **Use cursor-based pagination** for lists
6. **Implement retry logic** for failed requests
7. **Cache thread list** and sync incrementally

## MOCK Mode Notice

⚠️ **Current Implementation**: Several features run in MOCK mode:
- Commerce (sales in PostgreSQL, not blockchain)
- Rewards (cashback in PostgreSQL)
- Trust Badges (mock NFT IDs)
- AI (placeholder responses if models not deployed)

All MOCK features are designed to be swapped with real implementations without breaking the API contract.

## Support

For issues or questions:
- GitHub: https://github.com/anthropics/bazari
- Docs: https://docs.bazari.com
