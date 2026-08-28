/**
 * DemoTriggers.tsx — Admin demo remote control (§34.1)
 * "Makes the admin account the demo remote control — judges can trigger
 *  the 'hard' scenarios live instead of those only being described in slides."
 */
import React, { useState } from 'react';
import { useAdminStore } from '../../store/admin-store';
import { useBookingStore } from '../../store/booking-store';
import { fireTrainDisruption } from '../../services/disruption-service';
import { simulateTatkalBurst } from '../../services/queue-service';
import { getAllHolds, forceExpireHold } from '../../services/hold-service';

const DemoTriggers: React.FC = () => {
  const adminStore = useAdminStore();
  const { session, setDisruption, currentHold } = useBookingStore();
  const [busyTrigger, setBusyTrigger] = useState<string | null>(null);

  const trigger = async (id: string, fn: () => Promise<void>) => {
    setBusyTrigger(id);
    try { await fn(); }
    finally { setBusyTrigger(null); }
  };

  const fireDisruption = () => trigger('disruption', async () => {
    const bid = session?.bookingAttemptId ?? 'ADMIN-DEMO';
    const result = await fireTrainDisruption('12301', '2026-09-27', 'CANCELLED', [], bid);
    adminStore.addEvent(`🚨 TrainDisruption fired: ${result.disruption.type} · ${result.disruption.trainNumber} · ${result.refundsInitiated} refunds initiated`);
    setDisruption(true, result.disruption.description);
    adminStore.refreshData();
  });

  const forcePayFail = () => trigger('payfail', async () => {
    adminStore.setNextPaymentFails(true);
    adminStore.addEvent('💳 Next payment will FAIL (injected)');
  });

  const forcePayTimeout = () => trigger('paytimeout', async () => {
    adminStore.setNextPaymentTimesOut(true);
    adminStore.addEvent('⏱️ Next payment will TIMEOUT (injected)');
  });

  const forceHoldExpiry = () => trigger('holdexpiry', async () => {
    const activeHolds = getAllHolds().filter(h => h.status === 'ACTIVE');
    if (activeHolds.length === 0) {
      adminStore.addEvent('⚠️ No active holds to expire');
      return;
    }
    activeHolds.forEach(h => {
      forceExpireHold(h.holdId);
      adminStore.addEvent(`⏱️ Force-expired hold ${h.holdId}`);
    });
    adminStore.refreshData();
  });

  const fireTatkalBurst = () => trigger('tatkal', async () => {
    simulateTatkalBurst(150);
    adminStore.setTatkalBurstActive(true);
    adminStore.addEvent('⚡ Tatkal burst simulated: 150 virtual users in lobby, randomized batch release starting');
    setTimeout(() => adminStore.setTatkalBurstActive(false), 8000);
  });

  const resetAll = () => trigger('reset', async () => {
    import('../../services/disruption-service').then(m => m.clearDisruptions());
    import('../../services/queue-service').then(m => m.resetQueue());
    useBookingStore.getState().setDisruption(false);
    adminStore.addEvent('🔄 All demo state reset');
    adminStore.refreshData();
  });

  type Btn = {
    id: string;
    icon: string;
    label: string;
    desc: string;
    cls: string;
    fn: () => void;
  };

  const buttons: Btn[] = [
    {
      id: 'trigger-disruption',
      icon: '🚨',
      label: 'Fire TrainDisruption',
      desc: 'CANCELLED event → mass refund cascade → AI proactively offers alternatives (§22)',
      cls: 'btn-danger',
      fn: fireDisruption,
    },
    {
      id: 'trigger-pay-fail',
      icon: '💳',
      label: 'Force payment failure',
      desc: 'Next payment returns FAILED → inline banner, hold preserved, retry works (§19)',
      cls: 'btn-danger',
      fn: forcePayFail,
    },
    {
      id: 'trigger-pay-timeout',
      icon: '⏱️',
      label: 'Force payment timeout',
      desc: 'Next payment returns TIMEOUT → uncertain state → reconciliation resolves (§11)',
      cls: 'btn-danger',
      fn: forcePayTimeout,
    },
    {
      id: 'trigger-hold-expiry',
      icon: '🔓',
      label: 'Expire active holds',
      desc: 'Force all active holds to expire immediately, triggering reconciliation sweep (§10)',
      cls: 'btn-danger',
      fn: forceHoldExpiry,
    },
    {
      id: 'trigger-tatkal-burst',
      icon: '⚡',
      label: 'Simulate Tatkal burst',
      desc: '150 virtual users hit queue simultaneously → lobby + randomized batch release (§12.2)',
      cls: 'btn-secondary',
      fn: fireTatkalBurst,
    },
    {
      id: 'trigger-reset-all',
      icon: '🔄',
      label: 'Reset all demo state',
      desc: 'Clear disruptions, queue, and injected failure flags',
      cls: 'btn-ghost',
      fn: resetAll,
    },
  ];

  return (
    <section className="demo-triggers-section">
      <div className="triggers-header">
        <h3 className="font-semibold" style={{ fontSize: 16 }}>Demo Remote Control</h3>
        <p className="text-muted text-sm">
          Trigger failure/disruption scenarios live for the judge walkthrough.
          Each button corresponds to a numbered section in the architecture doc.
        </p>
      </div>

      <div className="triggers-grid">
        {buttons.map(btn => (
          <div key={btn.id} className="trigger-card card card-sm">
            <div className="trigger-card-icon">{btn.icon}</div>
            <div className="trigger-card-body">
              <div className="font-medium" style={{ fontSize: 14 }}>{btn.label}</div>
              <div className="text-muted text-xs" style={{ marginTop: 2, lineHeight: 1.4 }}>{btn.desc}</div>
            </div>
            <button
              id={btn.id}
              className={`btn ${btn.cls}`}
              style={{ minHeight: 36, padding: '6px 16px', fontSize: 13, whiteSpace: 'nowrap' }}
              onClick={btn.fn}
              disabled={busyTrigger !== null}
              aria-label={btn.label}
            >
              {busyTrigger === btn.id ? '…' : 'Fire'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DemoTriggers;
