import { useState, useEffect } from "react";
import Column from "./Column";
import AddTaskModal from "./AddTaskModal";
import { api } from "../services/api";

export default function Board() {
  const [submissions, setSubmissions] = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modalStatus, setModalStatus] = useState(null);

  useEffect(() => {
    Promise.all([api.getSubmissions(100), Promise.resolve(api.getTasks())])
      .then(([subs, local]) => {
        const seen = new Set();
        const unique = (subs?.submission ?? []).filter(s => {
          if (seen.has(s.titleSlug)) return false;
          seen.add(s.titleSlug);
          return true;
        });
        setSubmissions(unique);
        setTasks(local);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd    = (data)        => { const t = api.createTask(data); setTasks(p => [...p, t]); };
  const handleMove   = (id, status)  => { const t = api.updateTask(id, { status }); setTasks(p => p.map(x => x.id === id ? t : x)); };
  const handleDelete = (id)          => { api.deleteTask(id); setTasks(p => p.filter(x => x.id !== id)); };

  if (loading) return (
    <div className="board-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );

  const completed = submissions.map(s => ({
    id: s.titleSlug, title: s.title, titleSlug: s.titleSlug,
    difficulty: null, tags: [],
    url: `https://leetcode.com/problems/${s.titleSlug}/`,
  }));

  return (
    <>
      <div className="board">
        <Column status="completed" tasks={completed}                          onMove={() => {}} onDelete={() => {}} onAdd={() => {}} />
        <Column status="doing"     tasks={tasks.filter(t => t.status === "doing")} onMove={handleMove}   onDelete={handleDelete} onAdd={setModalStatus} />
        <Column status="todo"      tasks={tasks.filter(t => t.status === "todo")}  onMove={handleMove}   onDelete={handleDelete} onAdd={setModalStatus} />
      </div>
      {modalStatus && (
        <AddTaskModal initialStatus={modalStatus} onClose={() => setModalStatus(null)} onAdd={handleAdd} />
      )}
    </>
  );
}
