import { useState, useEffect, useCallback } from "react";
import { api, companies, getProblemsForCompany } from "../services/api";

const DIFF_COLOR = { Easy: "#059669", Medium: "#d97706", Hard: "#dc2626" };

export default function AddTaskModal({ initialStatus, onClose, onAdd }) {
  const [mode,       setMode]       = useState("company"); // "company" | "search"
  const [company,    setCompany]    = useState("");
  const [query,      setQuery]      = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status,     setStatus]     = useState(initialStatus);
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(false);

  // Company mode — sync, instant
  useEffect(() => {
    if (mode !== "company") return;
    if (!company) { setResults([]); return; }
    let list = getProblemsForCompany(company);
    if (difficulty) list = list.filter(p => p.difficulty.toLowerCase() === difficulty.toLowerCase());
    if (query)      list = list.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
    setResults(list.slice(0, 60));
  }, [mode, company, difficulty, query]);

  // Search mode — async, debounced
  const searchAPI = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProblems({ limit: 20, difficulty: difficulty || undefined });
      const list = data?.problemsetQuestionList ?? [];
      setResults(query ? list.filter(p => p.title.toLowerCase().includes(query.toLowerCase())) : list);
    } catch { setResults([]); }
    finally   { setLoading(false); }
  }, [query, difficulty]);

  useEffect(() => {
    if (mode !== "search") return;
    const t = setTimeout(searchAPI, 350);
    return () => clearTimeout(t);
  }, [mode, searchAPI]);

  const handleAdd = (p) => {
    onAdd({
      title:      p.title,
      titleSlug:  p.titleSlug,
      difficulty: p.difficulty,
      status,
      companies:  p.companies ?? (company ? [company] : []),
      topics:     p.topics ?? p.topicTags?.map(t => t.name) ?? [],
      url:        p.url ?? `https://leetcode.com/problems/${p.titleSlug}/`,
    });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-head">
          <h3>Add Problem</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        {/* Mode toggle */}
        <div className="modal-tabs">
          <button className={`modal-tab ${mode === "company" ? "active" : ""}`} onClick={() => setMode("company")}>
            Browse by Company
          </button>
          <button className={`modal-tab ${mode === "search" ? "active" : ""}`} onClick={() => setMode("search")}>
            Search All
          </button>
        </div>

        {/* Filters */}
        <div className="modal-filters">
          {mode === "company" && (
            <select
              className="modal-sel modal-sel--company"
              value={company}
              onChange={e => setCompany(e.target.value)}
            >
              <option value="">Select company...</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <input
            autoFocus
            className="modal-input"
            placeholder={mode === "company" ? "Filter by title..." : "Search problems..."}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select className="modal-sel" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select className="modal-sel" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="todo">To Do</option>
            <option value="doing">In Progress</option>
          </select>
        </div>

        {/* Results */}
        <div className="modal-list">
          {mode === "company" && !company && (
            <p className="modal-hint">Select a company to browse its problems</p>
          )}
          {loading && <p className="modal-hint">Searching...</p>}
          {!loading && (mode !== "company" || company) && results.length === 0 && (
            <p className="modal-hint">No results</p>
          )}
          {results.map(p => (
            <div key={p.titleSlug} className="modal-row">
              <div className="modal-row-info">
                <div className="modal-row-top">
                  <span className="modal-row-title">{p.title}</span>
                  <span className="modal-row-diff" style={{ color: DIFF_COLOR[p.difficulty] ?? "#888" }}>
                    {p.difficulty}
                  </span>
                </div>
                {p.companies?.length > 0 && (
                  <div className="modal-row-companies">
                    {p.companies.slice(0, 5).map(c => (
                      <span key={c} className={`company-chip ${c === company ? "company-chip--active" : ""}`}>{c}</span>
                    ))}
                    {p.companies.length > 5 && (
                      <span className="company-chip company-chip--more">+{p.companies.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
              <button className="btn-modal-add" onClick={() => handleAdd(p)}>Add</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
