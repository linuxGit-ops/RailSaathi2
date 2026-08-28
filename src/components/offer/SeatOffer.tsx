/**
 * SeatOffer.tsx — 2-minute seat offer with countdown ring (§16, §31 step 5)
 * "The single moment allowed a touch more urgency — visible but not alarming"
 */
import React, { useEffect, useState, useCallback } from 'react';
import type { SeatOffer } from '../../services/matching-engine';
import { getOfferRemaining, acceptOffer, declineOffer } from '../../services/matching-engine';
import { useProfileStore } from '../../store/profile-store';
import { appendAuditEntry } from '../../services/audit-log';

interface Props {
  offer: SeatOffer;
  onAccepted: () => void;
  onDeclined: () => void;
}

const CIRCUMFERENCE = 2 * Math.PI * 42; // radius = 42

const SeatOfferCard: React.FC<Props> = ({ offer, onAccepted, onDeclined }) => {
  const { language } = useProfileStore();
  const [remaining, setRemaining] = useState(getOfferRemaining(offer.offerId));
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
      const r = getOfferRemaining(offer.offerId);
      setRemaining(r);
      if (r <= 0) {
        clearInterval(tick);
        onDeclined(); // Offer expired
      }
    }, 500);
    return () => clearInterval(tick);
  }, [offer.offerId, onDeclined]);

  const totalMs = offer.expiresAt - offer.offeredAt;
  const fraction = Math.max(0, remaining / totalMs);
  const secs = Math.ceil(remaining / 1000);
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  const isUrgent = remaining < 30000; // < 30s

  const handleAccept = useCallback(async () => {
    setIsAccepting(true);
    const ok = acceptOffer(offer.offerId);
    if (ok) {
      appendAuditEntry(offer.bookingAttemptId, 'user', 'offer_accepted',
        `Seat offer accepted: ${offer.seatNumbers.join(', ')} in ${offer.classCode}`);
      await new Promise(r => setTimeout(r, 600));
      onAccepted();
    }
    setIsAccepting(false);
  }, [offer, onAccepted]);

  const handleDecline = useCallback(() => {
    declineOffer(offer.offerId, offer.bookingAttemptId);
    onDeclined();
  }, [offer, onDeclined]);

  return (
    <div className="step-container anim-fade-in-up">
      <div className="step-header">
        <h2 className="step-title">
          {language === 'hi' ? 'सीट उपलब्ध है!' : 'Seat offer'}
        </h2>
        <p className="step-subtitle text-muted">
          {language === 'hi'
            ? 'आपके अनुरोध के अनुसार सीट मिली है — अभी स्वीकार करें या छोड़ें।'
            : 'A seat matching your goal is available. Accept to hold it for 10 minutes.'}
        </p>
      </div>

      {/* Offer card */}
      <div className={`offer-card card ${isUrgent ? 'offer-urgent' : ''}`}>
        {/* Countdown ring */}
        <div className="offer-countdown-container">
          <svg className="offer-ring" width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={isUrgent ? 'var(--color-error-600)' : 'var(--color-accent-600)'}
              strokeWidth="6"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
            />
          </svg>
          <div className="offer-countdown-text">
            <span
              className="font-mono"
              style={{ fontSize: 22, fontWeight: 700, color: isUrgent ? 'var(--color-error-600)' : 'var(--color-text)' }}
              aria-live="polite"
              aria-label={`Time remaining: ${timeStr}`}
            >
              {timeStr}
            </span>
            <span className="text-xs text-muted">to decide</span>
          </div>
        </div>

        {/* Offer details */}
        <div className="offer-details">
          <div className="offer-train-name font-semibold" style={{ fontSize: 17 }}>
            {offer.searchResult.train.name}
          </div>

          <div className="offer-seats-grid">
            {offer.seatNumbers.map(sn => (
              <span key={sn} className="seat-chip font-mono">{sn}</span>
            ))}
          </div>

          <div className="offer-meta">
            <div className="offer-meta-item">
              <span className="offer-meta-label">Type</span>
              <span className="offer-meta-value">{offer.seatType}</span>
            </div>
            <div className="offer-meta-item">
              <span className="offer-meta-label">Class</span>
              <span className="offer-meta-value">{offer.coachLabel}</span>
            </div>
            <div className="offer-meta-item">
              <span className="offer-meta-label">Passengers</span>
              <span className="offer-meta-value">{offer.passengers}</span>
            </div>
            <div className="offer-meta-item">
              <span className="offer-meta-label">Total fare</span>
              <span className="offer-meta-value font-semibold" style={{ color: 'var(--color-accent-700)' }}>
                ₹{offer.totalFare.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {offer.partialGroup && (
            <div className="inline-banner warning" role="alert">
              <span>⚠</span>
              <span>Partial group: only {offer.passengers} of your requested seats are available. Accept to proceed with this partial booking.</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          id="btn-pass-offer"
          className="btn btn-ghost"
          style={{ flex: 1 }}
          onClick={handleDecline}
          disabled={isAccepting}
          aria-label="Pass on this seat offer and stay in queue"
        >
          {language === 'hi' ? 'छोड़ें' : 'Pass'}
        </button>
        <button
          id="btn-accept-offer"
          className="btn btn-primary"
          style={{ flex: 2 }}
          onClick={handleAccept}
          disabled={isAccepting || remaining <= 0}
          aria-label="Accept this seat offer and hold for 10 minutes"
        >
          {isAccepting
            ? (language === 'hi' ? 'होल्ड हो रहा है…' : 'Holding seat…')
            : (language === 'hi' ? 'सीट होल्ड करें' : 'Hold this seat →')}
        </button>
      </div>

      <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
        {language === 'hi'
          ? 'पास करने पर आप कतार में बने रहेंगे।'
          : 'Passing returns you to the queue for the next available seat.'}
      </p>
    </div>
  );
};

export default SeatOfferCard;
