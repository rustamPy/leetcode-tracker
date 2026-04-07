import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

export default function AddTaskModal({ initialStatus, onClose, onAdd }) {
  const [query,      setQuery]      = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status,     setStatus]     = useState(initialStatus);
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProblems({ limit: 20, difficulty: difficulty || undefined });
      const list = data?.problemsetQuestionList ?? [];
      setResults(query ? list.filter(p => p.title.toLowerCase().includes(query.toLowerCase())) : list);
    } catch { setResults([]); }
    finally   { setLoading(false); }
  }, [query, difficulty]);

  useEffect(() => { const t = setTimeout(search, 350); return () => clearTimeout(t); }, [search]);

  const handleAdd = (p) => {
    onAdd({
      title:      p.title,
      titleSlug:  p.titleSlug,
      difficulty: p.difficulty,
      status,
      tags:       p.topicTags?.map(t => t.name) ?? [],
      url:        `https://leetcode.com/problems/${p.titleSlug}/`,
    });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add Problem</h3>
          <button className="modal-x" onClick={onClose}>x</button>
        </div>

        <div className="modal-filters">
          <input
            autoFocus
            className="modal-input"
            placeholder="Search by title..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select className="modal-sel" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <select className="modal-sel" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="todo">To Do</option>
            <option value="doing">In Progress</option>
          </select>
        </div>

        <div className="modal-list">
          {loading && <p className="modal-hint">Searching...</p>}
          {!loading && results.length === 0 && <p className="modal-hint">No results</p>}
          {results.map(p => (
            <div key={p.titleSlug} className="modal-row">
              <div>
                <p className="modal-row-title">{p.title}</p>
                <span className="modal-row-diff" style={{
                  color: p.difficulty === "Easy" ? "#059669" : p.difficulty === "Medium" ? "#d97706" : "#dc2626"
                }}>{p.difficulty}</span>
              </div>
              <button className="btn-modal-add" onClick={() => handleAdd(p)}>Add</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
