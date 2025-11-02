# Analytics Module - API Reference

## 1. Get User Analytics
**`GET /api/users/me/analytics`** (Auth required)

```http
GET /api/users/me/analytics?timeRange=30d
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `timeRange` (optional): `'7d' | '30d' | '90d'` (default: `'30d'`)

**Response:**
```json
{
  "timeRange": "30d",
  "overview": {
    "totalPosts": 42,
    "totalLikes": 350,
    "totalComments": 128,
    "totalEngagement": 478,
    "engagementRate": 11.38,
    "totalFollowers": 1250,
    "newFollowers": 85
  },
  "followerGrowth": [
    { "date": "2025-01-01", "count": 10 },
    { "date": "2025-01-02", "count": 13 },
    { "date": "2025-01-03", "count": 17 }
  ],
  "engagementOverTime": [
    { "date": "2025-01-01", "rate": 12.5 },
    { "date": "2025-01-02", "rate": 10.3 },
    { "date": "2025-01-03", "rate": 15.8 }
  ],
  "bestPostingTimes": [
    { "hour": 9, "posts": 15, "avgEngagement": 45.2 },
    { "hour": 18, "posts": 12, "avgEngagement": 42.8 },
    { "hour": 12, "posts": 18, "avgEngagement": 38.1 },
    { "hour": 21, "posts": 8, "avgEngagement": 35.5 },
    { "hour": 7, "posts": 6, "avgEngagement": 32.0 }
  ],
  "topPosts": [
    {
      "id": "post_abc123",
      "content": "Just launched my new marketplace store! Check it out 🚀...",
      "likes": 85,
      "comments": 32,
      "engagement": 117,
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "post_def456",
      "content": "Tutorial: How to use P2P exchange for PIX payments...",
      "likes": 72,
      "comments": 28,
      "engagement": 100,
      "createdAt": "2025-01-12T14:20:00Z"
    }
  ]
}
```

**Calculation Logic:**
1. **totalPosts**: Count of `Post` where `authorId = profile.id` and `createdAt >= startDate`
2. **totalLikes**: Sum of `PostLike.count` for user's posts in period
3. **totalComments**: Sum of `PostComment.count` for user's posts in period
4. **totalEngagement**: `totalLikes + totalComments`
5. **engagementRate**: `totalEngagement / totalPosts` (avg engagement per post)
6. **totalFollowers**: Count of `Follow` where `followingId = profile.id` (all-time)
7. **newFollowers**: Count of `Follow` where `followingId = profile.id` and `createdAt >= startDate`
8. **followerGrowth**: Daily cumulative follower count (gaps filled with previous value)
9. **engagementOverTime**: Daily engagement rate (engagement / posts for that day)
10. **bestPostingTimes**: Top 5 hours sorted by `avgEngagement = (likes + comments) / posts`
11. **topPosts**: Top 10 posts sorted by `engagement = likes + comments`

## 2. Get Store Analytics (Future - Not Implemented)
**`GET /api/stores/:storeId/analytics`** (Auth required, Store owner only)

```http
GET /api/stores/store_123/analytics?timeRange=30d
Authorization: Bearer <jwt_token>
```

**Planned Response:**
```json
{
  "timeRange": "30d",
  "sales": {
    "totalOrders": 145,
    "totalRevenue": "12500.50",
    "avgOrderValue": "86.21",
    "conversionRate": 3.2
  },
  "products": [
    {
      "productId": "prod_abc",
      "name": "Produto A",
      "views": 1200,
      "cartAdds": 85,
      "purchases": 42,
      "revenue": "3500.00"
    }
  ],
  "traffic": {
    "uniqueVisitors": 3800,
    "pageViews": 12500,
    "bounceRate": 45.2
  }
}
```

## 3. Get Product Analytics (Future - Not Implemented)
**`GET /api/products/:productId/analytics`** (Auth required, Product owner only)

```http
GET /api/products/prod_123/analytics?timeRange=30d
```

**Planned Response:**
```json
{
  "timeRange": "30d",
  "performance": {
    "views": 850,
    "uniqueViews": 620,
    "cartAdds": 45,
    "purchases": 18,
    "conversionRate": 2.9
  },
  "revenue": "1250.00",
  "avgRating": 4.7,
  "reviewCount": 12
}
```

## 4. Get Delivery Analytics (Future - Not Implemented)
**`GET /api/delivery/:deliveryPersonId/analytics`** (Auth required, Delivery person only)

```http
GET /api/delivery/deliv_123/analytics?timeRange=30d
```

**Planned Response:**
```json
{
  "timeRange": "30d",
  "performance": {
    "totalDeliveries": 85,
    "successRate": 97.6,
    "avgDeliveryTime": "28 minutes",
    "onTimeRate": 94.1
  },
  "earnings": "850.00",
  "rating": 4.8,
  "reviewCount": 45
}
```

## 5. Get P2P Analytics (Future - Not Implemented)
**`GET /api/p2p/analytics`** (Auth required)

```http
GET /api/p2p/analytics?timeRange=30d
```

**Planned Response:**
```json
{
  "timeRange": "30d",
  "trading": {
    "totalTrades": 12,
    "volume": "5000.00",
    "avgTradeSize": "416.67",
    "successRate": 100.0
  },
  "offers": {
    "activeOffers": 3,
    "completedOffers": 9,
    "canceledOffers": 0
  }
}
```

## 6. Get Platform Analytics (Future - Admin only)
**`GET /api/admin/platform/analytics`** (Auth required, Admin role)

```http
GET /api/admin/platform/analytics?timeRange=30d
```

**Planned Response:**
```json
{
  "timeRange": "30d",
  "users": {
    "totalUsers": 15000,
    "newUsers": 850,
    "activeUsers": 4200,
    "retentionRate": 68.5
  },
  "marketplace": {
    "totalOrders": 3500,
    "gmv": "250000.00",
    "avgOrderValue": "71.43"
  },
  "engagement": {
    "totalPosts": 12000,
    "totalLikes": 85000,
    "totalComments": 32000
  }
}
```

**Status:** ✅ API #1 Implemented | ⏳ APIs #2-6 Planned
