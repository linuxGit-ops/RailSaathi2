/**
 * hold-service.ts — TTL Hold + Expiry simulation (§10)
 * Two overlapping mechanisms:
 *   (a) Event-driven: simulated via setTimeout (mirrors Redis TTL keyspace events)
 *   (b) Reconciliation sweep: setInterval polls for stale holds (safety net)
 *
 * Also implements the atomic compare-and-set for confirm vs. expire race (§11).
 */

import { appendAuditEntry } from './audit-log';

export const HOLD_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OFFER_TTL_MS = 2 * 60 * 1000;  // 2 minutes
const RECONCILIATION_INTERVAL_MS = 5000;    // sweep every 5s

export interface Hold {
  holdId: string;
  bookingAttemptId: string;
  seatIds: string[];
  segmentIds: string[];
  createdAt: number;   // Unix ms
  expiresAt: number;   // Unix ms
  status: 'ACTIVE' | 'EXPIRED' | 'CONFIRMED' | 'RELEASED';
  idempotencyKey: string;
}

type ExpireCallback = (holdId: string) => void;

const holds = new Map<string, Hold>();
const expireCallbacks: ExpireCallback[] = [];
let sweepInterval: ReturnType<typeof setInterval> | null = null;
let holdCounter = 0;

function genHoldId(): string {
  return `HOLD-${Date.now()}-${++holdCounter}`;
}

function genIdempotencyKey(holdId: string): string {
  // §18.1: idempotency key derived from hold_id
  return `IDEM-${holdId}`;
}

/** Register a callback that fires when any hold expires */
export function onHoldExpired(cb: ExpireCallback): void {
  expireCallbacks.push(cb);
}

function notifyExpired(holdId: string): void {
  expireCallbacks.forEach(cb => cb(holdId));
}

/** Create a new hold (§9: simulates atomic multi-row transaction) */
export function createHold(
  bookingAttemptId: string,
  seatIds: string[],
  segmentIds: string[],
  forceExpireSoon?: boolean // admin demo trigger — expire in 5s
): Hold {
  const holdId = genHoldId();
  const now = Date.now();
  const ttl = forceExpireSoon ? 5000 : HOLD_TTL_MS;

  const hold: Hold = {
    holdId,
    bookingAttemptId,
    seatIds,
    segmentIds,
    createdAt: now,
    expiresAt: now + ttl,
    status: 'ACTIVE',
    idempotencyKey: genIdempotencyKey(holdId),
  };

  holds.set(holdId, hold);

  // (a) Event-driven expiry: setTimeout simulates Redis TTL keyspace notification
  setTimeout(() => {
    const h = holds.get(holdId);
    if (h && h.status === 'ACTIVE') {
      h.status = 'EXPIRED';
      appendAuditEntry(bookingAttemptId, 'system', 'hold_expired',
        'Hold TTL elapsed — seat released automatically by event-driven expiry');
      notifyExpired(holdId);
    }
  }, ttl);

  return hold;
}

/** Get hold by ID */
export function getHold(holdId: string): Hold | undefined {
  return holds.get(holdId);
}

/** Get remaining milliseconds on a hold */
export function getHoldRemaining(holdId: string): number {
  const h = holds.get(holdId);
  if (!h || h.status !== 'ACTIVE') return 0;
  return Math.max(0, h.expiresAt - Date.now());
}

/**
 * Atomic compare-and-set: confirm a hold → BOOKED (§11)
 * Returns true if confirmation succeeded, false if hold already expired/released.
 * This is the mechanism that makes confirm and expire mutually exclusive.
 */
export function confirmHold(holdId: string): boolean {
  const h = holds.get(holdId);
  if (!h || h.status !== 'ACTIVE') {
    // 0 rows updated — hold already expired/released
    return false;
  }
  // Atomic: change status to CONFIRMED (simulates DB UPDATE WHERE hold_id=X AND status='HELD')
  h.status = 'CONFIRMED';
  return true;
}

/** Release a hold (user cancelled or offer declined) */
export function releaseHold(holdId: string): void {
  const h = holds.get(holdId);
  if (h && h.status === 'ACTIVE') {
    h.status = 'RELEASED';
  }
}

/** Force-expire a hold immediately (admin demo trigger §34.1) */
export function forceExpireHold(holdId: string): void {
  const h = holds.get(holdId);
  if (h && h.status === 'ACTIVE') {
    h.status = 'EXPIRED';
    appendAuditEntry(h.bookingAttemptId, 'system', 'hold_expired',
      'Hold force-expired via admin demo trigger');
    notifyExpired(holdId);
  }
}

/** Get all holds (for admin dashboard) */
export function getAllHolds(): Hold[] {
  return Array.from(holds.values());
}

/**
 * (b) Reconciliation sweep — safety net that catches any hold the
 * event-driven path missed (§10: "so neither failing alone causes phantom holds")
 */
export function startReconciliationSweep(): void {
  if (sweepInterval !== null) return;
  sweepInterval = setInterval(() => {
    const now = Date.now();
    holds.forEach((hold, holdId) => {
      if (hold.status === 'ACTIVE' && hold.expiresAt < now) {
        hold.status = 'EXPIRED';
        appendAuditEntry(hold.bookingAttemptId, 'system', 'hold_expired',
          'Reconciliation sweep caught stale hold — released as safety net');
        notifyExpired(holdId);
      }
    });
  }, RECONCILIATION_INTERVAL_MS);
}

export function stopReconciliationSweep(): void {
  if (sweepInterval !== null) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
}
