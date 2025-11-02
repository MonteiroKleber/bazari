# Social Module - Use Cases

## UC-01: Create Post
1. User types content
2. Client requests `POST /api/posts`
3. System creates Post (status: PUBLISHED)
4. Post appears in followers' feeds

## UC-02: View Feed
1. User navigates to `/app/feed`
2. Client requests `GET /api/posts/feed`
3. System returns posts from followed profiles
4. User sees timeline

## UC-03: Like Post
1. User clicks heart icon
2. Client requests `POST /api/posts/:id/like`
3. System creates PostLike
4. Like count updates

## UC-04: React to Post
1. User long-presses like button
2. User selects reaction (love, laugh, wow, sad, angry)
3. Client requests `POST /api/posts/:id/react`
4. System creates PostReaction

## UC-05: Comment on Post
1. User writes comment
2. Client requests `POST /api/posts/:id/comments`
3. System creates PostComment
4. Comment appears below post

## UC-06: Reply to Comment
1. User clicks reply on comment
2. User writes reply
3. Client requests `POST /api/comments/:id/reply`
4. System creates PostComment with parentId
5. Nested thread created

## UC-07: Repost
1. User clicks repost button
2. Client requests `POST /api/posts/:id/repost`
3. System creates PostRepost
4. Post appears in user's profile timeline

## UC-08: Delete Post
1. User clicks delete
2. Client requests `DELETE /api/posts/:id`
3. System updates status → REMOVED
4. Post hidden from feeds

**Status:** ✅ Implemented
