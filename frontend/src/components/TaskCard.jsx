/* Dark-theme diff palette */
const DIFF_BORDER = { Easy: "#00b8a3", Medium: "#ffc01e", Hard: "#ef4743" };
const DIFF_BG     = { Easy: "rgba(0,184,163,0.08)", Medium: "rgba(255,192,30,0.08)", Hard: "rgba(239,71,67,0.08)" };
const DIFF_BADGE  = { Easy: "rgba(0,184,163,0.2)",  Medium: "rgba(255,192,30,0.2)",  Hard: "rgba(239,71,67,0.2)" };

export default function TaskCard({ task, onMove, onDelete, onOpen, columns }) {
  const isAPI  = !!task.fromAPI;
  const known  = task.difficulty && task.difficulty !== "Unknown";
  const border = known ? (DIFF_BORDER[task.difficulty] ?? "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.15)";
  const bg     = known ? (DIFF_BG[task.difficulty]     ?? "rgba(255,255,255,0.04)") : "rgba(255,255,255,0.04)";
  const badge  = known ? (DIFF_BADGE[task.difficulty]  ?? null) : null;

  const prev = columns[columns.indexOf(task.status) - 1];
  const next = columns[columns.indexOf(task.status) + 1];
  const LABELS = { completed: "Done", doing: "Doing", todo: "To Do" };

  return (
    <div className="task-card" style={{ borderLeftColor: border, background: bg }}>

      <div className="task-card-head">
        {badge && (
          <span className="task-diff-badge" style={{ background: badge, color: border }}>
            {task.difficulty}
          </span>
        )}
        {task.premium && (
          <span className="task-premium" title="Premium problem">★</span>
        )}
        {!isAPI && (
          <button className="task-del" title="Remove" onClick={() => onDelete(task.id)}>✕</button>
        )}
      </div>

      <button className="task-title" onClick={() => onOpen?.(task)} title="View description">
        {task.title}
      </button>

      {/* Company chips */}
      {task.companies?.length > 0 && (
        <div className="task-companies">
          {task.companies.slice(0, 3).map(c => (
            <span key={c} className="company-chip company-chip--card">{c}</span>
          ))}
          {task.companies.length > 3 && (
            <span className="company-chip company-chip--more">+{task.companies.length - 3}</span>
          )}
        </div>
      )}

      {/* Topic chips */}
      {task.topics?.length > 0 && (
        <div className="task-topics">
          {task.topics.slice(0, 3).map(t => (
            <span key={t} className="topic-chip">{t}</span>
          ))}
        </div>
      )}

      {/* Completion date — shown for recent (API-sourced) cards */}
      {isAPI && task.timestamp && (() => {
        const ts = String(task.timestamp);
        const ms = /^\d+$/.test(ts) ? Number(ts) * 1000 : Date.parse(ts);
        if (!ms || isNaN(ms)) return null;
        return <div className="task-date">{new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>;
      })()}

      {/* Move buttons — hidden for API-sourced cards */}
      {!isAPI && (prev || next) && (
        <div className="task-actions">
          {prev && (
            <button className="btn-move btn-move--prev" onClick={() => onMove(task.id, prev)}>
              ← Back
            </button>
          )}
          {next && (
            <button className="btn-move btn-move--next" onClick={() => onMove(task.id, next)}>
              {LABELS[next]} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
