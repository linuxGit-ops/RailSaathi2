/**
 * OtpStep.tsx — Mock OTP authentication (§31 step 8)
 * "Fixed demo code always 000000 — shown on-screen"
 * "Hold is provably preserved through a simulated auth failure and retry"
 */
import React, { useState, useRef, useEffect } from 'react';
import { useProfileStore } from '../../store/profile-store';
import { MockBadge } from '../layout/MockBadge';
import { useBookingStore } from '../../store/booking-store';

interface Props {
  onSuccess: () => void;
}

const DEMO_OTP = '000000';
const OTP_LENGTH = 6;

const OtpStep: React.FC<Props> = ({ onSuccess }) => {
  const { language, currentUser } = useProfileStore();
  const { currentHold, setError, error } = useBookingStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [otpSent, setOtpSent] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const fullOtp = otp.join('');

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const newOtp = [...otp];
    pasted.split('').forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const verifyOtp = async () => {
    if (fullOtp.length < OTP_LENGTH) return;
    setIsVerifying(true);
    setError(null);
    await new Promise(r => setTimeout(r, 1000));

    if (fullOtp === DEMO_OTP) {
      onSuccess();
    } else {
      setAttempts(a => a + 1);
      setError({
        code: 'OTP_INVALID',
        message: attempts >= 2
          ? 'Too many attempts. Resend OTP or use demo code 000000.'
          : `Incorrect OTP. Your seat hold is still active. Try again (hint: use 000000)`,
        recoverable: true,
        holdPreserved: !!currentHold,
      });
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
    setIsVerifying(false);
  };

  const resendOtp = async () => {
    setOtpSent(false);
    await new Promise(r => setTimeout(r, 1000));
    setOtpSent(true);
    setError(null);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="step-container anim-fade-in-up">
      <div className="step-header">
        <h2 className="step-title">
          {language === 'hi' ? 'पहचान सत्यापन' : 'Verify your identity'}
        </h2>
        <p className="step-subtitle text-muted">
          {language === 'hi'
            ? `OTP भेजा गया: ${currentUser?.phone ?? '+91 XXXXX XXXXX'}`
            : `OTP sent to ${currentUser?.phone ?? '+91 XXXXX XXXXX'}`}
        </p>
      </div>

      {/* Hold preservation notice */}
      {currentHold && (
        <div className="inline-banner info anim-fade-in" role="status">
          <span>🔒</span>
          <span>
            {language === 'hi'
              ? 'आपकी सीट होल्ड पर है — OTP दोबारा आने पर भी होल्ड सुरक्षित रहेगी।'
              : 'Your seat is still held — the hold is preserved even if authentication takes a retry.'}
          </span>
        </div>
      )}

      {/* Demo OTP hint */}
      <div className="demo-otp-hint">
        <MockBadge label="Demo OTP" />
        <span className="font-mono" style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
          Always: <strong>000000</strong>
        </span>
      </div>

      {/* OTP input */}
      <div className="otp-grid" role="group" aria-label="6-digit OTP input">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            id={`otp-digit-${i}`}
            type="text"
            inputMode="numeric"
            pattern="\d"
            maxLength={1}
            className={`otp-input ${error ? 'error' : ''}`}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`OTP digit ${i + 1}`}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="inline-banner error anim-fade-in" role="alert">
          <span>⚠</span>
          <div>
            <div>{error.message}</div>
            {error.holdPreserved && (
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                ✓ Hold is still active — no need to restart
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          id="btn-verify-otp"
          className="btn btn-primary btn-full"
          onClick={verifyOtp}
          disabled={fullOtp.length < OTP_LENGTH || isVerifying}
        >
          {isVerifying
            ? (language === 'hi' ? 'सत्यापन हो रहा है…' : 'Verifying…')
            : (language === 'hi' ? 'सत्यापित करें' : 'Verify OTP')}
        </button>

        <button
          id="btn-resend-otp"
          className="btn btn-ghost btn-full"
          onClick={resendOtp}
          disabled={isVerifying || otpSent === false}
          style={{ fontSize: 13 }}
        >
          {otpSent === false ? 'Sending…' : (language === 'hi' ? 'OTP दोबारा भेजें' : 'Resend OTP')}
        </button>
      </div>
    </div>
  );
};

export default OtpStep;
