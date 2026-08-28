/**
 * queue-service.ts — Virtual Waiting Room + Burst Admission Control (§12)
 * Steady demand: standard FIFO virtual queue
 * Synchronized burst (Tatkal): lobby → randomized batch release (§12.2)
 * Abuse guards: CAPTCHA gate, abandonment tracking (§12.3)
 */

import { appendAuditEntry } from './audit-log';

export type QueueMode = 'STEADY' | 'BURST_LOBBY' | 'BURST_RELEASING';

export interface QueueEntry {
  userId: string;
  bookingAttemptId: string;
  joinedAt: number;
  position: number;
  estimatedWaitSecs: number;
  captchaPassed: boolean;
  abandonmentCount: number;
  penaltyUntil?: number; // timestamp ms — deprioritized until
  goal: QueueGoal;
}

export interface QueueGoal {
  fromCode: string;
  toCode: string;
  date: string;
  classCode: string;
  passengers: number;
  fulfillmentMode: 'ALL_OR_NOTHING' | 'PARTIAL_WITH_CONSENT';
}

export interface QueueState {
  mode: QueueMode;
  totalInQueue: number;
  myPosition: number;
  estimatedWaitSecs: number;
  lobbyCountdown?: number; // seconds until burst releases
}

// In-memory queue
const queue: QueueEntry[] = [];
let queueMode: QueueMode = 'STEADY';
let virtualUsersCount = 0;          // simulated concurrent users
const PENALTY_THRESHOLD = 3;        // abandonments before deprioritization
const PENALTY_DURATION_MS = 5 * 60 * 1000; // 5-minute deprioritization

// Simulated virtual concurrent users (for demo realism §31 step 3)
let virtualSim: ReturnType<typeof setInterval> | null = null;

/** Add virtual concurrent users to simulate real load */
export function startVirtualConcurrency(userCount: number): void {
  virtualUsersCount = userCount;
}

/** Join the virtual waiting room */
export function joinQueue(
  userId: string,
  bookingAttemptId: string,
  goal: QueueGoal,
  captchaPassed: boolean
): QueueEntry {
  // Check for existing entry (one-active-offer-per-account rule §12.3)
  const existing = queue.find(e => e.userId === userId);
  if (existing) return existing;

  // Check penalty
  const penaltyUntil = getPenaltyUntil(userId);
  const isDeprioritized = penaltyUntil !== undefined && Date.now() < penaltyUntil;

  // Compute position (deprioritized go to end)
  const basePosition = queue.filter(e => !isDeprioritized || e.penaltyUntil === undefined).length;
  const position = isDeprioritized ? queue.length + virtualUsersCount + 1 : basePosition + virtualUsersCount;

  const entry: QueueEntry = {
    userId,
    bookingAttemptId,
    joinedAt: Date.now(),
    position,
    estimatedWaitSecs: position * 45,
    captchaPassed,
    abandonmentCount: getAbandonmentCount(userId),
    penaltyUntil: isDeprioritized ? penaltyUntil : undefined,
    goal,
  };

  queue.push(entry);

  appendAuditEntry(bookingAttemptId, 'user', 'queue_joined',
    `Joined virtual waiting room at position ${position}${isDeprioritized ? ' (deprioritized due to prior abandonment)' : ''}`,
    { position, mode: queueMode, captchaPassed }
  );

  return entry;
}

/** Get current queue state for a user */
export function getQueueState(userId: string): QueueState | null {
  const entry = queue.find(e => e.userId === userId);
  if (!entry) return null;

  // Simulate queue movement (position decreases over time)
  const elapsed = (Date.now() - entry.joinedAt) / 1000;
  const currentPosition = Math.max(1, entry.position - Math.floor(elapsed / 30));

  return {
    mode: queueMode,
    totalInQueue: queue.length + virtualUsersCount,
    myPosition: currentPosition,
    estimatedWaitSecs: currentPosition * 40,
  };
}

/** Remove from queue (after offer received or cancelled) */
export function leaveQueue(userId: string): void {
  const idx = queue.findIndex(e => e.userId === userId);
  if (idx !== -1) queue.splice(idx, 1);
}

/** Record an abandonment (offer accepted but hold not paid — §12.3) */
const abandonmentCounts = new Map<string, number>();
const penaltyMap = new Map<string, number>();

export function recordAbandonment(userId: string): void {
  const count = (abandonmentCounts.get(userId) ?? 0) + 1;
  abandonmentCounts.set(userId, count);
  if (count >= PENALTY_THRESHOLD) {
    penaltyMap.set(userId, Date.now() + PENALTY_DURATION_MS);
  }
}

function getAbandonmentCount(userId: string): number {
  return abandonmentCounts.get(userId) ?? 0;
}

function getPenaltyUntil(userId: string): number | undefined {
  return penaltyMap.get(userId);
}

/**
 * Tatkal burst mode — lobby + randomized batch release (§12.2)
 * Opens a lobby window, then shuffles all lobby entrants into random order
 * before releasing into the regular queue in fixed-size waves.
 */
const lobbyEntrants: Array<{ userId: string; bookingAttemptId: string; goal: QueueGoal }> = [];

export function openTatkalLobby(): void {
  queueMode = 'BURST_LOBBY';
}

export function joinTatkalLobby(
  userId: string,
  bookingAttemptId: string,
  goal: QueueGoal
): void {
  if (!lobbyEntrants.find(e => e.userId === userId)) {
    lobbyEntrants.push({ userId, bookingAttemptId, goal });
  }
}

export function releaseTatkalLobby(): void {
  queueMode = 'BURST_RELEASING';
  // Shuffle (§12.2: randomized, not strict arrival-order)
  for (let i = lobbyEntrants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lobbyEntrants[i], lobbyEntrants[j]] = [lobbyEntrants[j], lobbyEntrants[i]];
  }
  // Release in fixed-size waves of 5
  const WAVE_SIZE = 5;
  let waveIndex = 0;
  const releaseWave = setInterval(() => {
    const batch = lobbyEntrants.slice(waveIndex, waveIndex + WAVE_SIZE);
    batch.forEach(({ userId, bookingAttemptId, goal }) => {
      joinQueue(userId, bookingAttemptId, goal, true);
    });
    waveIndex += WAVE_SIZE;
    if (waveIndex >= lobbyEntrants.length) {
      clearInterval(releaseWave);
      queueMode = 'STEADY';
      lobbyEntrants.length = 0;
    }
  }, 2000);
}

export function simulateTatkalBurst(count: number): void {
  openTatkalLobby();
  virtualUsersCount = count;
  // Auto-release after 3s (simulates T=0)
  setTimeout(() => releaseTatkalLobby(), 3000);
}

export function getQueueMode(): QueueMode {
  return queueMode;
}

export function getAllQueueEntries(): QueueEntry[] {
  return [...queue];
}

export function resetQueue(): void {
  queue.length = 0;
  virtualUsersCount = 0;
  queueMode = 'STEADY';
  if (virtualSim) { clearInterval(virtualSim); virtualSim = null; }
}
