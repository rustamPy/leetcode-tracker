import { useState, useMemo } from "react";
import Column from "./Column";
import AddTaskModal from "./AddTaskModal";
import { api, companies, getCompaniesForSlug, userSubmissions } from "../services/api";

const COLUMNS = ["completed", "doing", "todo"];
const LABELS  = { completed: "Completed", doing: "In Progress", todo: "To Do" };

/* Build deduplicated completed cards from static accepted submissions */
function buildCompletedFromSubmissions() {
  const seen = new Set();
  return userSubmissions
    .filter(s => { if (seen.has(s.titleSlug)) return false; seen.add(s.titleSlug); return true; })
    .map(s => ({
      id:        `ac-${s.titleSlug}`,
      title:     s.title,
      titleSlug: s.titleSlug,
      difficulty: "Unknown",   // GraphQL recentAcSubmission doesn't include difficulty
      status:    "completed",
      companies: getCompaniesForSlug(s.titleSlug),
      topics:    [],
      url:       `https://leetcode.com/problems/${s.titleSlug}/`,
      fromAPI:   true,
    }));
}

const API_COMPLETED = buildCompletedFromSubmissions();

export default function Board() {
  const [tasks,         setTasks]         = useState(() => api.getTasks());
  const [addingStatus,  setAddingStatus]  = useState(null);
  const [filterCompany, setFilterCompany] = useState("");

  const handleMove   = (id, status) => { api.updateTask(id, { status }); setTasks(api.getTasks()); };
  const handleDelete = (id)          => { api.deleteTask(id);             setTasks(api.getTasks()); };
  const handleAdd    = (task)         => { api.createTask(task);           setTasks(api.getTasks()); };

  const allCompleted = useMemo(() => [
    ...API_COMPLETED,
    ...tasks.filter(t => t.status === "completed"),
  ], [tasks]);

  const filter = (list) =>
    filterCompany ? list.filter(t => t.companies?.includes(filterCompany)) : list;

  const colData = {
    completed: filter(allCompleted),
    doing:     filter(tasks.filter(t => t.status === "doing")),
    todo:      filter(tasks.filter(t => t.status === "todo")),
  };

  return (
    <div className="board-wrap">
      {/* Company filter bar */}
      <div className="company-filter-bar">
        <span className="company-filter-label">Company</span>
        <select
          className="company-filter-sel"
          value={filterCompany}
          onChange={e => setFilterCompany(e.target.value)}
        >
          <option value="">All companies</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {filterCompany && (
          <button className="company-filter-clear" onClick={() => setFilterCompany("")}>Clear</button>
        )}
      </div>

      <div className="board">
        {COLUMNS.map((col, i) => (
          <Column
            key={col}
            label={`0${i + 1} — ${LABELS[col]}`}
            status={col}
            tasks={colData[col]}
            columns={COLUMNS}
            onMove={handleMove}
            onDelete={(id) => { if (!id.startsWith("ac-")) handleDelete(id); }}
            onAdd={() => setAddingStatus(col === "completed" ? "todo" : col)}
          />
        ))}
      </div>

      {addingStatus && (
        <AddTaskModal
          initialStatus={addingStatus}
          onClose={() => setAddingStatus(null)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
