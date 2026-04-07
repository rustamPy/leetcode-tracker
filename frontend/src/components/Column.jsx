import TaskCard from "./TaskCard";

const COL = {
  completed: { label: "Completed", marker: "01", color: "#7c3aed" },
  doing:     { label: "In Progress", marker: "02", color: "#d97706" },
  todo:      { label: "To Do",      marker: "03", color: "#1e40af" },
};

export default function Column({ status, tasks, onMove, onDelete, onAdd }) {
  const { label, marker, color } = COL[status];

  return (
    <div className="column">
      <div className="column-header" style={{ "--col": color }}>
        <span className="col-marker">{marker}</span>
        <span className="col-title">{label}</span>
        <span className="col-count">{tasks.length}</span>
      </div>

      <div className="column-body">
        {tasks.length === 0 && <p className="col-empty">No entries</p>}
        {tasks.map((task) => (
          <TaskCard
            key={task.id ?? task.titleSlug}
            task={task}
            status={status}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
      </div>

      {status !== "completed" && (
        <button className="col-add" onClick={() => onAdd(status)}>
          + Add problem
        </button>
      )}
    </div>
  );
}
