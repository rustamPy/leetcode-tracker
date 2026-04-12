import { useState, useEffect, useRef } from "react";
import { validateUsername, getCacheEntry, clearCacheForUser, getCachedUsernames, getSession, setSession, clearSession } from "../services/leetcodeAPI";
import { getLCCookieNames, deleteCookie } from "../services/cookieUtils";
import { useLeetCode } from "../hooks/useLeetCode";

export default function UsernameModal({ onClose }) {
  const { username: current, changeUsername, clearCache, clearCookies, refresh, sessionUser, sessionMismatch, recheckSession } = useLeetCode();

  const [input,     setInput]     = useState(current);
  const [state,     setState]     = useState("idle");
  const [errMsg,    setErrMsg]    = useState("");
  const [preview,   setPreview]   = useState(null);
  const [cached,    setCached]    = useState([]);
  const [cookies,   setCookies]   = useState([]);
  const [session,   setSessionUI] = useState(() => getSession());
  const [sessMsg,   setSessMsg]   = useState("");
  const timerRef = useRef(null);

  const refreshLists = () => {
    setCached(getCachedUsernames());
    setCookies(getLCCookieNames());
  };

  useEffect(() => { refreshLists(); }, []);

  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.toLowerCase() === current.toLowerCase()) {
      setState("idle");
      setPreview(null);
      return;
    }
    setState("validating");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const { valid, error, avatar } = await validateUsername(trimmed);
      if (valid) {
        setState("valid");
        setPreview(avatar ?? null);
      } else {
        setState("invalid");
        setErrMsg(error ?? "Not found");
        setPreview(null);
      }
    }, 600);
    return () => clearTimeout(timerRef.current);
  }, [input, current]);

  const handleConfirm = () => {
    if (state !== "valid" && input.trim().toLowerCase() !== current.toLowerCase()) return;
    changeUsername(input.trim());
    onClose();
  };

  const handleClearOne = (u) => {
    clearCacheForUser(u);
    refreshLists();
  };

  const handleClearAll = () => {
    clearCache();
    refreshLists();
    onClose();
  };

  const handleClearCookies = () => {
    clearCookies();
    refreshLists();
  };

  const handleDeleteCookie = (name) => {
    deleteCookie(name);
    refreshLists();
  };

  const handleSaveSession = async () => {
    const trimmed = session.trim();
    setSession(trimmed);
    clearCacheForUser(current);
    refresh();
    await recheckSession();
    setSessMsg(trimmed ? "Session saved — refreshing data…" : "Session cleared.");
    setTimeout(() => setSessMsg(""), 3000);
  };

  const isCurrentUser = input.trim().toLowerCase() === current.toLowerCase();
  const canConfirm    = isCurrentUser || state === "valid";

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--narrow" onClick={e => e.stopPropagation()}>

        <div className="modal-head">
          <h3>LeetCode Account</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="um-body">

        {/* Username input */}
        <div className="um-section">
          <label className="um-label">Username</label>
          <div className="um-input-wrap">
            <input
              autoFocus
              className={`um-input ${state === "valid" ? "um-input--ok" : state === "invalid" ? "um-input--err" : ""}`}
              placeholder="LeetCode username"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canConfirm && handleConfirm()}
              spellCheck={false}
            />
            <span className="um-indicator">
              {state === "validating" && <span className="um-spin" />}
              {state === "valid"      && "✓"}
              {state === "invalid"    && "✗"}
            </span>
          </div>

          {state === "invalid" && <p className="um-err">{errMsg}</p>}

          {state === "valid" && preview && (
            <div className="um-preview">
              <img src={preview} alt="avatar" className="um-avatar" />
              <span className="um-valid-msg">Valid LeetCode user</span>
            </div>
          )}

          <button
            className="btn-primary um-confirm"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {isCurrentUser ? "Keep current" : "Switch to this account"}
          </button>
        </div>

        {/* Cache management */}
        <div className="um-section um-cache-section">
          <div className="um-cache-head">
            <span className="um-label">Cached accounts</span>
            {cached.length > 0 && (
              <button className="um-clear-all" onClick={handleClearAll}>Clear all</button>
            )}
          </div>

          {cached.length === 0 && (
            <p className="um-cache-empty">No cached data</p>
          )}

          {cached.map(u => {
            const entry = getCacheEntry(u);
            const age   = entry ? Math.round((Date.now() - entry.cachedAt) / 60000) : null;
            const ageStr = age === null ? "" : age < 60 ? `${age}m ago` : `${Math.round(age / 60)}h ago`;
            return (
              <div key={u} className={`um-cache-row ${u === current.toLowerCase() ? "um-cache-row--active" : ""}`}>
                <div className="um-cache-info">
                  <span className="um-cache-user">{u}</span>
                  {ageStr && <span className="um-cache-age">{ageStr}</span>}
                  {u === current.toLowerCase() && <span className="um-cache-badge">active</span>}
                </div>
                <div className="um-cache-actions">
                  <button className="um-cache-use" onClick={() => { changeUsername(u); onClose(); }}>Use</button>
                  <button className="um-cache-del" onClick={() => handleClearOne(u)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cookie management */}
        <div className="um-section um-cache-section">
          <div className="um-cache-head">
            <span className="um-label">Cookies</span>
            {cookies.length > 0 && (
              <button className="um-clear-all" onClick={handleClearCookies}>Clear all</button>
            )}
          </div>

          {cookies.length === 0 && (
            <p className="um-cache-empty">No cookies set</p>
          )}

          {cookies.map(name => (
            <div key={name} className="um-cache-row">
              <div className="um-cache-info">
                <span className="um-cache-user">{name}</span>
                <span className="um-cache-age">cookie</span>
              </div>
              <div className="um-cache-actions">
                <button className="um-cache-del" onClick={() => handleDeleteCookie(name)}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Session token */}
        <div className="um-section">
          <label className="um-label">LeetCode session <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — unlocks full solve history)</span></label>
          <div className="um-input-wrap">
            <input
              className="um-input"
              type="password"
              placeholder="Paste LEETCODE_SESSION cookie value"
              value={session}
              onChange={e => setSessionUI(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <p style={{ fontSize: "0.72rem", opacity: 0.5, margin: "4px 0 8px" }}>
            Find it: leetcode.com → DevTools (F12) → Application → Cookies → LEETCODE_SESSION
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary um-confirm" style={{ flex: 1 }} onClick={handleSaveSession}>
              {session.trim() ? "Save session" : "Clear session"}
            </button>
          </div>
          {sessMsg && <p className="um-valid-msg" style={{ marginTop: 6 }}>{sessMsg}</p>}
          {sessionMismatch && (
            <p className="um-err" style={{ marginTop: 6 }}>
              Session belongs to <strong>{sessionUser}</strong> but app is tracking <strong>{current}</strong>. Log in to LeetCode as <strong>{current}</strong> and update your session.
            </p>
          )}
        </div>

        </div>{/* /um-body */}
      </div>
    </div>
  );
}
