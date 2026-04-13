import { useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { LCProvider, useLeetCode } from "./hooks/useLeetCode";
import { getSession } from "./services/leetcodeAPI";
import Profile from "./components/Profile";
import StatsStrip from "./components/StatsStrip";
import Board from "./components/Board";
import LoginOverlay from "./components/LoginOverlay";
import MismatchBanner from "./components/MismatchBanner";
import DocsSection from "./components/DocsSection";
import EditorPage from "./components/EditorPage";
import "./App.css";

function AppInner() {
  const { username, sessionChecked, sessionMismatch } = useLeetCode();
  const [showLogin, setShowLogin] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const { pathname } = useLocation();
  const isEditor = pathname === "/editor";

  const showLoginOverlay = sessionChecked && !getSession() && !sessionDismissed;

  const handleDismissLogin = () => {
    setShowLogin(false);
    setSessionDismissed(true);
  };

  return (
    <div className={`app${isEditor ? " app--editor" : ""}`}>
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
        <nav className="tab-bar" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `tab-btn${isActive ? " tab-btn--active" : ""}`}
          >
            Board
          </NavLink>
          <NavLink
            to="/docs"
            className={({ isActive }) => `tab-btn${isActive ? " tab-btn--active" : ""}`}
          >
            Docs &amp; Install
          </NavLink>
          <NavLink
            to="/editor"
            className={({ isActive }) => `tab-btn${isActive ? " tab-btn--active" : ""}`}
          >
            Python Editor
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/editor" element={<EditorPage />} />
        <Route
          path="/"
          element={
            <main className="main">
              <Profile />
              <StatsStrip />
              <section className="board-section">
                <div className="section-label">BOARD</div>
                <Board />
              </section>
            </main>
          }
        />
        <Route
          path="/docs"
          element={
            <main className="main">
              <Profile />
              <StatsStrip />
              <DocsSection />
            </main>
          }
        />
      </Routes>

      {!isEditor && (
        <footer className="footer">
          <span>{username} &mdash; LeetCode Tracker</span>
          <a href={`https://leetcode.com/${username}`} target="_blank" rel="noreferrer">
            leetcode.com/{username}
          </a>
        </footer>
      )}
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
