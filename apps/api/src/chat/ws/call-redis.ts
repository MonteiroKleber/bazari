/**
 * Redis-based pending call storage for offline users
 * Allows calls to be recovered when user reconnects after receiving push notification
 */

import { connection as redis } from '../../lib/queue.js';
import type { CallType } from '@bazari/shared-types';

// TTL for pending calls (90 seconds - matches RING_TIMEOUT)
const PENDING_CALL_TTL = 90;

// Key prefix for pending calls
const PENDING_CALL_PREFIX = 'call:pending:';

export interface PendingCallData {
  callId: string;
  threadId: string;
  callerId: string;
  calleeId: string;
  type: CallType;
  sdp: string;
  caller: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  createdAt: number;
}

/**
 * Save a pending call to Redis for a specific callee
 * This allows the call to be recovered when the callee reconnects
 */
export async function savePendingCall(
  calleeId: string,
  data: PendingCallData
): Promise<void> {
  const key = `${PENDING_CALL_PREFIX}${calleeId}`;

  try {
    await redis.setex(key, PENDING_CALL_TTL, JSON.stringify(data));
    console.log('[CallRedis] Saved pending call:', { calleeId, callId: data.callId, ttl: PENDING_CALL_TTL });
  } catch (error) {
    console.error('[CallRedis] Error saving pending call:', error);
    throw error;
  }
}

/**
 * Get pending call for a callee (if exists and not expired)
 */
export async function getPendingCall(calleeId: string): Promise<PendingCallData | null> {
  const key = `${PENDING_CALL_PREFIX}${calleeId}`;

  try {
    const data = await redis.get(key);
    if (!data) {
      return null;
    }

    const pendingCall = JSON.parse(data) as PendingCallData;
    console.log('[CallRedis] Found pending call:', { calleeId, callId: pendingCall.callId });
    return pendingCall;
  } catch (error) {
    console.error('[CallRedis] Error getting pending call:', error);
    return null;
  }
}

/**
 * Delete pending call (when answered, rejected, or timed out)
 */
export async function deletePendingCall(calleeId: string): Promise<void> {
  const key = `${PENDING_CALL_PREFIX}${calleeId}`;

  try {
    await redis.del(key);
    console.log('[CallRedis] Deleted pending call for:', calleeId);
  } catch (error) {
    console.error('[CallRedis] Error deleting pending call:', error);
  }
}

/**
 * Check if a pending call exists for a callee
 */
export async function hasPendingCall(calleeId: string): Promise<boolean> {
  const key = `${PENDING_CALL_PREFIX}${calleeId}`;

  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('[CallRedis] Error checking pending call:', error);
    return false;
  }
}

/**
 * Get TTL remaining for a pending call
 */
export async function getPendingCallTTL(calleeId: string): Promise<number> {
  const key = `${PENDING_CALL_PREFIX}${calleeId}`;

  try {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  } catch (error) {
    console.error('[CallRedis] Error getting pending call TTL:', error);
    return 0;
  }
}
