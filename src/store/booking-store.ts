/**
 * booking-store.ts — Full Booking State Machine (§3, §26)
 * States: SEARCHING → WAITING → OFFER_AVAILABLE → SEAT_HELD →
 *         DETAILS → AUTH → PAYMENT → CONFIRMING → CONFIRMED
 *
 * Orchestrates all services: session, queue, matching, hold, payment.
 */
import { create } from 'zustand';
import type { BookingStage, BookingSessionData } from '../services/booking-session';
import type { TravelGoal } from '../services/ai-agent';
import type { SearchResult } from '../services/train-data';
import type { SeatOffer } from '../services/matching-engine';
import type { Hold } from '../services/hold-service';
import type { PaymentRecord } from '../services/payment-service';
import type { Passenger } from './profile-store';

export type { BookingStage };

export interface BookingError {
  code: string;
  message: string;
  recoverable: boolean;
  holdPreserved?: boolean;
}

export interface BookingState {
  // Session
  session: BookingSessionData | null;
  stage: BookingStage;

  // Search
  goal: TravelGoal | null;
  searchResults: SearchResult[];
  selectedResult: SearchResult | null;

  // Queue
  queuePosition: number;
  queueTotal: number;
  estimatedWaitSecs: number;
  queueMode: 'STEADY' | 'BURST_LOBBY' | 'BURST_RELEASING';

  // Offer
  currentOffer: SeatOffer | null;

  // Hold
  currentHold: Hold | null;
  holdExpired: boolean;

  // Passengers
  selectedPassengers: Passenger[];

  // Payment
  paymentRecord: PaymentRecord | null;
  isProcessingPayment: boolean;

  // Confirmation
  pnr: string | null;

  // Error state
  error: BookingError | null;
  isLoading: boolean;

  // Disruption
  disruptionActive: boolean;
  disruptionMessage: string | null;

  // Actions
  setStage: (stage: BookingStage) => void;
  setSession: (session: BookingSessionData) => void;
  setGoal: (goal: TravelGoal) => void;
  setSearchResults: (results: SearchResult[]) => void;
  selectTrain: (result: SearchResult) => void;
  setQueueState: (pos: number, total: number, waitSecs: number) => void;
  setOffer: (offer: SeatOffer | null) => void;
  setHold: (hold: Hold | null) => void;
  setHoldExpired: (expired: boolean) => void;
  setSelectedPassengers: (passengers: Passenger[]) => void;
  setPaymentRecord: (record: PaymentRecord | null) => void;
  setProcessingPayment: (v: boolean) => void;
  setPNR: (pnr: string) => void;
  setError: (err: BookingError | null) => void;
  setLoading: (v: boolean) => void;
  setDisruption: (active: boolean, msg?: string) => void;
  resetBooking: () => void;
}

const initialState = {
  session: null,
  stage: 'SEARCHING' as BookingStage,
  goal: null,
  searchResults: [],
  selectedResult: null,
  queuePosition: 0,
  queueTotal: 0,
  estimatedWaitSecs: 0,
  queueMode: 'STEADY' as const,
  currentOffer: null,
  currentHold: null,
  holdExpired: false,
  selectedPassengers: [],
  paymentRecord: null,
  isProcessingPayment: false,
  pnr: null,
  error: null,
  isLoading: false,
  disruptionActive: false,
  disruptionMessage: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  setStage: (stage) => set({ stage, error: null }),
  setSession: (session) => set({ session }),
  setGoal: (goal) => set({ goal }),
  setSearchResults: (searchResults) => set({ searchResults }),
  selectTrain: (selectedResult) => set({ selectedResult }),
  setQueueState: (queuePosition, queueTotal, estimatedWaitSecs) =>
    set({ queuePosition, queueTotal, estimatedWaitSecs }),
  setOffer: (currentOffer) => set({ currentOffer }),
  setHold: (currentHold) => set({ currentHold, holdExpired: false }),
  setHoldExpired: (holdExpired) => set({ holdExpired }),
  setSelectedPassengers: (selectedPassengers) => set({ selectedPassengers }),
  setPaymentRecord: (paymentRecord) => set({ paymentRecord }),
  setProcessingPayment: (isProcessingPayment) => set({ isProcessingPayment }),
  setPNR: (pnr) => set({ pnr }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  setDisruption: (disruptionActive, disruptionMessage) =>
    set({ disruptionActive, disruptionMessage: disruptionMessage ?? null }),
  resetBooking: () => set(initialState),
}));

// Selector helpers
export const selectHoldRemainingFraction = (hold: Hold | null): number => {
  if (!hold) return 0;
  const elapsed = Date.now() - hold.createdAt;
  const ttl = hold.expiresAt - hold.createdAt;
  return Math.max(0, 1 - elapsed / ttl);
};
