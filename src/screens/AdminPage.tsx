/**
 * AdminPage.tsx — Admin panel page (§34.1)
 */
import React from 'react';
import AppShell from '../components/layout/AppShell';
import AdminDashboard from '../components/admin/AdminDashboard';
import { useProfileStore } from '../store/profile-store';

const AdminPage: React.FC = () => {
  const { language } = useProfileStore();

  return (
    <AppShell showProgress={false}>
      <div className="admin-page-wrapper container-wide" style={{ padding: '24px 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="text-2xl font-bold">
            {language === 'hi' ? 'एडमिन डैशबोर्ड' : 'Admin Dashboard'}
          </h1>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            Live system state · Demo trigger control · Audit log · §34.1
          </p>
        </div>
        <AdminDashboard />
      </div>
    </AppShell>
  );
};

export default AdminPage;
