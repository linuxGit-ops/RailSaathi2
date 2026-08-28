/**
 * audit-log.ts — Structured AI Decision Audit Log (§20)
 * Every AI-agent action affecting booking state is logged here.
 * Exposed to the user as a timeline ("Why did my agent do that?")
 */

export type Actor = 'user' | 'ai_agent' | 'system';

export type AuditAction =
  | 'goal_parsed'
  | 'queue_joined'
  | 'offer_evaluated'
  | 'offer_accepted'
  | 'offer_declined'
  | 'offer_timeout'
  | 'hold_created'
  | 'hold_expired'
  | 'hold_released'
  | 'payment_initiated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'booking_confirmed'
  | 'booking_failed'
  | 'refund_initiated'
  | 'search_expanded'
  | 'alternative_offered'
  | 'disruption_detected'
  | 'session_resumed';

export interface AuditEntry {
  eventId: string;
  bookingAttemptId: string;
  actor: Actor;
  action: AuditAction;
  reason: string;
  metadata?: Record<string, unknown>;
  timestamp: number; // Unix ms
}

// In-memory log — persists for the session
const log: AuditEntry[] = [];
let counter = 0;

function genId(): string {
  return `EVT-${Date.now()}-${++counter}`;
}

export function appendAuditEntry(
  bookingAttemptId: string,
  actor: Actor,
  action: AuditAction,
  reason: string,
  metadata?: Record<string, unknown>
): AuditEntry {
  const entry: AuditEntry = {
    eventId: genId(),
    bookingAttemptId,
    actor,
    action,
    reason,
    metadata,
    timestamp: Date.now(),
  };
  log.push(entry);
  return entry;
}

export function getAuditLog(bookingAttemptId?: string): AuditEntry[] {
  if (!bookingAttemptId) return [...log];
  return log.filter(e => e.bookingAttemptId === bookingAttemptId);
}

export function clearAuditLog(): void {
  log.length = 0;
}

export function formatAuditTimestamp(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const ACTION_LABELS: Record<AuditAction, string> = {
  goal_parsed:        'Goal parsed from natural language',
  queue_joined:       'Joined virtual waiting room',
  offer_evaluated:    'Seat offer evaluated',
  offer_accepted:     'Seat offer accepted',
  offer_declined:     'Seat offer declined',
  offer_timeout:      'Offer timed out (2 minutes)',
  hold_created:       '10-minute hold placed on seat',
  hold_expired:       'Hold expired — seat released',
  hold_released:      'Hold released by user or system',
  payment_initiated:  'Payment initiated',
  payment_succeeded:  'Payment confirmed by gateway',
  payment_failed:     'Payment failed — hold preserved',
  booking_confirmed:  'Booking confirmed (HELD → BOOKED)',
  booking_failed:     'Booking failed — refund initiated',
  refund_initiated:   'Refund process started',
  search_expanded:    'Search criteria expanded by AI',
  alternative_offered:'Alternative train offered',
  disruption_detected:'Train disruption detected',
  session_resumed:    'Booking session resumed after reconnect',
};

export const ACTOR_LABELS: Record<Actor, string> = {
  user:     'You',
  ai_agent: 'AI Agent',
  system:   'System',
};
