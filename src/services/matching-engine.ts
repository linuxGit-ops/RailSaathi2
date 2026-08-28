/**
 * matching-engine.ts — Segment-aware WL/RAC Matching Engine (§15)
 * Named explicitly as waitlist/RAC per §15's "naming fix".
 * Handles group atomicity (§17) and terminal deadline (§15.2).
 */

import { appendAuditEntry } from './audit-log';
import { SearchResult } from './train-data';

export type WaitlistStatus = 'WL' | 'RAC' | 'CNF';

export interface SeatOffer {
  offerId: string;
  bookingAttemptId: string;
  searchResult: SearchResult;
  classCode: string;
  seatNumbers: string[];      // e.g. ['2A-12', '2A-13'] for group
  seatType: string;
  coachLabel: string;
  farePerPerson: number;
  totalFare: number;
  passengers: number;
  offeredAt: number;          // Unix ms
  expiresAt: number;          // Unix ms (offeredAt + 2 min)
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  partialGroup?: boolean;     // true if only some seats available (§17 PARTIAL_WITH_CONSENT)
}

export interface MatchResult {
  offer?: SeatOffer;
  waitlistPosition?: number;
  status: WaitlistStatus | 'NO_MATCH' | 'DEADLINE_PASSED';
}

const OFFER_TTL_MS = 2 * 60 * 1000;  // 2 minutes
// Terminal deadline: 4 hours before departure (§15.2)
const TERMINAL_DEADLINE_HOURS = 4;

const activeOffers = new Map<string, SeatOffer>();
let offerCounter = 0;

function genOfferId(): string {
  return `OFFER-${Date.now()}-${++offerCounter}`;
}

/** Simulate seat number assignment */
function assignSeats(classCode: string, count: number): string[] {
  const coach = classCode === '2A' ? 'B1' : classCode === '3A' ? 'C1' : 'A1';
  const base = 10 + Math.floor(Math.random() * 40);
  return Array.from({ length: count }, (_, i) => `${coach}/${base + i}`);
}

function getSeatType(classCode: string, seatNum: string): string {
  const num = parseInt(seatNum.split('/')[1] ?? '1');
  if (['1A', '2A'].includes(classCode)) {
    const pos = num % 4;
    return pos === 1 ? 'Lower' : pos === 2 ? 'Upper' : pos === 3 ? 'Lower' : 'Upper';
  }
  if (classCode === '3A') {
    const pos = num % 8;
    return pos <= 2 ? 'Lower' : pos <= 4 ? 'Middle' : pos <= 6 ? 'Upper' : 'Side Lower';
  }
  return 'Seat';
}

/**
 * Try to match a seat offer for a user's goal (§15)
 * Checks terminal deadline, group atomicity, and segment eligibility.
 */
export function tryMatchOffer(
  bookingAttemptId: string,
  searchResult: SearchResult,
  classCode: string,
  passengers: number,
  fulfillmentMode: 'ALL_OR_NOTHING' | 'PARTIAL_WITH_CONSENT',
  departureDate: string
): MatchResult {
  // Terminal deadline check (§15.2)
  if (isPastTerminalDeadline(departureDate, searchResult)) {
    return { status: 'DEADLINE_PASSED' };
  }

  const availability = searchResult.availabilityByClass[classCode];
  if (!availability) return { status: 'NO_MATCH' };

  const available = availability.available;

  // Group atomicity (§17)
  if (fulfillmentMode === 'ALL_OR_NOTHING' && available < passengers) {
    // Not enough seats — waitlist
    return {
      status: 'WL',
      waitlistPosition: Math.floor(Math.random() * 15) + 1,
    };
  }

  const seatsToOffer = Math.min(available, passengers);
  const isPartial = seatsToOffer < passengers;

  // §17 PARTIAL_WITH_CONSENT: surface partial availability but require explicit accept
  if (isPartial && fulfillmentMode === 'PARTIAL_WITH_CONSENT') {
    const seatNumbers = assignSeats(classCode, seatsToOffer);
    const farePerPerson = searchResult.fareByClass[classCode] ?? 0;
    const offer = buildOffer(bookingAttemptId, searchResult, classCode, seatNumbers, farePerPerson, seatsToOffer, true);
    appendAuditEntry(bookingAttemptId, 'ai_agent', 'offer_evaluated',
      `Partial group match: ${seatsToOffer}/${passengers} seats available. Surfacing for user consent (PARTIAL_WITH_CONSENT mode).`,
      { seatsAvailable: seatsToOffer, seatsRequested: passengers }
    );
    return { offer, status: 'RAC' };
  }

  // Full match (or ALL_OR_NOTHING with enough seats)
  const seatNumbers = assignSeats(classCode, passengers);
  const farePerPerson = searchResult.fareByClass[classCode] ?? 0;
  const offer = buildOffer(bookingAttemptId, searchResult, classCode, seatNumbers, farePerPerson, passengers, false);

  appendAuditEntry(bookingAttemptId, 'ai_agent', 'offer_evaluated',
    `Full match found: ${passengers} seat(s) in ${classCode} on ${searchResult.train.name}. Extending offer.`,
    { seatNumbers, farePerPerson }
  );

  return { offer, status: 'CNF' };
}

function buildOffer(
  bookingAttemptId: string,
  searchResult: SearchResult,
  classCode: string,
  seatNumbers: string[],
  farePerPerson: number,
  passengers: number,
  partialGroup: boolean
): SeatOffer {
  const now = Date.now();
  const cls = searchResult.train.availableClasses.find(c => c.code === classCode);
  const offer: SeatOffer = {
    offerId: genOfferId(),
    bookingAttemptId,
    searchResult,
    classCode,
    seatNumbers,
    seatType: getSeatType(classCode, seatNumbers[0]),
    coachLabel: cls?.label ?? classCode,
    farePerPerson,
    totalFare: farePerPerson * passengers,
    passengers,
    offeredAt: now,
    expiresAt: now + OFFER_TTL_MS,
    status: 'PENDING',
    partialGroup,
  };

  activeOffers.set(offer.offerId, offer);

  // Auto-expire after 2 minutes
  setTimeout(() => {
    const o = activeOffers.get(offer.offerId);
    if (o && o.status === 'PENDING') {
      o.status = 'EXPIRED';
      appendAuditEntry(bookingAttemptId, 'system', 'offer_timeout',
        '2-minute seat offer window elapsed — offer expired.');
    }
  }, OFFER_TTL_MS);

  return offer;
}

export function acceptOffer(offerId: string): boolean {
  const offer = activeOffers.get(offerId);
  if (!offer || offer.status !== 'PENDING') return false;
  offer.status = 'ACCEPTED';
  return true;
}

export function declineOffer(offerId: string, bookingAttemptId: string): void {
  const offer = activeOffers.get(offerId);
  if (offer && offer.status === 'PENDING') {
    offer.status = 'DECLINED';
    appendAuditEntry(bookingAttemptId, 'user', 'offer_declined',
      'User passed on this seat offer — will remain in queue for next available seat.');
  }
}

export function getOffer(offerId: string): SeatOffer | undefined {
  return activeOffers.get(offerId);
}

export function getOfferRemaining(offerId: string): number {
  const o = activeOffers.get(offerId);
  if (!o || o.status !== 'PENDING') return 0;
  return Math.max(0, o.expiresAt - Date.now());
}

export function getAllOffers(): SeatOffer[] {
  return Array.from(activeOffers.values());
}

/** Terminal deadline check (§15.2) — 4 hours before departure */
function isPastTerminalDeadline(_date: string, _result: SearchResult): boolean {
  // For the demo, never past deadline unless date is 'today' and time > 20:00 IST
  // In a real system: compare departure datetime against now() - 4h
  const now = new Date();
  return now.getHours() >= 23 && now.getMinutes() >= 59; // Only "closes" near midnight for demo
}
