import { useState } from "react";
import { setSession } from "../services/leetcodeAPI";
import { useLeetCode } from "../hooks/useLeetCode";

/**
 * Full-page overlay shown when no valid LEETCODE_SESSION is stored.
 * Phase 1: prompt user to log in to LeetCode.
 * Phase 2 (after clicking the button): show cookie paste field.
 */
export default function LoginOverlay({ onDismiss }) {
  const { username, recheckSession, refresh } = useLeetCode();
  const [phase, setPhase] = useState(1); // 1 = prompt login, 2 = paste cookie
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState(""); // "ok" | "err" | ""
  const [saving, setSaving] = useState(false);

  const handleOpenLeetCode = () => {
    window.open("https://leetcode.com/accounts/login/", "_blank", "noopener,noreferrer");
    setPhase(2);
  };

  const handleSave = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    setSaving(true);
    setStatus("Verifying session…");
    setStatusType("");

    setSession(trimmed);
    await recheckSession();
    refresh();
    setStatus("Session saved — loading your data…");
    setStatusType("ok");
    setTimeout(() => onDismiss(), 800);
    setSaving(false);
  };

  return (
    <div className="lo-backdrop" role="dialog" aria-modal="true" aria-label="Log in to LeetCode">
      <div className="lo-box">
        <h2 className="lo-title">Connect your LeetCode account</h2>
        <p className="lo-subtitle">
          Sign in to LeetCode so the app can sync all solved problems for{" "}
          <strong>{username}</strong>.
        </p>

        {phase === 1 && (
          <button className="lo-btn-open" onClick={handleOpenLeetCode}>
            Log in to LeetCode →
          </button>
        )}

        {phase === 2 && (
          <>
            <p className="lo-step-hint">
              After signing in, open DevTools (F12) → Application → Cookies →
              copy the <code>LEETCODE_SESSION</code> value and paste it below. 
              Don't worry, it's safe!
            </p>
            <div className="lo-input-row">
              <input
                className="lo-input"
                type="password"
                placeholder="Paste LEETCODE_SESSION value…"
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !saving && handleSave()}
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              <button
                className="lo-btn-save"
                onClick={handleSave}
                disabled={!token.trim() || saving}
              >
                {saving ? "Saving…" : "Connect"}
              </button>
            </div>
            {status && (
              <p className={`lo-status lo-status--${statusType}`}>{status}</p>
            )}
            <button className="lo-btn-back" onClick={() => setPhase(1)}>
              ← Back
            </button>
          </>
        )}

        <button className="lo-btn-skip" onClick={onDismiss}>
          Continue without session (limited history)
        </button>
      </div>
    </div>
  );
}
