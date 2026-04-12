import { useState } from "react";
import { useAchievements } from "../hooks/useAchievements";

function AchievementBadge({ name, desc, earned }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`achievement-badge ${earned ? "achievement-badge--earned" : "achievement-badge--locked"}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="achievement-name">{name}</span>
      {hover && (
        <div className="achievement-tooltip">
          {desc}
        </div>
      )}
    </div>
  );
}

export default function StatsStrip() {
  const { streak, achievements } = useAchievements();
  const earned = achievements.filter(a => a.earned);

  return (
    <div className="stats-strip">
      {/* Streak */}
      <div className="streak-block">
        <div className="streak-text">
          <span className="streak-num">{streak}</span>
          <span className="streak-label">day streak</span>
        </div>
      </div>

      <div className="stats-divider" />

      {/* Achievements */}
      <div className="achievements-block">
        <span className="achievements-label">ACHIEVEMENTS</span>
        <div className="achievements-row">
          {achievements.map(a => (
            <AchievementBadge key={a.id} {...a} />
          ))}
        </div>
        {earned.length === 0 && (
          <span className="achievements-empty">
            Solve problems to unlock your first achievement
          </span>
        )}
      </div>

      {earned.length > 0 && (
        <div className="achievements-count">
          <span className="achievements-count-num">{earned.length}</span>
          <span className="achievements-count-label">/ {achievements.length}</span>
        </div>
      )}
    </div>
  );
}
