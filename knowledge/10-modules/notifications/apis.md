# Notifications Module - API Reference

## 1. Get Notifications List
**`GET /api/notifications`**

```http
GET /api/notifications?type=FOLLOW&limit=50&cursor=clx...
Authorization: Bearer <token>
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "clx...",
      "type": "FOLLOW",
      "actor": {
        "id": "clx...",
        "handle": "alice",
        "displayName": "Alice",
        "avatarUrl": "..."
      },
      "message": "Alice started following you",
      "targetId": null,
      "read": false,
      "createdAt": "2025-11-02T10:30:00Z"
    }
  ],
  "unreadCount": 5,
  "nextCursor": "clx...",
  "hasMore": true
}
```

## 2. Mark as Read
**`PUT /api/notifications/:id/read`**

```http
PUT /api/notifications/clx123/read
Authorization: Bearer <token>
```

**Response:**
```json
{
  "notification": { "id": "clx123", "read": true }
}
```

## 3. Mark All as Read
**`PUT /api/notifications/read-all`**

```http
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "updatedCount": 12
}
```

## 4. Delete Notification
**`DELETE /api/notifications/:id`**

```http
DELETE /api/notifications/clx123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true
}
```

## 5. Get Unread Count
**`GET /api/notifications/unread-count`**

```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

**Response:**
```json
{
  "unreadCount": 5
}
```

---

**WebSocket Events:**
```javascript
// Client subscribes
ws.send({ type: 'subscribe', channel: 'notifications' })

// Server emits new notification
ws.emit('notification:new', {
  id: 'clx...',
  type: 'LIKE',
  message: 'Bob liked your post'
})
```

---

**Rate Limits:**
- GET: 100/min
- PUT/DELETE: 50/min

**Status:** ✅ Implemented
