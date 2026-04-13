import { useState } from "react";

const STEPS = [
  {
    num: "01",
    title: "Open the menu bar app",
    body: "Click the LeetCode Tracker icon in your macOS menu bar. The board, company browser, and your stats are all one click away — no browser required.",
  },
  {
    num: "02",
    title: "Connect your LeetCode account",
    body: (
      <>
        The app needs your <code>LEETCODE_SESSION</code> cookie to fetch private
        submission data. Open the login prompt, sign in to LeetCode, then copy
        the session value from DevTools (F12 → Application → Cookies) and paste
        it in. See the{" "}
        <a
          href="#cookie-disclaimer"
          className="docs-inline-link"
          onClick={e => {
            e.preventDefault();
            document.getElementById("cookie-disclaimer")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          cookie disclaimer
        </a>{" "}
        below — it's safe.
      </>
    ),
  },
  {
    num: "03",
    title: "Manage your problem board",
    body: "Drag problems between To Do / In Progress / Done. Accepted LeetCode submissions appear in the Completed column automatically. Add problems manually with the + button.",
  },
  {
    num: "04",
    title: "Browse by company",
    body: "Pick any of 3,600+ company tags to filter the full problem list. The \"Suggested\" tab shows problems ranked by ML similarity to that company's typical problem style.",
  },
  {
    num: "05",
    title: "Open a problem drawer",
    body: "Click any problem card to open the side drawer — full description, topic tags, hints, and a direct link to LeetCode, all without leaving the app.",
  },
];

export default function DocsSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="docs-section">
      <button
        className="docs-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="docs-toggle-label">DOCS &amp; INSTALL</span>
        <span className="docs-toggle-icon">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="docs-body">

          {/* ── Install ────────────────────────────────────────────── */}
          <div className="docs-block">
            <div className="docs-block-label">INSTALL — macOS only</div>

            <div className="docs-install-cards">
              <div className="docs-install-card docs-install-card--primary">
                <div className="docs-install-card-badge">Recommended</div>
                <div className="docs-install-card-title">Homebrew</div>
                <div className="docs-install-card-body">
                  The fastest way. Homebrew handles installation and macOS
                  security warnings automatically.
                </div>
                <div className="docs-codeblock">
                  <pre>
                    <span className="docs-code-comment"># Add the tap once</span>
                    {"\n"}brew tap rustamPy/tap{"\n"}
                    {"\n"}
                    <span className="docs-code-comment"># Install the cask</span>
                    {"\n"}brew install --cask leetcode-tracker
                  </pre>
                </div>
                <div className="docs-install-card-body docs-muted">
                  To update later: <code>brew upgrade --cask leetcode-tracker</code>
                </div>
              </div>

              <div className="docs-install-card">
                <div className="docs-install-card-title">Manual download</div>
                <div className="docs-install-card-body">
                  Go to the{" "}
                  <a
                    className="docs-inline-link"
                    href="https://github.com/rustamPy/leetcode-tracker/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    latest release
                  </a>{" "}
                  and download the right <code>.dmg</code> for your Mac:
                </div>
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Who it's for</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>*-arm64.dmg</code></td>
                      <td>Apple Silicon (M1+)</td>
                    </tr>
                    <tr>
                      <td><code>*-x64.dmg</code></td>
                      <td>Intel Mac</td>
                    </tr>
                  </tbody>
                </table>
                <div className="docs-install-card-body docs-muted">
                  Open the .dmg, drag to /Applications. If macOS says the app is
                  "damaged", run this once in Terminal:
                </div>
                <div className="docs-codeblock docs-codeblock--sm">
                  <pre>{`find "/Applications/LeetCode Tracker.app" -exec xattr -d com.apple.quarantine {} \\; 2>/dev/null; true`}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* ── How to use ─────────────────────────────────────────── */}
          <div className="docs-block">
            <div className="docs-block-label">HOW TO USE</div>
            <ol className="docs-steps">
              {STEPS.map(s => (
                <li key={s.num} className="docs-step">
                  <div className="docs-step-num">{s.num}</div>
                  <div className="docs-step-content">
                    <div className="docs-step-title">{s.title}</div>
                    <div className="docs-step-body">{s.body}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* ── Cookie disclaimer ──────────────────────────────────── */}
          <div className="docs-block docs-block--disclaimer" id="cookie-disclaimer">
            <div className="docs-block-label">COOKIE DISCLAIMER</div>
            <div className="docs-disclaimer">
              <div className="docs-disclaimer-icon">🔒</div>
              <div className="docs-disclaimer-content">
                <p className="docs-disclaimer-headline">
                  We ask for your <code>LEETCODE_SESSION</code> cookie — here's
                  exactly what we do (and don't) do with it.
                </p>
                <ul className="docs-disclaimer-list">
                  <li>
                    <strong>Why we need it.</strong> LeetCode's API requires an
                    authenticated session to return your personal submission
                    history and streak data. Without the cookie, the app can only
                    show public profile information.
                  </li>
                  <li>
                    <strong>Where it lives.</strong> The cookie value is stored
                    only in your browser's <code>localStorage</code> (or inside
                    the Electron app's local storage on your Mac). It never
                    leaves your device in any form other than the LeetCode API
                    requests described below.
                  </li>
                  <li>
                    <strong>How it travels.</strong> API calls go directly from
                    your browser/app to LeetCode (or through the Cloudflare
                    proxy that relays requests to LeetCode). The proxy forwards
                    the request and returns the response — it does not log, store,
                    or inspect the cookie value. The{" "}
                    <a
                      className="docs-inline-link"
                      href="https://github.com/rustamPy/leetcode-tracker/blob/main/cloudflare-worker/worker.js"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      proxy source code is public
                    </a>{" "}
                    — feel free to read it.
                  </li>
                  <li>
                    <strong>No accounts, no collection.</strong> This app has no
                    backend database, no user accounts, and no analytics. There
                    is no server that could receive or store your credentials even
                    if it wanted to.
                  </li>
                  <li>
                    <strong>Revoking access.</strong> Log out of LeetCode — that
                    invalidates the session immediately. You can also clear
                    the stored value any time in Settings → Storage.
                  </li>
                </ul>
                <p className="docs-disclaimer-footer">
                  Still skeptical? The entire codebase is open source at{" "}
                  <a
                    className="docs-inline-link"
                    href="https://github.com/rustamPy/leetcode-tracker"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    github.com/rustamPy/leetcode-tracker
                  </a>
                  . Read it, fork it, audit it.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </section>
  );
}
