import { useState, useMemo, useCallback } from "react";
import Column from "./Column";
import AddTaskModal from "./AddTaskModal";
import ProblemDrawer from "./ProblemDrawer";
import { api, companies, getCompaniesForSlug } from "../services/api";
import { useLeetCode } from "../hooks/useLeetCode";

const COLUMNS = ["completed", "doing", "todo"];
const LABELS  = { completed: "Completed", doing: "In Progress", todo: "To Do" };

export default function Board() {
  const { data } = useLeetCode();
  const [tasks,         setTasks]         = useState(() => api.getTasks());
  const [addingStatus,  setAddingStatus]  = useState(null);
  const [filterCompany, setFilterCompany] = useState("");

  // Drawer state
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerProblem, setDrawerProblem] = useState(null);

  const handleMove   = (id, status) => { api.updateTask(id, { status }); setTasks(api.getTasks()); };
  const handleDelete = (id)          => { api.deleteTask(id);             setTasks(api.getTasks()); };
  const handleAdd    = (task)         => { api.createTask(task);           setTasks(api.getTasks()); };

  const handleOpenProblem = useCallback(async (task) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerProblem(null);
    try {
      const res  = await fetch(`/api/problem?titleSlug=${encodeURIComponent(task.titleSlug)}`);
      const json = await res.json();
      setDrawerProblem({
        title:      json.questionTitle  ?? task.title,
        titleSlug:  task.titleSlug,
        questionId: json.questionFrontendId ?? null,
        difficulty: json.difficulty    ?? task.difficulty,
        question:   json.question      ?? null,
        topicTags:  json.topicTags     ?? [],
        hints:      json.hints         ?? [],
        url:        task.url ?? `https://leetcode.com/problems/${task.titleSlug}/`,
      });
    } catch {
      setDrawerProblem({
        title:     task.title,
        titleSlug: task.titleSlug,
        difficulty: task.difficulty,
        question:  null,
        topicTags: [],
      });
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  // Build completed cards from live hook data
  const apiCompleted = useMemo(() => {
    const subs = data?.submissions ?? [];
    const seen = new Set();
    return subs
      .filter(s => { if (seen.has(s.titleSlug)) return false; seen.add(s.titleSlug); return true; })
      .map(s => ({
        id:        `ac-${s.titleSlug}`,
        title:     s.title,
        titleSlug: s.titleSlug,
        difficulty: "Unknown",
        status:    "completed",
        companies: getCompaniesForSlug(s.titleSlug),
        topics:    [],
        url:       `https://leetcode.com/problems/${s.titleSlug}/`,
        fromAPI:   true,
      }));
  }, [data]);

  const filter = (list) =>
    filterCompany ? list.filter(t => t.companies?.includes(filterCompany)) : list;

  const colData = {
    completed: filter([...apiCompleted, ...tasks.filter(t => t.status === "completed")]),
    doing:     filter(tasks.filter(t => t.status === "doing")),
    todo:      filter(tasks.filter(t => t.status === "todo")),
  };

  return (
    <div className="board-wrap">
      <div className="company-filter-bar">
        <span className="company-filter-label">Company</span>
        <select className="company-filter-sel" value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
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
            onOpen={handleOpenProblem}
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

      {drawerOpen && (
        <ProblemDrawer
          problem={drawerProblem}
          loading={drawerLoading}
          onClose={() => { setDrawerOpen(false); setDrawerProblem(null); }}
        />
      )}
    </div>
  );
}
