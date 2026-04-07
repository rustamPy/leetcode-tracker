const DIFF_BORDER = { Easy: "#059669", Medium: "#d97706", Hard: "#dc2626" };
const DIFF_BG     = { Easy: "#ecfdf5", Medium: "#fffbeb", Hard: "#fff1f2" };

export default function TaskCard({ task, onMove, onDelete, onOpen, columns }) {
  const border = DIFF_BORDER[task.difficulty] ?? "#94a3b8";
  const bg     = DIFF_BG[task.difficulty]     ?? "#f8fafc";

  const prev = columns[columns.indexOf(task.status) - 1];
  const next = columns[columns.indexOf(task.status) + 1];

  const LABELS = { completed: "Done", doing: "Doing", todo: "To Do" };

  return (
    <div
      className="task-card"
      style={{ borderLeftColor: border, background: bg }}
    >
      <div className="task-card-head">
        <span className="task-diff-badge" style={{ background: `${border}18`, color: border }}>
          {task.difficulty ?? "–"}
        </span>
        <button className="task-del" title="Delete" onClick={() => onDelete(task.id)}>✕</button>
      </div>

      <button
        className="task-title task-title--btn"
        onClick={() => onOpen?.(task)}
        title="View description"
      >
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

      {/* Move buttons */}
      <div className="task-actions">
        {prev && (
          <button className="btn-move btn-move--prev" onClick={() => onMove(task.id, prev)} title={`Move to ${LABELS[prev]}`}>
            Back
          </button>
        )}
        {next && (
          <button className="btn-move btn-move--next" onClick={() => onMove(task.id, next)} title={`Move to ${LABELS[next]}`}>
            {LABELS[next]}
          </button>
        )}
      </div>
    </div>
  );
}


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

      {/* Move buttons */}
      <div className="task-actions">
        {prev && (
          <button className="btn-move btn-move--prev" onClick={() => onMove(task.id, prev)} title={`Move to ${LABELS[prev]}`}>
            Back
          </button>
        )}
        {next && (
          <button className="btn-move btn-move--next" onClick={() => onMove(task.id, next)} title={`Move to ${LABELS[next]}`}>
            {LABELS[next]}
          </button>
        )}
      </div>
    </div>
  );
}
