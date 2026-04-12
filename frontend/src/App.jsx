import { useState } from "react";
import { LCProvider, useLeetCode } from "./hooks/useLeetCode";
import { getSession } from "./services/leetcodeAPI";
import Profile from "./components/Profile";
import StatsStrip from "./components/StatsStrip";
import Board from "./components/Board";
import LoginOverlay from "./components/LoginOverlay";
import MismatchBanner from "./components/MismatchBanner";
import "./App.css";

function AppInner() {
  const { username, sessionChecked, sessionMismatch } = useLeetCode();
  const [showLogin, setShowLogin] = useState(false);
  // Track when the user explicitly dismissed the overlay without adding a session.
  // Prevents the overlay re-appearing on every render while they browse without one.
  const [sessionDismissed, setSessionDismissed] = useState(false);

  // Show login overlay once session check is done and no session is stored,
  // unless the user has already dismissed it this session.
  const showLoginOverlay = sessionChecked && !getSession() && !sessionDismissed;

  const handleDismissLogin = () => {
    setShowLogin(false);
    setSessionDismissed(true);
  };

  return (
    <div className="app">
      {(showLoginOverlay || showLogin) && (
        <LoginOverlay onDismiss={handleDismissLogin} />
      )}

      <header className="header">
        {sessionMismatch && (
          <MismatchBanner onRequestLogin={() => setShowLogin(true)} />
        )}
        <div className="header-inner">
          <div className="masthead">
            <span className="masthead-label">PROBLEM TRACKER</span>
            <h1 className="masthead-title">LeetCode Log</h1>
            <span className="masthead-sub">{username} / daily practice record</span>
          </div>
          <a className="header-link" href={`https://leetcode.com/${username}`} target="_blank" rel="noreferrer">
            Open Profile
          </a>
        </div>
        <div className="header-rule" />
      </header>

      <main className="main">
        <Profile />
        <StatsStrip />
        <section className="board-section">
          <div className="section-label">BOARD</div>
          <Board />
        </section>
      </main>

      <footer className="footer">
        <span>{username} &mdash; LeetCode Tracker</span>
        <a href={`https://leetcode.com/${username}`} target="_blank" rel="noreferrer">
          leetcode.com/{username}
        </a>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LCProvider>
      <AppInner />
    </LCProvider>
  );
}
