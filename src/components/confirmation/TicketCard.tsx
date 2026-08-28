/**
 * TicketCard.tsx — Confirmed ticket + Refund breakdown (§31 steps 10, 12)
 * "The one moment allowed genuine warmth — clean ticket-card visual"
 */
import React, { useState } from 'react';
import { useBookingStore } from '../../store/booking-store';
import { useProfileStore } from '../../store/profile-store';
import { MockBadge } from '../layout/MockBadge';
import { calculateSegmentRefund, initiateRefund } from '../../services/payment-service';
import { appendAuditEntry } from '../../services/audit-log';

interface Props {
  onCancel?: () => void;
  onSearchAgain?: () => void;
}

const TicketCard: React.FC<Props> = ({ onCancel, onSearchAgain }) => {
  const { language } = useProfileStore();
  const {
    pnr, currentOffer, selectedPassengers, paymentRecord,
    session, setStage, disruptionActive, disruptionMessage
  } = useBookingStore();

  const [showRefund, setShowRefund] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [refundResult, setRefundResult] = useState<{
    refundAmount: number;
    cancellationCharge: number;
    breakdown: string;
  } | null>(null);

  // Simulate hours before departure (for refund calc)
  const hoursBeforeDeparture = 52;

  const handleCancelRequest = () => {
    if (!currentOffer) return;
    const refund = calculateSegmentRefund(currentOffer.totalFare, hoursBeforeDeparture);
    setRefundResult(refund);
    setShowRefund(true);
  };

  const handleConfirmCancel = async () => {
    if (!paymentRecord || !session) return;
    setIsCancelling(true);
    await initiateRefund(
      paymentRecord.paymentId,
      refundResult?.refundAmount ?? 0,
      'Passenger-initiated cancellation',
      session.bookingAttemptId
    );
    appendAuditEntry(session.bookingAttemptId, 'user', 'refund_initiated',
      `Ticket cancelled. Refund of ₹${refundResult?.refundAmount} initiated.`);
    setIsCancelling(false);
    setCancelled(true);
    setShowRefund(false);
    setStage('CANCELLED');
    onCancel?.();
  };

  if (cancelled) {
    return (
      <div className="step-container anim-fade-in-up">
        <div className="empty-state">
          <span style={{ fontSize: 48 }}>✓</span>
          <h2 className="step-title">Booking cancelled</h2>
          <p className="text-muted">
            Refund of ₹{refundResult?.refundAmount.toLocaleString('en-IN')} has been initiated.
            It will reflect in your source within 3–5 business days (simulated).
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onSearchAgain}>
            Search again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step-container anim-fade-in-up">
      {/* Disruption alert */}
      {disruptionActive && disruptionMessage && (
        <div className="inline-banner error anim-fade-in" role="alert">
          <span>🚨</span>
          <div>
            <div className="font-semibold">Train disruption detected</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{disruptionMessage}</div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
              A full refund has been auto-initiated. Would you like to search for an alternative?
            </div>
            <button className="btn btn-primary" style={{ marginTop: 10, minHeight: 36, fontSize: 13 }} onClick={onSearchAgain}>
              Search alternatives
            </button>
          </div>
        </div>
      )}

      {/* Ticket card */}
      <div className={`ticket-card anim-scale-pop ${disruptionActive ? 'ticket-disrupted' : ''}`}>
        <div className="ticket-header">
          <div>
            <span className="badge badge-success" style={{ fontSize: 13, padding: '4px 12px' }}>
              ✓ Confirmed
            </span>
            <MockBadge label="Illustrative PNR" style={{ marginLeft: 8 }} />
          </div>
          <div className="ticket-pnr">
            <span className="pnr-label">PNR</span>
            <span className="pnr-number font-mono" aria-label={`PNR: ${pnr}`}>{pnr}</span>
          </div>
        </div>

        <div className="ticket-divider-dashes" aria-hidden="true" />

        {/* Journey info */}
        {currentOffer && (
          <>
            <div className="ticket-journey">
              <div className="ticket-station">
                <div className="ticket-city font-semibold">{currentOffer.searchResult.fromStation.code}</div>
                <div className="ticket-city-name text-muted">{currentOffer.searchResult.fromStation.city}</div>
              </div>
              <div className="ticket-journey-line">
                <div className="ticket-train-name text-muted">{currentOffer.searchResult.train.name}</div>
                <div className="ticket-line-bar">
                  <span className="ticket-dot" />
                  <div className="ticket-line" />
                  <span className="ticket-dot" />
                </div>
                <div className="ticket-class badge badge-primary">{currentOffer.classCode}</div>
              </div>
              <div className="ticket-station ticket-station-right">
                <div className="ticket-city font-semibold">{currentOffer.searchResult.toStation.code}</div>
                <div className="ticket-city-name text-muted">{currentOffer.searchResult.toStation.city}</div>
              </div>
            </div>

            <div className="ticket-divider-dashes" aria-hidden="true" />

            {/* Passengers */}
            <div className="ticket-passengers">
              {selectedPassengers.map((p, i) => (
                <div key={p.passengerId} className="ticket-passenger-row">
                  <span className="text-sm">Passenger {i + 1}: <strong>{p.name || 'Demo Passenger'}</strong></span>
                  <span className="font-mono text-sm">{currentOffer.seatNumbers[i] ?? '—'}</span>
                </div>
              ))}
            </div>

            <div className="ticket-divider-dashes" aria-hidden="true" />

            <div className="ticket-fare-row">
              <span className="text-muted text-sm">Total paid</span>
              <span className="font-mono font-bold" style={{ fontSize: 20, color: 'var(--color-success-700)' }}>
                ₹{currentOffer.totalFare.toLocaleString('en-IN')}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {!showRefund ? (
        <div className="flex gap-3">
          <button
            id="btn-cancel-ticket"
            className="btn btn-danger"
            style={{ flex: 1 }}
            onClick={handleCancelRequest}
          >
            Cancel ticket
          </button>
          <button
            id="btn-search-again"
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={onSearchAgain}
          >
            {language === 'hi' ? 'नई बुकिंग' : 'New booking'}
          </button>
        </div>
      ) : (
        /* Refund breakdown (§21.1) */
        <div className="refund-breakdown card card-sm anim-fade-in">
          <div className="font-semibold text-sm" style={{ marginBottom: 12 }}>
            Cancellation & refund breakdown
          </div>
          {refundResult && (
            <div className="refund-breakdown-rows">
              <div className="refund-row">
                <span className="text-muted text-sm">Base fare</span>
                <span className="font-mono">₹{currentOffer?.totalFare.toLocaleString('en-IN')}</span>
              </div>
              <div className="refund-row">
                <span className="text-muted text-sm">Cancellation charge</span>
                <span className="font-mono text-error">− ₹{refundResult.cancellationCharge.toLocaleString('en-IN')}</span>
              </div>
              <div className="refund-row refund-total">
                <span className="font-medium">Refund amount</span>
                <span className="font-mono font-bold text-success">₹{refundResult.refundAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>{refundResult.breakdown}</div>
            </div>
          )}
          <div className="flex gap-3" style={{ marginTop: 12 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowRefund(false)}>
              Keep ticket
            </button>
            <button
              id="btn-confirm-cancel"
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling…' : 'Confirm cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketCard;
