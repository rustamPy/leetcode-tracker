import { useState, useMemo } from "react";
import TaskCard from "./TaskCard";

const COL = {
  completed: { label: "Completed", marker: "01", color: "#7c3aed" },
  doing: { label: "In Progress", marker: "02", color: "#d97706" },
  todo: { label: "To Do", marker: "03", color: "#1e40af" },
};

export default function Column({ status, tasks, columns, onMove, onDelete, onAdd }) {
  const { label, marker, color } = COL[status];
  const [search, setSearch] = useState("");

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => !q || t.title.toLowerCase().includes(q));
  }, [tasks, search]);

  return (
    <div className="column">
      <div className="column-header" style={{ "--col": color }}>
        <span className="col-marker">{marker}</span>
        <span className="col-title">{label}</span>
        <span className="col-count">{tasks.length}</span>
      </div>

      <div className="col-filters">
        <input
          className="col-search"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="column-body">
        {visibleTasks.length === 0 && (
          <p className="col-empty">{tasks.length === 0 ? "No entries" : "No matches"}</p>
        )}
        {visibleTasks.map((task) => (
          <TaskCard
            key={task.id ?? task.titleSlug}
            task={task}
            columns={columns}
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
