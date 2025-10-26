/**
 * PIN Attempt Limiter
 * Prevents brute-force attacks by locking after too many failed attempts
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'bazari_pin_attempts';

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

function getAttemptRecord(): AttemptRecord {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { count: 0, lockedUntil: null };
    }
    return JSON.parse(stored);
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function saveAttemptRecord(record: AttemptRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.error('Failed to save attempt record:', err);
  }
}

export function isLocked(): boolean {
  const record = getAttemptRecord();
  if (!record.lockedUntil) return false;

  const now = Date.now();
  if (now < record.lockedUntil) {
    return true;
  }

  // Lockout expired, reset
  saveAttemptRecord({ count: 0, lockedUntil: null });
  return false;
}

export function getRemainingLockoutTime(): number {
  const record = getAttemptRecord();
  if (!record.lockedUntil) return 0;

  const now = Date.now();
  const remaining = record.lockedUntil - now;
  return remaining > 0 ? remaining : 0;
}

export function recordFailedAttempt(): void {
  const record = getAttemptRecord();
  const newCount = record.count + 1;

  if (newCount >= MAX_ATTEMPTS) {
    // Lock the account
    saveAttemptRecord({
      count: newCount,
      lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
    });
  } else {
    saveAttemptRecord({
      count: newCount,
      lockedUntil: null,
    });
  }
}

export function resetAttempts(): void {
  saveAttemptRecord({ count: 0, lockedUntil: null });
}

export function getAttemptsRemaining(): number {
  const record = getAttemptRecord();
  return Math.max(0, MAX_ATTEMPTS - record.count);
}

export function formatLockoutTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}
