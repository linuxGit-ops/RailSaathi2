/**
 * PaymentScreen.tsx — Mock payment gateway + retry banner (§18.1, §31 step 9)
 * "No real bank/UPI/card integration. A fake 'Pay ₹X' screen that returns
 *  success/failure/timeout on command."
 */
import React, { useState } from 'react';
import { useProfileStore } from '../../store/profile-store';
import { useBookingStore } from '../../store/booking-store';
import { initiatePayment, type PaymentRecord } from '../../services/payment-service';
import { MockBadge } from '../layout/MockBadge';

interface Props {
  amount: number;
  holdId: string;
  idempotencyKey: string;
  bookingAttemptId: string;
  onSuccess: (record: PaymentRecord) => void;
  onFailed: (record: PaymentRecord) => void;
}

const PaymentScreen: React.FC<Props> = ({
  amount, holdId, idempotencyKey, bookingAttemptId, onSuccess, onFailed
}) => {
  const { language, currentUser } = useProfileStore();
  const { paymentRecord, setPaymentRecord, setProcessingPayment, isProcessingPayment, currentHold, error, setError } = useBookingStore();

  const [payMethod, setPayMethod] = useState<'UPI' | 'WALLET' | 'CARD'>('UPI');
  const [upiId, setUpiId] = useState('demo@upi');

  const alreadyAttempted = paymentRecord !== null;

  const handlePay = async () => {
    setProcessingPayment(true);
    setError(null);

    const record = await initiatePayment(holdId, idempotencyKey, bookingAttemptId, amount);
    setPaymentRecord(record);

    if (record.status === 'SUCCESS') {
      onSuccess(record);
    } else if (record.status === 'TIMEOUT') {
      setError({
        code: 'PAYMENT_UNCERTAIN',
        message: 'Payment gateway timed out — outcome is uncertain. DO NOT pay again. We\'re checking with the gateway.',
        recoverable: true,
        holdPreserved: true,
      });
      setProcessingPayment(false);
      // Auto-resolve timeout scenario after 3s for demo.
      // Patch the idempotency Map entry so a retry returns SUCCESS, not TIMEOUT again.
      setTimeout(() => {
        record.status = 'SUCCESS';
        record.settledAt = Date.now();
        const resolved = { ...record };
        setPaymentRecord(resolved);
        setError(null);
        onSuccess(resolved);
      }, 3000);
      return; // setProcessingPayment(false) already called above
    } else {
      setError({
        code: 'PAYMENT_FAILED',
        message: `Payment failed: ${record.failureReason ?? 'Unknown error'}. Your seat is still held — retry when ready.`,
        recoverable: true,
        holdPreserved: true,
      });
      onFailed(record);
    }
    setProcessingPayment(false);
  };

  const holdRemainsMins = currentHold
    ? Math.ceil(Math.max(0, currentHold.expiresAt - Date.now()) / 60000)
    : 0;

  return (
    <div className="step-container anim-fade-in-up">
      <div className="step-header">
        <h2 className="step-title">
          {language === 'hi' ? 'भुगतान करें' : 'Complete payment'}
        </h2>
        <p className="step-subtitle text-muted">
          {language === 'hi'
            ? 'आपकी सीट होल्ड पर है — अभी भुगतान करें।'
            : 'Your seat is held — complete payment to confirm your ticket.'}
        </p>
      </div>

      {/* Amount summary */}
      <div className="payment-summary card card-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="font-semibold" style={{ fontSize: 15 }}>Total amount</div>
            <div className="text-muted text-sm">Including base fare · No hidden charges</div>
          </div>
          <div className="font-mono font-bold" style={{ fontSize: 28, color: 'var(--color-accent-700)' }}>
            ₹{amount.toLocaleString('en-IN')}
          </div>
        </div>
        {holdRemainsMins > 0 && (
          <div className="text-xs text-muted" style={{ marginTop: 8 }}>
            Hold valid for ~{holdRemainsMins} more min{holdRemainsMins !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Payment method */}
      <div className="card card-sm">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="font-medium text-sm">Payment method</span>
          <MockBadge label="Demo gateway" />
        </div>

        <div className="payment-method-tabs">
          {(['UPI', 'WALLET', 'CARD'] as const).map(m => (
            <button
              key={m}
              id={`btn-pay-method-${m.toLowerCase()}`}
              className={`pay-method-tab ${payMethod === m ? 'active' : ''}`}
              onClick={() => setPayMethod(m)}
              type="button"
            >
              {m === 'UPI' ? '💸 UPI' : m === 'WALLET' ? `👜 Wallet (₹${currentUser?.walletBalance.toLocaleString('en-IN')})` : '💳 Card'}
            </button>
          ))}
        </div>

        {payMethod === 'UPI' && (
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="upi-id">UPI ID</label>
            <input
              id="upi-id"
              className="form-input font-mono"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              placeholder="yourname@upi"
            />
            <span className="text-xs text-muted">
              <MockBadge label="Not real UPI" style={{ marginRight: 6 }} />
              No actual transaction will occur
            </span>
          </div>
        )}

        {payMethod === 'WALLET' && (
          <div className="inline-banner info" style={{ marginTop: 12 }}>
            <span>👜</span>
            <span>RailSaathi wallet balance: ₹{currentUser?.walletBalance.toLocaleString('en-IN')}
              {(currentUser?.walletBalance ?? 0) < amount && (
                <strong style={{ color: 'var(--color-error-600)' }}>
                  {' '}(insufficient — top up or use another method)
                </strong>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Error / retry banner */}
      {error && (
        <div className={`inline-banner ${error.code === 'PAYMENT_UNCERTAIN' ? 'warning' : 'error'} anim-fade-in`} role="alert">
          <span>{error.code === 'PAYMENT_UNCERTAIN' ? '⏳' : '⚠'}</span>
          <div>
            <div>{error.message}</div>
            {error.holdPreserved && (
              <div style={{ marginTop: 4, fontSize: 12 }}>✓ Hold still active · Idempotency key ensures no double charge</div>
            )}
          </div>
        </div>
      )}

      {/* Idempotency note */}
      {alreadyAttempted && (
        <div className="inline-banner info text-xs" role="status">
          <span>🔑</span>
          <span>Retry uses the same idempotency key — no risk of double charge even if you tap Pay multiple times.</span>
        </div>
      )}

      <button
        id="btn-pay-now"
        className="btn btn-success btn-full"
        onClick={handlePay}
        disabled={isProcessingPayment || (payMethod === 'WALLET' && (currentUser?.walletBalance ?? 0) < amount)}
        style={{ fontSize: 16, minHeight: 52 }}
      >
        {isProcessingPayment ? (
          <>
            <span className="processing-dots"><span/><span/><span/></span>
            Processing…
          </>
        ) : (
          alreadyAttempted ? `Retry payment · ₹${amount.toLocaleString('en-IN')}` : `Pay ₹${amount.toLocaleString('en-IN')}`
        )}
      </button>

      <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
        Secured by demo gateway · No real payment data is collected
      </p>
    </div>
  );
};

export default PaymentScreen;
