/* Better dimmed palettes */
const DIFF_BORDER = { Easy: "#16a34a", Medium: "#b45309", Hard: "#e11d48" };
const DIFF_BG     = { Easy: "#f0fdf4", Medium: "#fffbeb", Hard: "#fff1f2" };
const DIFF_BADGE  = { Easy: "#dcfce7", Medium: "#fef3c7", Hard: "#ffe4e6" };

export default function TaskCard({ task, onMove, onDelete, onOpen, columns }) {
  const isAPI  = !!task.fromAPI;
  const known  = task.difficulty && task.difficulty !== "Unknown";
  const border = known ? (DIFF_BORDER[task.difficulty] ?? "#64748b") : "#64748b";
  const bg     = known ? (DIFF_BG[task.difficulty]     ?? "#f8fafc") : "#f8fafc";
  const badge  = known ? (DIFF_BADGE[task.difficulty]  ?? "#e2e8f0") : null;

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
