import { useState, useEffect } from "react";
import { api } from "../services/api";

const DIFF = { Easy: "#059669", Medium: "#d97706", Hard: "#dc2626" };

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [solved, setSolved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getProfile(), api.getSolved()])
      .then(([p, s]) => { setProfile(p); setSolved(s); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="profile-card profile-skeleton" />;
  if (error)   return <div className="profile-card profile-error">Could not load profile — {error}</div>;

  const total = solved?.solvedProblem ?? 0;
  const easy  = solved?.easySolved ?? 0;
  const med   = solved?.mediumSolved ?? 0;
  const hard  = solved?.hardSolved ?? 0;

  const bars = [
    { label: "Easy",   val: easy, max: 800,  color: DIFF.Easy },
    { label: "Medium", val: med,  max: 1600, color: DIFF.Medium },
    { label: "Hard",   val: hard, max: 700,  color: DIFF.Hard },
  ];

  return (
    <div className="profile-card">
      <div className="profile-avatar-wrap">
        {profile?.userAvatar
          ? <img className="profile-avatar" src={profile.userAvatar} alt="avatar" />
          : <div className="profile-avatar-placeholder">{(profile?.realName || "R")[0]}</div>
        }
        <div className="profile-badge">#{profile?.ranking ?? "—"}</div>
      </div>

      <div className="profile-body">
        <div className="profile-names">
          <h1 className="profile-name">{profile?.realName || "thisisrustam"}</h1>
          <span className="profile-handle">@thisisrustam</span>
        </div>

        <div className="profile-stat-row">
          <div className="profile-total">
            <span className="profile-total-num">{total}</span>
            <span className="profile-total-label">Problems Solved</span>
          </div>
          <div className="profile-bars">
            {bars.map(({ label, val, max, color }) => (
              <div key={label} className="bar-row">
                <span className="bar-label">{label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.min((val / max) * 100, 100)}%`, background: color }} />
                </div>
                <span className="bar-val" style={{ color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
