const DIFF_COLOR = { Easy: "#059669", Medium: "#d97706", Hard: "#dc2626" };

const MOVES = {
  doing:     [{ label: "Move to To Do",      next: "todo" }],
  todo:      [{ label: "Move to In Progress", next: "doing" }],
  completed: [],
};

export default function TaskCard({ task, status, onMove, onDelete }) {
  const color = DIFF_COLOR[task.difficulty] ?? "#94a3b8";
  const url   = task.url ?? (task.titleSlug ? `https://leetcode.com/problems/${task.titleSlug}/` : null);

  return (
    <div className="task-card">
      <div className="task-top">
        {url
          ? <a className="task-title" href={url} target="_blank" rel="noreferrer">{task.title}</a>
          : <span className="task-title">{task.title}</span>
        }
        {task.difficulty && (
          <span className="task-diff" style={{ color, borderColor: color }}>{task.difficulty}</span>
        )}
      </div>

      {task.tags?.length > 0 && (
        <div className="task-tags">
          {task.tags.slice(0, 4).map((t) => <span key={t} className="task-tag">{t}</span>)}
        </div>
      )}

      <div className="task-foot">
        {MOVES[status]?.map(({ label, next }) => (
          <button key={next} className="btn-move" onClick={() => onMove(task.id, next)}>{label}</button>
        ))}
        {status !== "completed" && (
          <button className="btn-del" onClick={() => onDelete(task.id)} title="Remove">Remove</button>
        )}
      </div>
    </div>
  );
}
