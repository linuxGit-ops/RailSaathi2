/**
 * admin-store.ts — Admin panel state (§34.1)
 * Live view of holds, queue, bookings + demo trigger controls.
 */
import { create } from 'zustand';
import type { Hold } from '../services/hold-service';
import type { QueueEntry } from '../services/queue-service';
import type { PaymentRecord } from '../services/payment-service';
import type { BookingSessionData } from '../services/booking-session';
import type { TrainDisruption } from '../services/disruption-service';

export interface AdminState {
  // Live data snapshots (refreshed periodically)
  holds: Hold[];
  queueEntries: QueueEntry[];
  payments: PaymentRecord[];
  sessions: BookingSessionData[];
  disruptions: TrainDisruption[];

  // Trigger states
  nextPaymentFails: boolean;
  nextPaymentTimesOut: boolean;
  tatkalBurstActive: boolean;

  // Log
  recentEvents: string[];

  // Actions
  refreshData: () => void;
  addEvent: (msg: string) => void;
  setNextPaymentFails: (v: boolean) => void;
  setNextPaymentTimesOut: (v: boolean) => void;
  setTatkalBurstActive: (v: boolean) => void;
  setHolds: (holds: Hold[]) => void;
  setQueueEntries: (entries: QueueEntry[]) => void;
  setPayments: (payments: PaymentRecord[]) => void;
  setSessions: (sessions: BookingSessionData[]) => void;
  setDisruptions: (disruptions: TrainDisruption[]) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  holds: [],
  queueEntries: [],
  payments: [],
  sessions: [],
  disruptions: [],
  nextPaymentFails: false,
  nextPaymentTimesOut: false,
  tatkalBurstActive: false,
  recentEvents: [],

  refreshData: () => {
    // Called by AdminDashboard on a tick; imports happen lazily to avoid circular deps
    import('../services/hold-service').then(m => set({ holds: m.getAllHolds() }));
    import('../services/queue-service').then(m => set({ queueEntries: m.getAllQueueEntries() }));
    import('../services/payment-service').then(m => set({ payments: m.getAllPayments() }));
    import('../services/booking-session').then(m => set({ sessions: m.getAllSessions() }));
    import('../services/disruption-service').then(m => set({ disruptions: m.getActiveDisruptions() }));
  },

  addEvent: (msg) => {
    const ts = new Date().toLocaleTimeString('en-IN');
    set(s => ({ recentEvents: [`[${ts}] ${msg}`, ...s.recentEvents].slice(0, 50) }));
  },

  setNextPaymentFails: (v) => {
    set({ nextPaymentFails: v });
    if (v) {
      import('../services/payment-service').then(m => m.adminForceNextPaymentFail());
      get().addEvent('⚠️ Next payment will FAIL (injected)');
    }
  },

  setNextPaymentTimesOut: (v) => {
    set({ nextPaymentTimesOut: v });
    if (v) {
      import('../services/payment-service').then(m => m.adminForceNextPaymentTimeout());
      get().addEvent('⏱️ Next payment will TIMEOUT (injected)');
    }
  },

  setTatkalBurstActive: (v) => set({ tatkalBurstActive: v }),

  setHolds: (holds) => set({ holds }),
  setQueueEntries: (queueEntries) => set({ queueEntries }),
  setPayments: (payments) => set({ payments }),
  setSessions: (sessions) => set({ sessions }),
  setDisruptions: (disruptions) => set({ disruptions }),
}));
