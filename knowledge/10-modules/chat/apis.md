# Chat Module (BazChat) - API Reference

## 1. Create/Get Thread
**`POST /api/chat/threads`** (Auth required)

```http
POST /api/chat/threads
{
  "kind": "dm",
  "participants": ["profile_abc", "profile_xyz"]
}
```

## 2. Send Message
**`POST /api/chat/messages`** (Auth required)

```http
POST /api/chat/messages
{
  "threadId": "thread_123",
  "type": "text",
  "ciphertext": "encrypted_content_base64",
  "meta": {}
}
```

**Note:** Client encrypts message with recipient's public key before sending.

## 3. Get Messages
**`GET /api/chat/threads/:id/messages`** (Auth required)

```http
GET /api/chat/threads/thread_123/messages?limit=50&before=timestamp
```

Returns encrypted messages. Client decrypts locally.

## 4. Create Checkout Proposal
**`POST /api/chat/proposals`** (Auth required)

```http
POST /api/chat/proposals
{
  "threadId": "thread_123",
  "items": [
    {"productId": "prod_1", "qty": 2, "price": "10.00"}
  ],
  "subtotal": "20.00",
  "total": "25.00",
  "commissionPercent": 5
}
```

## 5. Accept Proposal
**`POST /api/chat/proposals/:id/accept`** (Auth required)

```http
POST /api/chat/proposals/proposal_123/accept
```

Redirects to checkout with pre-filled cart.

## 6. Join Group
**`POST /api/chat/groups/:id/join`** (Auth required)

```http
POST /api/chat/groups/group_123/join
```

## 7. Get Active Missions
**`GET /api/chat/missions`** (Public)

```http
GET /api/chat/missions?status=active
```

## 8. Complete Mission
**`POST /api/chat/missions/:id/complete`** (Auth required)

```http
POST /api/chat/missions/mission_123/complete
{
  "proof": {
    "type": "share",
    "url": "https://twitter.com/..."
  }
}
```

## 9. Report Content
**`POST /api/chat/reports`** (Auth required)

```http
POST /api/chat/reports
{
  "contentType": "message",
  "contentId": "msg_123",
  "reason": "spam",
  "description": "Sending unsolicited ads"
}
```

## 10. Vote on Report
**`POST /api/chat/reports/:id/vote`** (Auth required)

```http
POST /api/chat/reports/report_123/vote
{
  "vote": "approve"
}
```

Votes: `approve` or `reject`

---

## WebSocket Events

```typescript
// Connect
ws.connect('/chat');

// Listen for new messages
ws.on('chat.message', (message) => {
  // Decrypt and display
});

// Listen for typing indicators
ws.on('chat.typing', (data) => {
  // Show "User is typing..."
});

// Send typing indicator
ws.emit('chat.typing', { threadId, isTyping: true });
```

**Status:** ✅ Implemented & Production-Ready
