import { useState, useMemo } from "react";
import TaskCard from "./TaskCard";

const COL = {
  doing:  { label: "In Progress", marker: "02", color: "#ffa116" },
  recent: { label: "Recent 100",  marker: "03", color: "#00b8a3" },
};

export default function Column({ status, tasks, onMove, onDelete, onAdd, onOpen, readOnly }) {
  const { label, marker, color } = COL[status] ?? { label: status, marker: "—", color: "#888" };
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
            columns={readOnly ? [] : ["doing"]}
            onMove={onMove}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        ))}
      </div>

      {!readOnly && (
        <button className="col-add" onClick={() => onAdd(status)}>
          + Add problem
        </button>
      )}
    </div>
  );
}
