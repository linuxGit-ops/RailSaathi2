/**
 * App.tsx — Root router + auth gate
 */
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useProfileStore } from './store/profile-store';
import { useBookingStore } from './store/booking-store';
import { resumeSession } from './services/booking-session';
import { appendAuditEntry } from './services/audit-log';
import LoginScreen from './components/auth/LoginScreen';
import BookingFlow from './screens/BookingFlow';
import AdminPage from './screens/AdminPage';

const App: React.FC = () => {
  const { currentUser } = useProfileStore();
  const { setSession, setStage, stage } = useBookingStore();
  const [loginDone, setLoginDone] = useState(false);

  // On app load: attempt session resumption (§3.1)
  useEffect(() => {
    if (loginDone) {
      const resumed = resumeSession();
      if (resumed) {
        setSession(resumed);
        setStage(resumed.stage);
        appendAuditEntry(resumed.bookingAttemptId, 'system', 'session_resumed',
          `Session resumed after reconnect at stage: ${resumed.stage}`, { sessionToken: resumed.sessionToken });
      }
    }
  }, [loginDone, setSession, setStage]);

  if (!currentUser) {
    return (
      <LoginScreen onLoginSuccess={() => setLoginDone(true)} />
    );
  }

  if (currentUser.isAdmin) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminPage />} />
          <Route path="/booking" element={<BookingFlow />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BookingFlow />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
