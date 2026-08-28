/**
 * PassengerDetails.tsx — Pre-filled passenger details (§4, §31 step 7)
 * "Sees pre-filled saved-passenger data using a fictional demo profile."
 */
import React, { useState } from 'react';
import { useProfileStore, type Passenger } from '../../store/profile-store';
import { useBookingStore } from '../../store/booking-store';
import { MockBadge } from '../layout/MockBadge';

interface Props {
  requiredCount: number;
  onConfirmed: (passengers: Passenger[]) => void;
}

const SEAT_PREFS = ['LOWER', 'UPPER', 'SIDE_LOWER', 'NO_PREFERENCE'] as const;
const SEAT_PREF_LABELS: Record<string, string> = {
  LOWER: 'Lower berth', UPPER: 'Upper berth',
  SIDE_LOWER: 'Side lower', NO_PREFERENCE: 'No preference',
};

const PassengerDetails: React.FC<Props> = ({ requiredCount, onConfirmed }) => {
  const { currentUser, language } = useProfileStore();
  const { currentHold } = useBookingStore();

  // Initialize from saved passengers
  const initial: Passenger[] = Array.from({ length: requiredCount }, (_, i) => {
    const saved = currentUser?.savedPassengers[i];
    if (saved) return { ...saved };
    return {
      passengerId: `PAX-NEW-${i}`,
      name: '',
      age: 25,
      gender: 'M' as const,
      seatPreference: 'LOWER' as const,
      idType: 'DEMO_ID' as const,
      idNumber: `DEMO-PAX-NEW-${i}`,
    };
  });

  const [passengers, setPassengers] = useState<Passenger[]>(initial);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const update = (idx: number, field: keyof Passenger, value: string | number) => {
    setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    setErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };

  const validate = (): boolean => {
    const newErrors: Record<number, string> = {};
    passengers.forEach((p, i) => {
      if (!p.name.trim()) newErrors[i] = 'Name is required';
      else if (p.age < 1 || p.age > 120) newErrors[i] = 'Enter a valid age';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validate()) onConfirmed(passengers);
  };

  return (
    <div className="step-container anim-fade-in-up">
      <div className="step-header">
        <h2 className="step-title">
          {language === 'hi' ? 'यात्री विवरण' : 'Passenger details'}
        </h2>
        <p className="step-subtitle text-muted">
          {language === 'hi'
            ? 'आपकी सहेजी जानकारी से भरा गया है — जाँचें और आगे बढ़ें।'
            : 'Pre-filled from your saved profile — review and confirm.'}
        </p>
      </div>

      {/* Hold still active notice */}
      {currentHold && (
        <div className="inline-banner info" role="status">
          <span>🔒</span>
          <span>Your seat is held — take your time with these details.</span>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {passengers.map((pax, idx) => (
          <div key={pax.passengerId} className="passenger-card card card-sm">
            <div className="passenger-card-header">
              <span className="badge badge-primary">Passenger {idx + 1}</span>
              {currentUser?.savedPassengers[idx] && (
                <MockBadge label="Sample passenger" />
              )}
            </div>

            <div className="passenger-fields-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" htmlFor={`pax-name-${idx}`}>
                  {language === 'hi' ? 'पूरा नाम' : 'Full name'}
                </label>
                <input
                  id={`pax-name-${idx}`}
                  className={`form-input ${errors[idx] ? 'error' : ''}`}
                  value={pax.name}
                  onChange={e => update(idx, 'name', e.target.value)}
                  placeholder="As on ID"
                  required
                />
                {errors[idx] && (
                  <span className="text-error text-xs">{errors[idx]}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor={`pax-age-${idx}`}>
                  {language === 'hi' ? 'आयु' : 'Age'}
                </label>
                <input
                  id={`pax-age-${idx}`}
                  type="number"
                  className="form-input"
                  value={pax.age}
                  onChange={e => update(idx, 'age', parseInt(e.target.value) || 0)}
                  min={1} max={120}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor={`pax-gender-${idx}`}>
                  {language === 'hi' ? 'लिंग' : 'Gender'}
                </label>
                <select
                  id={`pax-gender-${idx}`}
                  className="form-input"
                  value={pax.gender}
                  onChange={e => update(idx, 'gender', e.target.value as 'M' | 'F' | 'O')}
                >
                  <option value="M">{language === 'hi' ? 'पुरुष' : 'Male'}</option>
                  <option value="F">{language === 'hi' ? 'महिला' : 'Female'}</option>
                  <option value="O">{language === 'hi' ? 'अन्य' : 'Other'}</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" htmlFor={`pax-pref-${idx}`}>
                  {language === 'hi' ? 'सीट प्राथमिकता' : 'Seat preference'}
                </label>
                <select
                  id={`pax-pref-${idx}`}
                  className="form-input"
                  value={pax.seatPreference}
                  onChange={e => update(idx, 'seatPreference', e.target.value as Passenger['seatPreference'])}
                >
                  {SEAT_PREFS.map(p => (
                    <option key={p} value={p}>{SEAT_PREF_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">ID (Demo)</label>
                <div
                  className="form-input"
                  style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)', cursor: 'default', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <MockBadge label="Demo ID" />
                  <span className="font-mono">{pax.idNumber}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        id="btn-confirm-passengers"
        className="btn btn-primary btn-full"
        onClick={handleConfirm}
        style={{ marginTop: 8 }}
      >
        {language === 'hi' ? 'जारी रखें' : 'Confirm & continue →'}
      </button>
    </div>
  );
};

export default PassengerDetails;
