import { userProfile, userSolved, userContest, dataFetchedAt } from "../services/api";

const TOTAL = { Easy: 880, Medium: 1842, Hard: 816 };

function Bar({ label, solved, total, color }) {
  const pct = Math.min(100, Math.round((solved / total) * 100));
  return (
    <div className="diff-row">
      <span className="diff-label" style={{ color }}>{label}</span>
      <div className="diff-bar-wrap">
        <div className="diff-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="diff-count">{solved}<span className="diff-total">/{total}</span></span>
    </div>
  );
}

export default function Profile() {
  const { realName, userAvatar, ranking, countryName, starRating } = userProfile;
  const { solvedProblem, easySolved, mediumSolved, hardSolved }    = userSolved;

  const fetchDate = dataFetchedAt
    ? new Date(dataFetchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="profile-card">
      <div className="profile-top">
        <div className="avatar-wrap">
          <img src={userAvatar} alt={realName} className="avatar" />
          {userContest?.rating && (
            <span className="rank-badge">{Math.round(userContest.rating)}</span>
          )}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{realName || "thisisrustam"}</h2>
          <span className="profile-handle">@thisisrustam</span>
          <div className="profile-meta">
            {countryName && <span className="meta-chip">{countryName}</span>}
            {ranking > 0  && <span className="meta-chip">#{ranking.toLocaleString()}</span>}
            {userContest?.attendedContestsCount > 0 && (
              <span className="meta-chip">{userContest.attendedContestsCount} contests</span>
            )}
          </div>
        </div>
        <div className="profile-total">
          <span className="total-num">{solvedProblem}</span>
          <span className="total-lbl">solved</span>
        </div>
      </div>

      <div className="diff-bars">
        <Bar label="Easy"   solved={easySolved}   total={TOTAL.Easy}   color="#059669" />
        <Bar label="Medium" solved={mediumSolved}  total={TOTAL.Medium} color="#d97706" />
        <Bar label="Hard"   solved={hardSolved}    total={TOTAL.Hard}   color="#dc2626" />
      </div>

      {fetchDate && (
        <p className="profile-timestamp">Data snapshot: {fetchDate}</p>
      )}
    </div>
  );
}
