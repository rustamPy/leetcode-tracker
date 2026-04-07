import Profile from "./components/Profile";
import Board from "./components/Board";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="masthead">
            <span className="masthead-label">PROBLEM TRACKER</span>
            <h1 className="masthead-title">LeetCode Log</h1>
            <span className="masthead-sub">thisisrustam / daily practice record</span>
          </div>
          <a
            className="header-link"
            href="https://leetcode.com/thisisrustam"
            target="_blank"
            rel="noreferrer"
          >
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
        <span>thisisrustam &mdash; LeetCode Tracker</span>
        <a href="https://leetcode.com/thisisrustam" target="_blank" rel="noreferrer">leetcode.com/thisisrustam</a>
      </footer>
    </div>
  );
}
