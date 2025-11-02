# Gamification Module - API Reference

## 1. Get Active Missions
**`GET /api/chat/missions`** (Public)

```http
GET /api/chat/missions?status=active
```

## 2. Complete Mission
**`POST /api/chat/missions/:id/complete`** (Auth required)

```http
POST /api/chat/missions/mission123/complete
{
  "proof": {
    "type": "review",
    "reviewId": "review_abc"
  }
}
```

## 3. Get User Badges
**`GET /api/profile/:handle/badges`** (Public)

```http
GET /api/profile/@alice/badges
```

## 4. Get Leaderboard
**`GET /api/leaderboard`** (Public)

```http
GET /api/leaderboard?type=sellers&period=30d&limit=100
```

Types: `sellers`, `buyers`, `affiliates`, `reputation`

**Status:** ✅ Implemented (APIs distributed across chat/profile modules)
