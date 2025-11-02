# Media Module - Use Cases

## UC-01: Upload Media
1. User selects file (avatar, product photo, etc.)
2. Client validates file (type, size)
3. Client uploads `POST /api/media/upload`
4. Server calculates content hash (SHA-256)
5. Server checks if hash exists (dedup)
6. If exists, returns existing MediaAsset
7. If new, stores file (LocalFS or S3)
8. Server creates MediaAsset record
9. Returns media ID and URL

## UC-02: Get Media URL
1. Client requests `GET /api/media/:id/url`
2. Server finds MediaAsset by ID
3. If LocalFS, returns direct URL
4. If S3, generates signed URL (1h expiration)
5. Returns URL

## UC-03: Download Media
1. User clicks media link
2. Browser requests `GET /api/media/:id`
3. Server streams file
4. User downloads/views file

## UC-04: Delete Media
1. Owner requests `DELETE /api/media/:id`
2. Server verifies ownership
3. Server deletes file from storage
4. Server deletes MediaAsset record

**Status:** ✅ Implemented
