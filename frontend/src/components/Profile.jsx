import { useState } from "react";
import { useLeetCode } from "../hooks/useLeetCode";
import UsernameModal from "./UsernameModal";

const TOTALS = { easy: 880, medium: 1842, hard: 816 };

function Bar({ label, value, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="bar-row">
      <span className="bar-label" style={{ color }}>{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="bar-val">{value}<span className="bar-tot">/{total}</span></span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="profile-card profile-card--skeleton">
      <div className="sk-avatar" />
      <div className="sk-lines">
        <div className="sk-line sk-line--w60" />
        <div className="sk-line sk-line--w40" />
        <div className="sk-line sk-line--w80 sk-line--thin" />
        <div className="sk-line sk-line--w80 sk-line--thin" />
        <div className="sk-line sk-line--w80 sk-line--thin" />
      </div>
    </div>
  );
}

export default function Profile() {
  const { username, data, loading, error, cachedAt, fromCache, refresh } = useLeetCode();
  const [showModal, setShowModal] = useState(false);

  if (loading && !data) return <Skeleton />;

  const cacheStr = cachedAt
    ? (() => {
        const mins = Math.round((Date.now() - cachedAt) / 60000);
        if (mins < 2)  return "just now";
        if (mins < 60) return `${mins}m ago`;
        return `${Math.round(mins / 60)}h ago`;
      })()
    : null;

  const p       = data?.profile ?? {};
  const solved  = data?.solved  ?? {};
  const contest = data?.contest ?? {};

  return (
    <>
      <div className="profile-card">
        {/* Left: avatar */}
        <div className="profile-avatar-wrap">
          {p.userAvatar
            ? <img src={p.userAvatar} alt={p.realName || username} className="profile-avatar" />
            : <div className="profile-avatar-placeholder">{username[0]?.toUpperCase()}</div>
          }
          {contest.rating > 0 && (
            <span className="profile-badge">{Math.round(contest.rating)}</span>
          )}
        </div>

        {/* Middle: name + meta + bars */}
        <div className="profile-body">
          <div className="profile-names">
            <h2 className="profile-name">{p.realName || username}</h2>
            <span className="profile-handle">@{username}</span>
          </div>

          <div className="profile-stat-row">
            {p.countryName && <span className="meta-chip">{p.countryName}</span>}
            {(data?.profile?.ranking ?? 0) > 0 && (
              <span className="meta-chip">#{(data.profile.ranking).toLocaleString()}</span>
            )}
            {contest.attended > 0 && (
              <span className="meta-chip">{contest.attended} contests</span>
            )}
          </div>

          <div className="profile-bars">
            <Bar label="Easy"   value={solved.easy   ?? 0} total={TOTALS.easy}   color="#00b8a3" />
            <Bar label="Medium" value={solved.medium  ?? 0} total={TOTALS.medium} color="#ffc01e" />
            <Bar label="Hard"   value={solved.hard    ?? 0} total={TOTALS.hard}   color="#ef4743" />
          </div>
        </div>

        {/* Right: total + actions */}
        <div className="profile-right">
          <div className="profile-total">
            <span className="profile-total-num">{solved.total ?? 0}</span>
            <span className="profile-total-label">solved</span>
          </div>

          <div className="profile-actions">
            <button className="btn-profile-action" onClick={() => setShowModal(true)} title="Change account">
              Account
            </button>
            <button
              className="btn-profile-action btn-profile-action--ghost"
              onClick={refresh}
              disabled={loading}
              title="Refresh data"
            >
              {loading ? "..." : "Refresh"}
            </button>
          </div>

          {cacheStr && (
            <span className="profile-cache-age">
              {fromCache ? "cached" : "live"} · {cacheStr}
            </span>
          )}
        </div>

        {error && <p className="profile-error">{error}</p>}
      </div>

      {showModal && <UsernameModal onClose={() => setShowModal(false)} />}
    </>
  );
}
