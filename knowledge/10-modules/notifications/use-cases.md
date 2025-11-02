# Notifications Module - Use Cases

## UC-01: Receive Notification
1. System event occurs (ex: User followed)
2. Module emits event (UserFollowed)
3. Notification Service creates Notification record
4. Service emits via WebSocket (if user online)
5. User receives notification in real-time
6. UI shows badge count + notification item

## UC-02: View Notifications List
1. User clicks notification bell
2. Client requests `GET /api/notifications`
3. Server returns unread + recent read (50 items)
4. User sees list with:
   - Type icon
   - Actor (who triggered)
   - Message
   - Timestamp
   - Read/unread status

## UC-03: Mark as Read
1. User clicks notification item
2. Client sends `PUT /api/notifications/:id/read`
3. Server updates read=true
4. Server returns updated notification
5. UI removes unread badge

## UC-04: Mark All as Read
1. User clicks "Mark all as read"
2. Client sends `PUT /api/notifications/read-all`
3. Server updates all unread to read
4. Badge count goes to 0

## UC-05: Delete Notification
1. User swipes/clicks delete
2. Client sends `DELETE /api/notifications/:id`
3. Server deletes notification
4. Notification removed from list

## UC-06: Filter Notifications
1. User selects filter (FOLLOW, LIKE, etc.)
2. Client requests `GET /api/notifications?type=FOLLOW`
3. Server returns filtered list
4. User sees only FOLLOW notifications

**Status:** ✅ Implemented
