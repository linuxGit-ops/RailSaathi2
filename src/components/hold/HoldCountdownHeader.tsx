/**
 * HoldCountdownHeader.tsx — Persistent hold countdown in header (§33)
 * "Reassuring, not stressful — states what happens if it expires"
 */
import React, { useEffect, useState } from 'react';
import type { Hold } from '../../services/hold-service';
import { getHoldRemaining } from '../../services/hold-service';

interface Props {
  hold: Hold;
  language?: 'en' | 'hi';
}

const HoldCountdownHeader: React.FC<Props> = ({ hold, language = 'en' }) => {
  const [remaining, setRemaining] = useState<number>(getHoldRemaining(hold.holdId));

  useEffect(() => {
    const tick = setInterval(() => {
      const r = getHoldRemaining(hold.holdId);
      setRemaining(r);
      if (r <= 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [hold.holdId]);

  const totalMs = hold.expiresAt - hold.createdAt;
  const fraction = Math.max(0, remaining / totalMs);
  const isLow = remaining < 120000; // < 2 minutes

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const CIRCUMFERENCE = 2 * Math.PI * 9; // radius = 9

  return (
    <div
      className={`hold-countdown-bar ${isLow ? 'hold-low' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Seat hold expires in ${timeStr}`}
    >
      <div className="container-wide" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Ring indicator */}
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
          <circle
            cx="12" cy="12" r="9"
            fill="none"
            stroke={isLow ? '#fbbf24' : '#fff'}
            strokeWidth="2.5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>

        <span className="hold-time font-mono" style={{ fontSize: 15, fontWeight: 600 }}>
          {timeStr}
        </span>

        <span className="hold-label" style={{ fontSize: 13, opacity: 0.9 }}>
          {language === 'hi'
            ? 'सीट होल्ड पर है — यदि समाप्त हो जाए तो भुगतान सुरक्षित रहेगा'
            : remaining > 0
              ? 'Seat is held · Your payment is safe if this expires — just retry'
              : 'Hold has expired — please restart from queue'}
        </span>

        <span className="hold-id font-mono" style={{ fontSize: 11, opacity: 0.6, marginLeft: 'auto' }}>
          {hold.holdId}
        </span>
      </div>
    </div>
  );
};

export default HoldCountdownHeader;
