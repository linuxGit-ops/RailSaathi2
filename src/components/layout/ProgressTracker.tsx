/**
 * ProgressTracker.tsx — Persistent booking flow step indicator (§33)
 * "Every screen carries a persistent, minimal progress indicator so
 *  the user always knows where they are."
 */
import React from 'react';
import type { BookingStage } from '../../store/booking-store';

const STEPS: { stage: BookingStage; label: string; labelHi: string }[] = [
  { stage: 'SEARCHING',       label: 'Search',   labelHi: 'खोज' },
  { stage: 'WAITING',         label: 'Queue',    labelHi: 'कतार' },
  { stage: 'OFFER_AVAILABLE', label: 'Offer',    labelHi: 'प्रस्ताव' },
  { stage: 'SEAT_HELD',       label: 'Hold',     labelHi: 'होल्ड' },
  { stage: 'DETAILS',         label: 'Details',  labelHi: 'विवरण' },
  { stage: 'AUTH',            label: 'Auth',     labelHi: 'प्रमाण' },
  { stage: 'PAYMENT',         label: 'Pay',      labelHi: 'भुगतान' },
  { stage: 'CONFIRMED',       label: 'Done',     labelHi: 'पूर्ण' },
];

const STAGE_INDEX: Record<BookingStage, number> = {
  SEARCHING: 0, WAITING: 1, OFFER_AVAILABLE: 2, SEAT_HELD: 3,
  DETAILS: 4, AUTH: 5, PAYMENT: 6, CONFIRMING: 6,
  CONFIRMED: 7, CANCELLED: 7, FAILED: 7,
};

interface Props {
  currentStage: BookingStage;
  language?: 'en' | 'hi';
}

const ProgressTracker: React.FC<Props> = ({ currentStage, language = 'en' }) => {
  const currentIdx = STAGE_INDEX[currentStage] ?? 0;
  const isConfirmed = currentStage === 'CONFIRMED';
  const isFailed    = currentStage === 'FAILED' || currentStage === 'CANCELLED';

  return (
    <nav className="progress-tracker" aria-label="Booking progress">
      {STEPS.map((step, idx) => {
        const isDone    = idx < currentIdx || isConfirmed;
        const isActive  = idx === currentIdx && !isConfirmed;
        const isFuture  = idx > currentIdx && !isConfirmed;

        let stateClass = 'step-future';
        if (isDone)   stateClass = 'step-done';
        if (isActive) stateClass = isFailed ? 'step-failed' : 'step-active';

        return (
          <React.Fragment key={step.stage}>
            <div
              className={`tracker-step ${stateClass}`}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Step ${idx + 1}: ${step.label} — ${isDone ? 'completed' : isActive ? 'current' : 'upcoming'}`}
            >
              <div className="step-dot">
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className="step-num">{idx + 1}</span>
                )}
              </div>
              <span className="step-label">
                {language === 'hi' ? step.labelHi : step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`tracker-connector ${idx < currentIdx ? 'connector-done' : ''}`} aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default ProgressTracker;
