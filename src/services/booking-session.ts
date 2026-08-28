/**
 * booking-session.ts — Resumable Session Token (§3.1)
 * "On any reload, reconnect, or app relaunch, the frontend
 * always re-fetches the authoritative stage from the backend."
 *
 * Token is stored in sessionStorage; state is stored in-memory (our "backend").
 */

export type BookingStage =
  | 'SEARCHING'
  | 'WAITING'
  | 'OFFER_AVAILABLE'
  | 'SEAT_HELD'
  | 'DETAILS'
  | 'AUTH'
  | 'PAYMENT'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'FAILED';

export interface BookingSessionData {
  sessionToken: string;
  bookingAttemptId: string;
  userId: string;
  stage: BookingStage;
  holdId?: string;
  offerId?: string;
  paymentId?: string;
  pnr?: string;
  trainNumber?: string;
  fromCode?: string;
  toCode?: string;
  date?: string;
  classCode?: string;
  passengers?: number;
  totalFare?: number;
  seatNumbers?: string[];
  createdAt: number;
  updatedAt: number;
}

const SESSION_KEY = 'railsaathi_session_token';
// In-memory store (the authoritative "backend" state)
const sessionStore = new Map<string, BookingSessionData>();

let sessionCounter = 0;

function genSessionToken(): string {
  return `RS-${Date.now().toString(36).toUpperCase()}-${(++sessionCounter).toString(36).toUpperCase()}`;
}

function genBookingAttemptId(): string {
  return `BKG-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function genPNR(): string {
  // Illustrative PNR — explicitly NOT a real Railways format
  return `RS${Math.floor(Math.random() * 9000000 + 1000000)}`;
}

/** Sync session with MongoDB in the background */
async function syncSessionToRemote(session: BookingSessionData) {
  try {
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
  } catch (err) {
    // Non-blocking background sync failure
  }
}

/** Create a new booking session */
export function createSession(userId: string): BookingSessionData {
  const sessionToken = genSessionToken();
  const session: BookingSessionData = {
    sessionToken,
    bookingAttemptId: genBookingAttemptId(),
    userId,
    stage: 'SEARCHING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessionStore.set(sessionToken, session);
  // Persist token client-side
  try {
    sessionStorage.setItem(SESSION_KEY, sessionToken);
  } catch { /* private browsing */ }

  syncSessionToRemote(session);
  return session;
}

/** Resume session on reload — §3.1 "authoritative state re-fetch" */
export function resumeSession(): BookingSessionData | null {
  let token: string | null = null;
  try {
    token = sessionStorage.getItem(SESSION_KEY);
  } catch { /* private browsing */ }
  if (!token) return null;
  return sessionStore.get(token) ?? null;
}

/** Fetch latest session from MongoDB backend on reconnection/reload */
export async function fetchAuthoritativeSession(sessionToken: string): Promise<BookingSessionData | null> {
  try {
    const res = await fetch(`/api/sessions?token=${encodeURIComponent(sessionToken)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        sessionStore.set(sessionToken, json.data);
        return json.data;
      }
    }
  } catch { /* fallback to local */ }
  return sessionStore.get(sessionToken) ?? null;
}

/** Update session stage (state machine transition) */
export function updateSession(
  sessionToken: string,
  updates: Partial<Omit<BookingSessionData, 'sessionToken' | 'bookingAttemptId' | 'userId' | 'createdAt'>>
): BookingSessionData | null {
  const session = sessionStore.get(sessionToken);
  if (!session) return null;
  Object.assign(session, updates, { updatedAt: Date.now() });
  syncSessionToRemote(session);
  return session;
}

/** Get session by token */
export function getSession(sessionToken: string): BookingSessionData | null {
  return sessionStore.get(sessionToken) ?? null;
}

/** Clear session (logout / fresh start) */
export function clearSession(sessionToken: string): void {
  sessionStore.delete(sessionToken);
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ok */ }
}

/** Assign PNR on confirmation */
export function assignPNR(sessionToken: string): string {
  const pnr = genPNR();
  updateSession(sessionToken, { pnr, stage: 'CONFIRMED' });
  return pnr;
}

/** Get all sessions (for admin dashboard) */
export function getAllSessions(): BookingSessionData[] {
  return Array.from(sessionStore.values());
}
