# Vesting Module - Use Cases

## UC-01: View Vesting Schedule
1. User navigates to `/app/vesting`
2. Client requests `GET /api/vesting/:account`
3. System queries Substrate Vesting pallet
4. System returns schedule with locked, vested, unvested
5. User sees release progress

## UC-02: View Global Vesting Stats
1. User wants overview of all vesting
2. Client requests `GET /api/vesting/stats`
3. System aggregates all categories
4. System returns total allocated, vested, unvested
5. User sees platform vesting health

## UC-03: Claim Vested Tokens
1. User has vested tokens available
2. User clicks "Claim Vested"
3. Client constructs: `vesting.vest()`
4. User signs transaction
5. Vested tokens transferred to free balance

## UC-04: Check Specific Category
1. User wants to see Founders vesting
2. Client requests `GET /api/vesting/category/founders`
3. System returns founders schedule
4. User sees cliff, duration, vested %

**Status:** ✅ Implemented
