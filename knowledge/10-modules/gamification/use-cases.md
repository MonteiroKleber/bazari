# Gamification Module - Use Cases

## UC-01: View Active Missions
1. User opens missions tab
2. Client requests `GET /api/missions`
3. System returns active missions with rewards
4. User sees available tasks

## UC-02: Complete Mission
1. User performs task (share, review, referral)
2. System tracks progress in ChatMissionCompletion
3. When goal reached → mission completed
4. BZR reward sent to wallet
5. Achievement unlocked notification

## UC-03: Earn Trust Badge
1. User completes 50th successful trade
2. System evaluates reputation
3. System issues ChatTrustBadge (Silver level)
4. Badge displayed on profile
5. User gains trading privileges

## UC-04: View Leaderboard
1. User navigates to `/app/leaderboard`
2. Client requests `GET /api/leaderboard?type=sellers`
3. System returns top 100 sellers by volume
4. User sees ranking and stats

## UC-05: Create Custom Mission (Store Owner)
1. Store owner wants to incentivize reviews
2. Owner creates mission: "Write 5 reviews, earn 10 BZR"
3. System creates ChatMission
4. Mission visible to customers

**Status:** ✅ Implemented
