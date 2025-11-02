# Media Module - API Reference

## 1. Upload Media
**`POST /api/media/upload`**

```http
POST /api/media/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
ownerType: Profile | Product | Post (optional)
ownerId: <id> (optional)
```

**Response:**
```json
{
  "media": {
    "id": "clx...",
    "url": "/uploads/abc123.png",
    "mime": "image/png",
    "size": 1024000
  }
}
```

## 2. Get Media URL
**`GET /api/media/:id/url`**

Returns direct or signed URL.

## 3. Download Media
**`GET /api/media/:id`**

Streams file.

## 4. Delete Media
**`DELETE /api/media/:id`**

Deletes file and record.

---

**Rate Limits:**
- Upload: 50/hour per user
- Download: 1000/hour per IP

**Status:** ✅ Implemented
