/**
 * TrainCard.tsx — Individual train result card (§31 step 2)
 */
import React from 'react';
import type { SearchResult } from '../../services/train-data';
import { formatDuration } from '../../services/train-data';
import { MockBadge } from '../layout/MockBadge';

interface Props {
  result: SearchResult;
  classCode: string;
  onSelect: (result: SearchResult) => void;
  language?: 'en' | 'hi';
}

const CLASS_LABELS: Record<string, string> = {
  '1A': 'First AC', '2A': 'Second AC', '3A': 'Third AC',
  'SL': 'Sleeper', 'CC': 'Chair Car', 'EC': 'Executive CC',
};

const TRAIN_TYPE_COLORS: Record<string, string> = {
  RAJDHANI: 'badge-accent',
  SHATABDI: 'badge-primary',
  SUPERFAST: 'badge-warning',
  EXPRESS: 'badge-success',
};

const TrainCard: React.FC<Props> = ({ result, classCode, onSelect, language = 'en' }) => {
  const { train, fromStation, toStation, durationMins, fareByClass, availabilityByClass } = result;
  const fromStop = train.route.find(r => r.station.code === fromStation.code);
  const toStop   = train.route.find(r => r.station.code === toStation.code);

  const avail = availabilityByClass[classCode];
  const fare  = fareByClass[classCode];
  const isAvailable = avail?.status === 'AVAILABLE';

  return (
    <article
      className={`train-card card ${!isAvailable ? 'train-card-wl' : ''}`}
      aria-label={`${train.name}, ${formatDuration(durationMins)}`}
    >
      {/* Top: train name + type */}
      <div className="train-card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="train-number font-mono text-muted">{train.trainNumber}</span>
            <span className={`badge ${TRAIN_TYPE_COLORS[train.type] ?? 'badge-primary'}`}>
              {train.type}
            </span>
            <MockBadge label="Sample data" style={{ marginLeft: 4 }} />
          </div>
          <div className="train-name">
            {language === 'hi' ? train.nameHi : train.name}
          </div>
        </div>
        <div className="train-fare">
          <span className="fare-amount">₹{fare?.toLocaleString('en-IN') ?? '—'}</span>
          <span className="fare-class text-muted">{CLASS_LABELS[classCode] ?? classCode}</span>
        </div>
      </div>

      {/* Middle: route timeline */}
      <div className="train-timeline">
        <div className="timeline-point">
          <span className="timeline-time font-mono">{fromStop?.departureTime ?? '--:--'}</span>
          <span className="timeline-station">{fromStation.code}</span>
          <span className="timeline-city text-muted">{fromStation.city}</span>
        </div>

        <div className="timeline-connector">
          <div className="timeline-line" />
          <span className="timeline-duration text-muted">{formatDuration(durationMins)}</span>
        </div>

        <div className="timeline-point timeline-point-end">
          <span className="timeline-time font-mono">{toStop?.arrivalTime ?? '--:--'}</span>
          <span className="timeline-station">{toStation.code}</span>
          <span className="timeline-city text-muted">{toStation.city}</span>
        </div>
      </div>

      {/* Bottom: availability + action */}
      <div className="train-card-footer">
        <div className="avail-info">
          {avail ? (
            <>
              <span
                className={`badge ${avail.status === 'AVAILABLE' ? 'badge-success' : avail.status === 'WAITLIST' ? 'badge-warning' : 'badge-error'}`}
                aria-label={`Availability: ${avail.status}`}
              >
                {avail.status === 'AVAILABLE'
                  ? `${avail.available} seats`
                  : avail.status === 'WAITLIST'
                    ? `WL ${avail.waitlisted}`
                    : 'Full'}
              </span>
              {train.runsDays.length < 7 && (
                <span className="text-xs text-muted">
                  Runs: {train.runsDays.slice(0, 3).join(', ')}{train.runsDays.length > 3 ? '…' : ''}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted text-sm">Class not available</span>
          )}
        </div>

        <button
          id={`btn-select-train-${train.trainNumber}`}
          className={`btn ${isAvailable ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', minHeight: 40, fontSize: 14 }}
          onClick={() => onSelect(result)}
          aria-label={`Select ${train.name} — ${isAvailable ? `₹${fare}` : 'join waitlist'}`}
        >
          {isAvailable
            ? (language === 'hi' ? 'चुनें' : 'Select')
            : (language === 'hi' ? 'प्रतीक्षा सूची' : 'Join waitlist')}
        </button>
      </div>
    </article>
  );
};

export default TrainCard;
