/**
 * BookingFlow.tsx — Orchestrates all 13 journey steps (§31)
 * Manages state machine transitions, calls services, feeds store.
 */
import React, { useEffect, useCallback } from 'react';
import { useBookingStore } from '../store/booking-store';
import { useProfileStore } from '../store/profile-store';
import AppShell from '../components/layout/AppShell';
import GoalInput from '../components/search/GoalInput';
import TrainResults from '../components/search/TrainResults';
import WaitingRoom from '../components/queue/WaitingRoom';
import SeatOfferCard from '../components/offer/SeatOffer';
import PassengerDetails from '../components/hold/PassengerDetails';
import OtpStep from '../components/auth/OtpStep';
import PaymentScreen from '../components/payment/PaymentScreen';
import TicketCard from '../components/confirmation/TicketCard';
import { searchTrains, type SearchResult } from '../services/train-data';
import { joinQueue } from '../services/queue-service';
import { tryMatchOffer } from '../services/matching-engine';
import { createHold, onHoldExpired, confirmHold, startReconciliationSweep } from '../services/hold-service';
import { assignPNR, updateSession, createSession } from '../services/booking-session';
import { appendAuditEntry } from '../services/audit-log';
import { subscribeToDisruptions } from '../services/disruption-service';
import type { TravelGoal } from '../services/ai-agent';
import type { Passenger } from '../store/profile-store';
import type { PaymentRecord } from '../services/payment-service';

const STAGE_LABELS: Record<string, string> = {
  SEARCHING: 'Search',
  WAITING: 'Waiting',
  OFFER_AVAILABLE: 'Seat offer',
  SEAT_HELD: 'Seat held',
  DETAILS: 'Details',
  AUTH: 'Verify',
  PAYMENT: 'Payment',
  CONFIRMING: 'Confirming',
  CONFIRMED: '🎫 Confirmed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const BookingFlow: React.FC = () => {
  const { currentUser } = useProfileStore();
  const {
    session, stage, goal, searchResults, selectedResult, currentOffer,
    currentHold, setStage, setGoal, setSearchResults, selectTrain,
    setOffer, setHold, setHoldExpired, setSelectedPassengers,
    setPaymentRecord, setPNR, setError, setLoading, setDisruption, resetBooking,
  } = useBookingStore();

  const bid = session?.bookingAttemptId ?? 'UNKNOWN';

  // Subscribe to disruptions
  useEffect(() => {
    const unsub = subscribeToDisruptions(disruption => {
      setDisruption(true, disruption.description);
    });
    return unsub;
  }, [setDisruption]);

  // Subscribe to hold expiry
  useEffect(() => {
    const cb = (holdId: string) => {
      if (currentHold?.holdId === holdId) {
        setHoldExpired(true);
        // Exclude CONFIRMED (already booked) and PAYMENT/CONFIRMING (confirmHold handles the race via compare-and-set §11)
        if (stage !== 'CONFIRMED' && stage !== 'PAYMENT' && stage !== 'CONFIRMING') {
          setError({
            code: 'HOLD_EXPIRED',
            message: 'Your seat hold has expired. Return to search to try again.',
            recoverable: false,
            holdPreserved: false,
          });
          setStage('FAILED');
        }
      }
    };
    onHoldExpired(cb);
  }, [currentHold, stage, setHoldExpired, setError, setStage]);

  // ── Step 1: Goal parsed → search ──────────────────────────────
  const handleGoalParsed = useCallback(async (parsedGoal: TravelGoal) => {
    setGoal(parsedGoal);
    setLoading(true);
    setStage('SEARCHING');
    await new Promise(r => setTimeout(r, 700));
    const results = searchTrains(parsedGoal.fromCode, parsedGoal.toCode, parsedGoal.dateRange[0], parsedGoal.classCode);
    setSearchResults(results);
    setLoading(false);
  }, [setGoal, setLoading, setStage, setSearchResults]);

  // ── Step 2: Train selected → enter queue ─────────────────────
  const handleTrainSelected = useCallback((result: SearchResult) => {
    if (!currentUser || !goal || !session) return;
    selectTrain(result);

    const entry = joinQueue(currentUser.userId, bid, {
      fromCode: goal.fromCode,
      toCode: goal.toCode,
      date: goal.dateRange[0],
      classCode: goal.classCode,
      passengers: goal.passengers,
      fulfillmentMode: goal.fulfillmentMode,
    }, true /* captcha passed in demo */);

    appendAuditEntry(bid, 'user', 'queue_joined',
      `Joined queue for ${result.train.name} at position ${entry.position}`);

    updateSession(session.sessionToken, { stage: 'WAITING', trainNumber: result.train.trainNumber });
    setStage('WAITING');
  }, [currentUser, goal, session, bid, selectTrain, setStage]);

  // ── Step 3: Offer ready ────────────────────────────────────────
  const handleOfferReady = useCallback(() => {
    if (!goal || !selectedResult || !session) return;
    const matchResult = tryMatchOffer(
      bid, selectedResult, goal.classCode,
      goal.passengers, goal.fulfillmentMode, goal.dateRange[0]
    );

    if (matchResult.offer) {
      setOffer(matchResult.offer);
      updateSession(session.sessionToken, { stage: 'OFFER_AVAILABLE', offerId: matchResult.offer.offerId });
      setStage('OFFER_AVAILABLE');
    } else {
      // No match — stay in queue
      setStage('WAITING');
    }
  }, [goal, selectedResult, session, bid, setOffer, setStage]);

  // ── Step 4: Offer accepted → hold ────────────────────────────
  const handleOfferAccepted = useCallback(() => {
    if (!session || !currentOffer) return;
    const hold = createHold(bid, ['SEAT-001', 'SEAT-002'], ['SEG-1', 'SEG-2', 'SEG-3']);
    setHold(hold);
    updateSession(session.sessionToken, { stage: 'SEAT_HELD', holdId: hold.holdId });

    appendAuditEntry(bid, 'system', 'hold_created',
      `10-minute hold created: ${hold.holdId}. Redis TTL + reconciliation sweep active.`,
      { holdId: hold.holdId, expiresAt: hold.expiresAt }
    );

    setStage('SEAT_HELD');
    // Auto-advance to details
    setTimeout(() => setStage('DETAILS'), 500);
  }, [session, currentOffer, bid, setHold, setStage]);

  // ── Step 5: Offer declined ────────────────────────────────────
  const handleOfferDeclined = useCallback(() => {
    setOffer(null);
    setStage('WAITING');
    // Re-join queue
    if (currentUser && goal && session) {
      joinQueue(currentUser.userId, bid, {
        fromCode: goal.fromCode,
        toCode: goal.toCode,
        date: goal.dateRange[0],
        classCode: goal.classCode,
        passengers: goal.passengers,
        fulfillmentMode: goal.fulfillmentMode,
      }, true);
    }
  }, [setOffer, setStage, currentUser, goal, session, bid]);

  // ── Step 6: Passengers confirmed ─────────────────────────────
  const handlePassengersConfirmed = useCallback((passengers: Passenger[]) => {
    setSelectedPassengers(passengers);
    if (session) updateSession(session.sessionToken, { stage: 'AUTH' });
    setStage('AUTH');
  }, [setSelectedPassengers, session, setStage]);

  // ── Step 7: OTP verified ──────────────────────────────────────
  const handleOtpSuccess = useCallback(() => {
    if (session) updateSession(session.sessionToken, { stage: 'PAYMENT' });
    setStage('PAYMENT');
  }, [session, setStage]);

  // ── Step 8: Payment success ───────────────────────────────────
  const handlePaymentSuccess = useCallback((record: PaymentRecord) => {
    setPaymentRecord(record);
    setStage('CONFIRMING');

    // Atomic compare-and-set (§11)
    const confirmed = currentHold ? confirmHold(currentHold.holdId) : false;

    appendAuditEntry(bid, 'system', 'booking_confirmed',
      confirmed
        ? `HELD → BOOKED via atomic compare-and-set. Payment: ${record.paymentId}`
        : `Hold already expired at confirmation time — treating as booking failure.`
    );

    if (confirmed) {
      const pnr = session ? assignPNR(session.sessionToken) : 'RS0000000';
      setPNR(pnr);

      // Persist to MongoDB backend
      if (session && currentUser && currentOffer) {
        const tr = currentOffer.searchResult.train;
        const originCode = tr.route[0]?.station?.code || 'HWH';
        const destCode = tr.route[tr.route.length - 1]?.station?.code || 'NDLS';

        fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pnr,
            userId: currentUser.userId,
            sessionToken: session.sessionToken,
            bookingAttemptId: bid,
            trainNumber: tr.trainNumber,
            trainName: tr.name,
            fromCode: originCode,
            toCode: destCode,
            date: currentOffer.searchResult.date,
            classCode: currentOffer.classCode,
            seatNumbers: currentOffer.seatNumbers,
            passengers: currentOffer.passengers,
            totalFare: currentOffer.totalFare,
            status: 'CONFIRMED',
          }),
        }).catch(() => { /* non-blocking */ });
      }

      setTimeout(() => setStage('CONFIRMED'), 1200);
    } else {
      setError({
        code: 'HOLD_EXPIRED_ON_CONFIRM',
        message: 'Hold expired just as payment completed — refund initiated. Your payment is safe.',
        recoverable: false,
        holdPreserved: false,
      });
      setStage('FAILED');
    }
  }, [currentHold, session, bid, setPaymentRecord, setStage, setPNR, setError, currentUser, currentOffer]);

  // ── Step 9: Payment failed ────────────────────────────────────
  const handlePaymentFailed = useCallback((_record: PaymentRecord) => {
    // Hold is preserved — user can retry
    // Error already set by PaymentScreen
  }, []);

  const handleNewBooking = useCallback(() => {
    // Capture session before resetBooking clears it
    const currentSession = session;
    resetBooking();
    if (currentSession) {
      updateSession(currentSession.sessionToken, { stage: 'SEARCHING' });
    }
    // Create a fresh session so GoalInput can render (session becomes null after resetBooking)
    const user = useProfileStore.getState().currentUser;
    if (user) {
      const { setSession } = useBookingStore.getState();
      const newSession = createSession(user.userId);
      setSession(newSession);
      startReconciliationSweep();
    }
  }, [resetBooking, session]);

  const needsProgress = !['SEARCHING'].includes(stage);
  const needsHoldCountdown = ['SEAT_HELD', 'DETAILS', 'AUTH', 'PAYMENT'].includes(stage);

  return (
    <AppShell showProgress={needsProgress} showHoldCountdown={needsHoldCountdown}>
      <div className="booking-flow-wrapper">
        {/* Stage header chip */}
        {needsProgress && (
          <div className="stage-chip-container">
            <span className="stage-chip badge badge-primary">
              {STAGE_LABELS[stage] ?? stage}
            </span>
          </div>
        )}

        {/* ── SEARCHING: Goal entry ── */}
        {stage === 'SEARCHING' && !searchResults.length && session && (
          <GoalInput bookingAttemptId={bid} onGoalParsed={handleGoalParsed} />
        )}

        {/* ── SEARCHING: Results ── */}
        {stage === 'SEARCHING' && searchResults.length > 0 && goal && (
          <TrainResults
            goal={goal}
            results={searchResults}
            onSelect={handleTrainSelected}
          />
        )}

        {/* ── WAITING ── */}
        {stage === 'WAITING' && currentUser && (
          <WaitingRoom userId={currentUser.userId} onOfferReady={handleOfferReady} />
        )}

        {/* ── OFFER_AVAILABLE ── */}
        {stage === 'OFFER_AVAILABLE' && currentOffer && (
          <SeatOfferCard
            offer={currentOffer}
            onAccepted={handleOfferAccepted}
            onDeclined={handleOfferDeclined}
          />
        )}

        {/* ── SEAT_HELD: auto-advances to DETAILS ── */}
        {stage === 'SEAT_HELD' && (
          <div className="step-container anim-fade-in">
            <div className="empty-state">
              <span style={{ fontSize: 48 }}>🔒</span>
              <h2 className="step-title">Seat held!</h2>
              <p className="text-muted">Setting up your booking details…</p>
            </div>
          </div>
        )}

        {/* ── DETAILS ── */}
        {stage === 'DETAILS' && goal && (
          <PassengerDetails
            requiredCount={goal.passengers}
            onConfirmed={handlePassengersConfirmed}
          />
        )}

        {/* ── AUTH ── */}
        {stage === 'AUTH' && (
          <OtpStep onSuccess={handleOtpSuccess} />
        )}

        {/* ── PAYMENT ── */}
        {stage === 'PAYMENT' && currentOffer && currentHold && session && (
          <PaymentScreen
            amount={currentOffer.totalFare}
            holdId={currentHold.holdId}
            idempotencyKey={currentHold.idempotencyKey}
            bookingAttemptId={bid}
            onSuccess={handlePaymentSuccess}
            onFailed={handlePaymentFailed}
          />
        )}

        {/* ── CONFIRMING ── */}
        {stage === 'CONFIRMING' && (
          <div className="step-container anim-fade-in">
            <div className="empty-state">
              <span style={{ fontSize: 48 }}>✨</span>
              <h2 className="step-title">Confirming your booking…</h2>
              <p className="text-muted">Atomic compare-and-set in progress (§11)</p>
            </div>
          </div>
        )}

        {/* ── CONFIRMED ── */}
        {stage === 'CONFIRMED' && (
          <TicketCard onCancel={handleNewBooking} onSearchAgain={handleNewBooking} />
        )}

        {/* ── FAILED ── */}
        {stage === 'FAILED' && (
          <div className="step-container anim-fade-in-up">
            <div className="empty-state">
              <span style={{ fontSize: 48 }}>⚠️</span>
              <h2 className="step-title">Booking failed</h2>
              <p className="text-muted" style={{ maxWidth: 360 }}>
                This is an edge case where the hold expired precisely at payment confirmation.
                A refund has been initiated. Your payment is safe.
              </p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleNewBooking}>
                Search again
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default BookingFlow;
