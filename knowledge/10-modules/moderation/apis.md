# Moderation Module - API Reference

## 1. Create Report
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

## 2. Vote on Report
**`POST /api/chat/reports/:id/vote`** (Auth required)

```http
POST /api/chat/reports/report123/vote
{
  "vote": "approve"
}
```

## 3. Get Pending Reports
**`GET /api/chat/reports`** (Auth required, Moderator role)

```http
GET /api/chat/reports?status=pending
```

## 4. Resolve Report (Admin)
**`PUT /api/chat/reports/:id/resolve`** (Auth required, Admin role)

```http
PUT /api/chat/reports/report123/resolve
{
  "resolution": "suspend",
  "notes": "Repeated spam violations"
}
```

**Status:** ✅ Implemented (APIs in chat module)
