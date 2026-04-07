import { useState, useEffect } from "react";
import Column from "./Column";
import AddTaskModal from "./AddTaskModal";
import { api, companies, getCompaniesForSlug } from "../services/api";

const COLUMNS = ["completed", "doing", "todo"];
const LABELS  = { completed: "Completed", doing: "In Progress", todo: "To Do" };

export default function Board() {
  const [tasks,          setTasks]          = useState([]);
  const [submissions,    setSubmissions]    = useState([]);
  const [addingStatus,   setAddingStatus]   = useState(null);
  const [filterCompany,  setFilterCompany]  = useState("");

  /* Load localStorage tasks */
  useEffect(() => {
    setTasks(api.getTasks());
  }, []);

  /* Load recent accepted submissions → synthetic completed cards */
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getSubmissions(100);
        const seen = new Set();
        const list = (data?.submission ?? [])
          .filter(s => { if (seen.has(s.titleSlug)) return false; seen.add(s.titleSlug); return true; })
          .map(s => ({
            id:         `ac-${s.titleSlug}`,
            title:      s.title,
            titleSlug:  s.titleSlug,
            difficulty: s.difficulty ?? "Unknown",
            status:     "completed",
            companies:  getCompaniesForSlug(s.titleSlug),
            topics:     [],
            url:        `https://leetcode.com/problems/${s.titleSlug}/`,
            fromAPI:    true,
          }));
        setSubmissions(list);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const handleMove   = (id, status) => { const t = api.updateTask(id, { status }); setTasks(api.getTasks()); };
  const handleDelete = (id)         => { api.deleteTask(id); setTasks(api.getTasks()); };
  const handleAdd    = (task)        => { api.createTask(task); setTasks(api.getTasks()); };

  /* All cards: API submissions for completed + localStorage for doing/todo */
  const allCompleted = [
    ...submissions,
    ...tasks.filter(t => t.status === "completed"),
  ];
  const allDoing = tasks.filter(t => t.status === "doing");
  const allTodo  = tasks.filter(t => t.status === "todo");

  /* Company filter */
  const filter = (list) =>
    filterCompany ? list.filter(t => t.companies?.includes(filterCompany)) : list;

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

      {/* Kanban columns */}
      <div className="board">
        {COLUMNS.map((col, i) => {
          const rawList = col === "completed" ? allCompleted
                        : col === "doing"     ? allDoing
                        : allTodo;
          const list = filter(rawList);
          return (
            <Column
              key={col}
              label={`0${i + 1} ${LABELS[col]}`}
              status={col}
              tasks={list}
              columns={COLUMNS}
              onMove={handleMove}
              onDelete={(id) => { if (!id.startsWith("ac-")) handleDelete(id); }}
              onAdd={() => setAddingStatus(col === "completed" ? "todo" : col)}
            />
          );
        })}
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
