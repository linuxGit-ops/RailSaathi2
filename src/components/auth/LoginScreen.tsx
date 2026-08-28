/**
 * LoginScreen.tsx — Login form + Demo accounts panel (§34.1)
 * "Displayed as a distinct, styled panel — reads as intentional design, not debug text."
 */
import React, { useState } from 'react';
import { useProfileStore } from '../../store/profile-store';
import { MockBadge } from '../layout/MockBadge';
import { useBookingStore } from '../../store/booking-store';
import { createSession } from '../../services/booking-session';
import { startReconciliationSweep } from '../../services/hold-service';

interface Props {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const { login, language } = useProfileStore();
  const { setSession } = useBookingStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600)); // Simulate auth

    const success = login(email.trim(), password);
    if (success) {
      // Start reconciliation sweep on login (§10)
      startReconciliationSweep();
      // Get the current user from the store after login
      const { currentUser: loggedUser } = useProfileStore.getState();
      if (loggedUser) {
        const session = createSession(loggedUser.userId);
        setSession(session);
      }
      onLoginSuccess();
    } else {
      setError('Invalid credentials. Use a demo account below.');
    }
    setIsLoading(false);
  };

  const fillDemo = (type: 'citizen' | 'admin') => {
    setEmail(type === 'citizen' ? 'demo.user@example.test' : 'demo.admin@example.test');
    setPassword(type === 'citizen' ? 'Demo@1234' : 'Admin@1234');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern" aria-hidden="true" />

      <div className="login-card card anim-fade-in-up">
        {/* Brand */}
        <div className="login-brand">
          <span className="login-brand-icon">🚂</span>
          <h1 className="login-title">RailSaathi</h1>
          <p className="login-subtitle text-muted">
            {language === 'hi'
              ? 'आपकी यात्रा, बेहतर तरीके से'
              : 'Your journey, reimagined'}
          </p>
        </div>

        <hr className="divider" />

        {/* Login form */}
        <form onSubmit={handleLogin} noValidate>
          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                {language === 'hi' ? 'ईमेल / मोबाइल' : 'Email or Mobile'}
              </label>
              <input
                id="login-email"
                type="email"
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="you@example.test"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                {language === 'hi' ? 'पासवर्ड' : 'Password'}
              </label>
              <input
                id="login-password"
                type="password"
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div id="login-error" className="inline-banner error" role="alert">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isLoading}
            >
              {isLoading
                ? (language === 'hi' ? 'लॉग इन हो रहा है…' : 'Signing in…')
                : (language === 'hi' ? 'लॉग इन करें' : 'Sign in')}
            </button>
          </div>
        </form>

        {/* Demo accounts panel (§34.1) */}
        <div className="demo-accounts-panel">
          <div className="demo-accounts-header">
            <span className="demo-accounts-label">Demo accounts</span>
            <MockBadge label="Demo only" />
          </div>

          <div className="demo-account-item" role="group" aria-label="Citizen demo account">
            <div className="demo-account-info">
              <span className="demo-account-icon">👤</span>
              <div>
                <div className="demo-account-type">Citizen account</div>
                <div className="demo-account-creds font-mono">
                  <div>demo.user@example.test</div>
                  <div>Demo@1234</div>
                </div>
              </div>
            </div>
            <button
              id="btn-use-citizen"
              className="btn btn-secondary"
              style={{ minHeight: 36, padding: '6px 16px', fontSize: 13 }}
              onClick={() => fillDemo('citizen')}
              type="button"
            >
              Use
            </button>
          </div>

          <div className="demo-account-item" role="group" aria-label="Admin demo account">
            <div className="demo-account-info">
              <span className="demo-account-icon">🛠</span>
              <div>
                <div className="demo-account-type">Admin account</div>
                <div className="demo-account-creds font-mono">
                  <div>demo.admin@example.test</div>
                  <div>Admin@1234</div>
                </div>
              </div>
            </div>
            <button
              id="btn-use-admin"
              className="btn btn-secondary"
              style={{ minHeight: 36, padding: '6px 16px', fontSize: 13 }}
              onClick={() => fillDemo('admin')}
              type="button"
            >
              Use
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
