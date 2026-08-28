/**
 * payment-service.ts — Mock Payment Gateway + Idempotency (§18.1, §31 step 9)
 * Clearly labeled as "Demo gateway" in the UI — no real payment rails.
 * Idempotency key = hash(hold_id) prevents double-charges on retry.
 */

import { appendAuditEntry } from './audit-log';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'REFUNDED';

export interface PaymentRecord {
  paymentId: string;
  idempotencyKey: string;
  holdId: string;
  bookingAttemptId: string;
  amount: number;
  status: PaymentStatus;
  initiatedAt: number;
  settledAt?: number;
  refundedAt?: number;
  failureReason?: string;
}

// Stores previous payment attempts to enforce idempotency
const paymentRecords = new Map<string, PaymentRecord>();
// Admin-controlled failure injection flag
let nextPaymentFails = false;
let nextPaymentTimesOut = false;

let paymentCounter = 0;
function genPaymentId(): string {
  return `PAY-${Date.now()}-${++paymentCounter}`;
}

/** Admin trigger: force next payment to fail (§34.1) */
export function adminForceNextPaymentFail(): void {
  nextPaymentFails = true;
}

/** Admin trigger: force next payment to timeout (§34.1) */
export function adminForceNextPaymentTimeout(): void {
  nextPaymentTimesOut = true;
}

/**
 * Initiate payment — idempotent (§18.1)
 * If this idempotencyKey has been seen before, returns the original result.
 */
export async function initiatePayment(
  holdId: string,
  idempotencyKey: string,
  bookingAttemptId: string,
  amount: number
): Promise<PaymentRecord> {
  // Idempotency check: has this key been seen before?
  const existing = paymentRecords.get(idempotencyKey);
  if (existing) {
    appendAuditEntry(bookingAttemptId, 'system', 'payment_initiated',
      `Idempotency key matched — returning original result (no re-charge). Status: ${existing.status}`,
      { idempotencyKey, paymentId: existing.paymentId }
    );
    return existing; // Return original result, don't re-charge
  }

  const record: PaymentRecord = {
    paymentId: genPaymentId(),
    idempotencyKey,
    holdId,
    bookingAttemptId,
    amount,
    status: 'PENDING',
    initiatedAt: Date.now(),
  };

  paymentRecords.set(idempotencyKey, record);

  appendAuditEntry(bookingAttemptId, 'user', 'payment_initiated',
    `Payment of ₹${amount} initiated via demo gateway. Idempotency key: ${idempotencyKey}`,
    { amount, holdId }
  );

  // Simulate async payment processing
  await simulatePaymentProcessing(record, bookingAttemptId);

  return record;
}

async function simulatePaymentProcessing(
  record: PaymentRecord,
  bookingAttemptId: string
): Promise<void> {
  const shouldFail = nextPaymentFails;
  const shouldTimeout = nextPaymentTimesOut;

  // Reset flags
  nextPaymentFails = false;
  nextPaymentTimesOut = false;

  if (shouldTimeout) {
    // Simulate network timeout — uncertain outcome (§19 reconciliation case)
    await delay(3500);
    record.status = 'TIMEOUT';
    appendAuditEntry(bookingAttemptId, 'system', 'payment_failed',
      'Payment gateway timed out — outcome uncertain. Do NOT pay again. Reconciliation will determine ground truth.',
      { holdId: record.holdId }
    );
    return;
  }

  await delay(2000); // Simulate bank processing time

  if (shouldFail) {
    record.status = 'FAILED';
    record.failureReason = 'Insufficient funds (simulated failure)';
    record.settledAt = Date.now();
    appendAuditEntry(bookingAttemptId, 'system', 'payment_failed',
      `Payment failed: ${record.failureReason}. Hold remains active — retry with same idempotency key.`,
      { holdId: record.holdId }
    );
  } else {
    record.status = 'SUCCESS';
    record.settledAt = Date.now();
    appendAuditEntry(bookingAttemptId, 'system', 'payment_succeeded',
      `Payment of ₹${record.amount} confirmed by demo gateway.`,
      { paymentId: record.paymentId }
    );
  }
}

/** Initiate a refund for a payment */
export async function initiateRefund(
  paymentId: string,
  amount: number,
  reason: string,
  bookingAttemptId: string
): Promise<boolean> {
  const record = Array.from(paymentRecords.values()).find(r => r.paymentId === paymentId);
  if (!record || record.status !== 'SUCCESS') return false;

  await delay(1000);
  record.status = 'REFUNDED';
  record.refundedAt = Date.now();

  appendAuditEntry(bookingAttemptId, 'system', 'refund_initiated',
    `Refund of ₹${amount} initiated. Reason: ${reason}. Will credit to source within 3-5 business days (simulated).`,
    { paymentId, amount }
  );

  return true;
}

export function getPaymentRecord(idempotencyKey: string): PaymentRecord | undefined {
  return paymentRecords.get(idempotencyKey);
}

export function getAllPayments(): PaymentRecord[] {
  return Array.from(paymentRecords.values());
}

/** Calculate per-segment refund (§21.1) */
export function calculateSegmentRefund(
  baseFare: number,
  hoursBeforeDeparture: number
): { refundAmount: number; cancellationCharge: number; breakdown: string } {
  let chargePercent = 0;
  let rule = '';

  if (hoursBeforeDeparture >= 48) {
    chargePercent = 5;
    rule = 'Cancel >48h before departure';
  } else if (hoursBeforeDeparture >= 24) {
    chargePercent = 25;
    rule = 'Cancel 24–48h before departure';
  } else if (hoursBeforeDeparture >= 12) {
    chargePercent = 50;
    rule = 'Cancel 12–24h before departure';
  } else {
    chargePercent = 75;
    rule = 'Cancel <12h before departure';
  }

  const charge = Math.round((baseFare * chargePercent) / 100);
  const refund = baseFare - charge;

  return {
    refundAmount: refund,
    cancellationCharge: charge,
    breakdown: `${rule}: ${chargePercent}% cancellation charge (₹${charge}) on ₹${baseFare} fare → refund ₹${refund}`,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
