/**
 * AppShell.tsx — Root layout: header, content area, footer, language toggle
 */
import React from 'react';
import { useProfileStore } from '../../store/profile-store';
import { useBookingStore } from '../../store/booking-store';
import ProgressTracker from './ProgressTracker';
import NonAffiliationFooter from './NonAffiliationFooter';
import HoldCountdownHeader from '../hold/HoldCountdownHeader';

interface Props {
  children: React.ReactNode;
  showProgress?: boolean;
  showHoldCountdown?: boolean;
}

const AppShell: React.FC<Props> = ({ children, showProgress = false, showHoldCountdown = false }) => {
  const { currentUser, language, setLanguage, logout } = useProfileStore();
  const { stage, currentHold } = useBookingStore();

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header" role="banner">
        <div className="header-inner">
          <div className="header-brand">
            <span className="brand-icon" aria-hidden="true">🚂</span>
            <div>
              <span className="brand-name">RailSaathi</span>
              <span className="brand-tagline">
                {language === 'hi' ? 'आपकी यात्रा, बेहतर तरीके से' : 'Your journey, reimagined'}
              </span>
            </div>
          </div>

          <div className="header-actions">
            {/* Language toggle */}
            <button
              className="lang-toggle"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              aria-label={`Switch to ${language === 'en' ? 'Hindi' : 'English'}`}
              title="Toggle language"
            >
              {language === 'en' ? 'हि' : 'EN'}
            </button>

            {/* User info */}
            {currentUser && (
              <div className="header-user">
                <span className="user-name">{currentUser.name.split(' ')[0]}</span>
                <span className="wallet-balance">
                  ₹{currentUser.walletBalance.toLocaleString('en-IN')}
                </span>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', minHeight: 36, fontSize: 13 }} onClick={logout}>
                  {language === 'hi' ? 'बाहर' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hold countdown (persistent when seat is held §33) */}
        {showHoldCountdown && currentHold && (
          <HoldCountdownHeader hold={currentHold} language={language} />
        )}

        {/* Progress tracker */}
        {showProgress && (
          <div className="header-progress">
            <div className="container-wide">
              <ProgressTracker currentStage={stage} language={language} />
            </div>
          </div>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="app-main" role="main" id="main-content">
        {children}
      </main>

      {/* ── Footer ── */}
      <NonAffiliationFooter />
    </div>
  );
};

export default AppShell;
