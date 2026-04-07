import { LCProvider, useLeetCode } from "./hooks/useLeetCode";
import Profile from "./components/Profile";
import Board from "./components/Board";
import "./App.css";

function AppInner() {
  const { username } = useLeetCode();
  return (
    <div className="app">
      <header className="header">
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
