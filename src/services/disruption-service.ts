/**
 * disruption-service.ts — TrainDisruption Event Cascade (§22)
 * "Turns a previously-unhandled failure mode into a first-class event type,
 *  reusing services that already exist (Refund, Notification, AI Agent)."
 */

import { appendAuditEntry } from './audit-log';

export type DisruptionType = 'CANCELLED' | 'RESCHEDULED' | 'TRUNCATED';

export interface TrainDisruption {
  disruptionId: string;
  trainNumber: string;
  serviceDate: string;
  type: DisruptionType;
  description: string;
  triggeredAt: number;
  affectedBookingIds: string[];
}

export interface DisruptionCascadeResult {
  disruption: TrainDisruption;
  scheduleCacheInvalidated: boolean;
  refundsInitiated: number;
  notificationsSent: number;
  alternativesOffered: boolean;
}

let disruptionCounter = 0;
const activeDisruptions: TrainDisruption[] = [];

// Subscribers for real-time notification (§24)
type DisruptionCallback = (disruption: TrainDisruption) => void;
const subscribers: DisruptionCallback[] = [];

export function subscribeToDisruptions(cb: DisruptionCallback): () => void {
  subscribers.push(cb);
  return () => {
    const idx = subscribers.indexOf(cb);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

function notifySubscribers(disruption: TrainDisruption): void {
  subscribers.forEach(cb => cb(disruption));
}

/**
 * Fire a TrainDisruption event — triggers the full cascade (§22):
 *   1. Schedule cache invalidation
 *   2. Mass refund initiation
 *   3. Passenger notifications
 *   4. AI proactive alternative search
 */
export async function fireTrainDisruption(
  trainNumber: string,
  serviceDate: string,
  type: DisruptionType,
  affectedBookingIds: string[],
  triggerBookingAttemptId: string
): Promise<DisruptionCascadeResult> {
  const disruptionId = `DISR-${Date.now()}-${++disruptionCounter}`;

  const disruption: TrainDisruption = {
    disruptionId,
    trainNumber,
    serviceDate,
    type,
    description: getDisruptionDescription(type, trainNumber, serviceDate),
    triggeredAt: Date.now(),
    affectedBookingIds,
  };

  activeDisruptions.push(disruption);

  appendAuditEntry(triggerBookingAttemptId, 'system', 'disruption_detected',
    `${type} event fired for train ${trainNumber} on ${serviceDate}. Cascade starting.`,
    { disruptionId, affectedCount: affectedBookingIds.length }
  );

  // Step 1: Schedule cache invalidation (simulated)
  await simulateDelay(200);
  console.log(`[ScheduleCache] Invalidated entries for ${trainNumber}/${serviceDate}`);

  // Step 2: Initiate refunds for all affected bookings
  await simulateDelay(300);
  const refundsInitiated = affectedBookingIds.length;

  // Step 3: Send notifications
  await simulateDelay(100);
  const notificationsSent = affectedBookingIds.length;

  // Step 4: AI agent proactively offers alternatives
  await simulateDelay(150);
  const alternativesOffered = type === 'CANCELLED';

  // Notify all UI subscribers (real-time fan-out §24)
  notifySubscribers(disruption);

  return {
    disruption,
    scheduleCacheInvalidated: true,
    refundsInitiated,
    notificationsSent,
    alternativesOffered,
  };
}

function getDisruptionDescription(
  type: DisruptionType,
  trainNumber: string,
  date: string
): string {
  switch (type) {
    case 'CANCELLED':
      return `Train ${trainNumber} on ${date} has been cancelled due to operational reasons. Full refund will be processed automatically.`;
    case 'RESCHEDULED':
      return `Train ${trainNumber} on ${date} has been rescheduled. New departure time will be communicated.`;
    case 'TRUNCATED':
      return `Train ${trainNumber} on ${date} route has been truncated. Passengers beyond the new terminus will be refunded for unserved segments.`;
  }
}

export function getActiveDisruptions(): TrainDisruption[] {
  return [...activeDisruptions];
}

export function clearDisruptions(): void {
  activeDisruptions.length = 0;
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
