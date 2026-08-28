/**
 * WaitingRoom.tsx — Virtual Waiting Room + Queue position (§12, §31 steps 3–4)
 * "A calm, steady visual (slowly filling bar or gentle pulse,
 *  never a spinning 'loading forever' indicator with no context)"
 */
import React, { useEffect, useRef } from 'react';
import { useBookingStore } from '../../store/booking-store';
import { useProfileStore } from '../../store/profile-store';
import { getQueueState } from '../../services/queue-service';

interface Props {
  userId: string;
  onOfferReady: () => void;
}

const WaitingRoom: React.FC<Props> = ({ userId, onOfferReady }) => {
  const { language } = useProfileStore();
  const {
    queuePosition, queueTotal, estimatedWaitSecs, queueMode,
    setQueueState, currentOffer, setStage,
  } = useBookingStore();

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll queue state + simulate position moving up
  useEffect(() => {
    tickRef.current = setInterval(() => {
      const state = getQueueState(userId);
      if (state) {
        setQueueState(state.myPosition, state.totalInQueue, state.estimatedWaitSecs);

        // Simulate: if position reaches 1, offer is ready after a short delay
        if (state.myPosition <= 1) {
          clearInterval(tickRef.current!);
          setTimeout(() => {
            setStage('OFFER_AVAILABLE');
            onOfferReady();
          }, 1500);
        }
      }
    }, 2000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [userId, setQueueState, setStage, onOfferReady]);

  // Progress fill (0→1 as queue depletes)
  const progressFraction = queueTotal > 0 ? Math.max(0, 1 - (queuePosition - 1) / Math.max(queueTotal, 1)) : 0;
  const waitMins = Math.ceil(estimatedWaitSecs / 60);

  const isBurstMode = queueMode === 'BURST_LOBBY' || queueMode === 'BURST_RELEASING';

  return (
    <div className="step-container anim-fade-in-up">
      <div className="step-header">
        <h2 className="step-title">
          {language === 'hi' ? 'प्रतीक्षा सूची में हैं' : 'You\'re in the queue'}
        </h2>
        <p className="step-subtitle text-muted">
          {language === 'hi'
            ? 'हम आपके लिए सीट ढूंढ रहे हैं — यहाँ रहें'
            : 'We\'re watching for a seat that matches your trip — this page will update automatically'}
        </p>
      </div>

      {/* Burst mode notice */}
      {isBurstMode && (
        <div className="inline-banner warning anim-fade-in" role="status">
          <span>⚡</span>
          <div>
            <div className="font-medium">High-demand window (Tatkal-style)</div>
            <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
              All entrants are being shuffled into a fair random order before releasing — scripted speed doesn't help here.
            </div>
          </div>
        </div>
      )}

      {/* Main queue visual */}
      <div className="queue-card card">
        {/* Position display */}
        <div className="queue-position-display">
          <div className="queue-number-badge">
            <span className="queue-number font-mono" aria-live="polite" aria-label={`Your position: ${queuePosition}`}>
              {queuePosition > 0 ? `#${queuePosition}` : '…'}
            </span>
          </div>
          <div>
            <div className="font-medium" style={{ fontSize: 15 }}>
              {language === 'hi' ? 'आपकी कतार संख्या' : 'Your queue position'}
            </div>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {queueTotal > 0
                ? `${queueTotal.toLocaleString('en-IN')} ${language === 'hi' ? 'लोग इंतजार कर रहे हैं' : 'people waiting'}`
                : '…'}
            </div>
          </div>
        </div>

        {/* Progress bar — calm, steady fill */}
        <div className="queue-progress-bar-container" aria-hidden="true">
          <div
            className="queue-progress-bar"
            style={{ width: `${Math.round(progressFraction * 100)}%` }}
          />
        </div>

        {/* Estimated wait */}
        <div className="queue-eta">
          <span className="status-dot active" />
          <span className="text-sm text-muted">
            {language === 'hi'
              ? `अनुमानित प्रतीक्षा: ${waitMins} मिनट`
              : `Estimated wait: ~${waitMins} min`}
          </span>
        </div>

        {/* Dot wave "watching" indicator */}
        <div className="dot-wave" aria-hidden="true" role="presentation">
          <span className="dot" style={{ animationDelay: '0ms' }} />
          <span className="dot" style={{ animationDelay: '160ms' }} />
          <span className="dot" style={{ animationDelay: '320ms' }} />
        </div>
        <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
          {language === 'hi'
            ? 'AI एजेंट आपके लिए निगरानी कर रहा है…'
            : 'AI agent is monitoring inventory for your segment…'}
        </p>
      </div>

      {/* Session resumption notice */}
      <div className="inline-banner info">
        <span>💾</span>
        <span>
          {language === 'hi'
            ? 'यदि आप ऐप बंद करते हैं या रिफ्रेश करते हैं — आपकी जगह सुरक्षित है।'
            : 'Close the app or refresh the page — your place in queue is saved. This is the "no more starting over" guarantee.'}
        </span>
      </div>

      {/* What happens next */}
      <div className="what-next-card">
        <div className="font-medium text-sm" style={{ marginBottom: 8 }}>
          {language === 'hi' ? 'आगे क्या होगा:' : 'What happens next:'}
        </div>
        <ol className="what-next-list">
          <li>A seat matching your goal becomes available</li>
          <li>You get a <strong>2-minute offer</strong> to accept or pass</li>
          <li>If accepted, the seat is held for <strong>10 minutes</strong> for payment</li>
        </ol>
      </div>
    </div>
  );
};

export default WaitingRoom;
