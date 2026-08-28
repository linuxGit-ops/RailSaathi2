/**
 * AdminDashboard.tsx — Live view of system state (§34.1)
 * Shows real-time holds, queue entries, payments, and recent audit events.
 */
import React, { useEffect } from 'react';
import { useAdminStore } from '../../store/admin-store';
import DemoTriggers from './DemoTriggers';

const AdminDashboard: React.FC = () => {
  const { holds, queueEntries, payments, sessions, recentEvents, refreshData } = useAdminStore();

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const activeHolds   = holds.filter(h => h.status === 'ACTIVE');
  const confirmedBookings = holds.filter(h => h.status === 'CONFIRMED');
  const totalPayments = payments.reduce((s, p) => s + (p.status === 'SUCCESS' ? p.amount : 0), 0);

  return (
    <div className="admin-dashboard">
      {/* Stats row */}
      <div className="admin-stats-row">
        {[
          { label: 'Active holds', value: activeHolds.length, color: 'var(--color-accent-600)' },
          { label: 'In queue', value: queueEntries.length, color: 'var(--color-primary-600)' },
          { label: 'Confirmed bookings', value: confirmedBookings.length, color: 'var(--color-success-600)' },
          { label: 'Revenue (simulated)', value: `₹${totalPayments.toLocaleString('en-IN')}`, color: 'var(--color-success-600)' },
          { label: 'Active sessions', value: sessions.length, color: 'var(--color-text-muted)' },
        ].map(stat => (
          <div key={stat.label} className="admin-stat-card card card-sm">
            <div className="admin-stat-value font-mono font-bold" style={{ color: stat.color, fontSize: 24 }}>
              {stat.value}
            </div>
            <div className="text-muted text-xs">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Demo Triggers */}
      <DemoTriggers />

      {/* Live tables */}
      <div className="admin-tables-grid">
        {/* Active holds */}
        <div className="admin-table-card card card-sm">
          <h4 className="admin-table-title">Active Holds (§10)</h4>
          {activeHolds.length === 0 ? (
            <p className="text-muted text-sm">No active holds</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Hold ID</th><th>Seats</th><th>Expires</th><th>Status</th></tr>
              </thead>
              <tbody>
                {activeHolds.slice(0, 8).map(h => {
                  const remainMs = Math.max(0, h.expiresAt - Date.now());
                  const remainMin = Math.ceil(remainMs / 60000);
                  return (
                    <tr key={h.holdId}>
                      <td className="font-mono text-xs">{h.holdId.slice(0, 16)}…</td>
                      <td className="text-xs">{h.seatIds.length} seat{h.seatIds.length !== 1 ? 's' : ''}</td>
                      <td className="font-mono text-xs">{remainMin}m</td>
                      <td><span className="badge badge-warning">{h.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Queue */}
        <div className="admin-table-card card card-sm">
          <h4 className="admin-table-title">Queue Entries (§12)</h4>
          {queueEntries.length === 0 ? (
            <p className="text-muted text-sm">Queue is empty</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>User</th><th>Position</th><th>Route</th><th>CAPTCHA</th></tr>
              </thead>
              <tbody>
                {queueEntries.slice(0, 8).map(e => (
                  <tr key={e.userId}>
                    <td className="text-xs">{e.userId.slice(0, 12)}</td>
                    <td className="font-mono">#{e.position}</td>
                    <td className="text-xs">{e.goal.fromCode}→{e.goal.toCode}</td>
                    <td><span className={`badge ${e.captchaPassed ? 'badge-success' : 'badge-error'}`}>{e.captchaPassed ? '✓' : '✗'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent payments */}
        <div className="admin-table-card card card-sm">
          <h4 className="admin-table-title">Payments (§18.1)</h4>
          {payments.length === 0 ? (
            <p className="text-muted text-sm">No payments yet</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {payments.slice(-6).reverse().map(p => (
                  <tr key={p.paymentId}>
                    <td className="font-mono text-xs">{p.paymentId.slice(0, 14)}…</td>
                    <td className="font-mono">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${p.status === 'SUCCESS' ? 'badge-success' : p.status === 'FAILED' ? 'badge-error' : p.status === 'REFUNDED' ? 'badge-warning' : 'badge-primary'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Audit event log */}
      <div className="card card-sm">
        <h4 className="admin-table-title">Recent Events (§20 Audit Log)</h4>
        <div className="audit-log-list">
          {recentEvents.length === 0 ? (
            <p className="text-muted text-sm">No events yet — trigger something above.</p>
          ) : (
            recentEvents.slice(0, 20).map((evt, i) => (
              <div key={i} className="audit-log-item font-mono text-xs">
                {evt}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
