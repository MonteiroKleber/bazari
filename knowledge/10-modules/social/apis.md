# Social Module - API Reference

## 1. Create Post
**`POST /api/posts`** (Auth required)

```http
POST /api/posts
{
  "kind": "text",
  "content": "Hello Bazari community! 🚀",
  "media": []
}
```

## 2. Get Feed
**`GET /api/posts/feed`** (Auth required)

```http
GET /api/posts/feed?limit=20&cursor=eyJ...
```

Returns posts from followed profiles.

## 3. Like Post
**`POST /api/posts/:id/like`** (Auth required)

```http
POST /api/posts/abc123/like
```

## 4. React to Post
**`POST /api/posts/:id/react`** (Auth required)

```http
POST /api/posts/abc123/react
{
  "reaction": "love"
}
```

Reactions: `love`, `laugh`, `wow`, `sad`, `angry`

## 5. Comment on Post
**`POST /api/posts/:id/comments`** (Auth required)

```http
POST /api/posts/abc123/comments
{
  "content": "Great post!"
}
```

## 6. Reply to Comment
**`POST /api/comments/:id/reply`** (Auth required)

```http
POST /api/comments/comment123/reply
{
  "content": "I agree!"
}
```

## 7. Repost
**`POST /api/posts/:id/repost`** (Auth required)

```http
POST /api/posts/abc123/repost
```

## 8. Delete Post
**`DELETE /api/posts/:id`** (Auth required)

```http
DELETE /api/posts/abc123
```

**Status:** ✅ Implemented
