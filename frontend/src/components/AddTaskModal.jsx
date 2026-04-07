import { useState, useEffect } from "react";
import { api, companies, allTopics, getProblemsForCompany, getSuggestedForCompany, searchAllProblems } from "../services/api";

const DIFF_COLOR = { Easy: "#059669", Medium: "#d97706", Hard: "#dc2626" };

function ProblemRow({ p, company, onAdd, suggested = false }) {
  return (
    <div className={`modal-row${suggested ? " modal-row--suggested" : ""}`}>
      <div className="modal-row-info">
        <div className="modal-row-top">
          <span className="modal-row-title">{p.title}</span>
          <span className="modal-row-diff" style={{ color: DIFF_COLOR[p.difficulty] ?? "#888" }}> {p.difficulty}</span>
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
        {p.topics?.length > 0 && suggested && (
          <div className="modal-row-companies">
            {p.topics.slice(0, 4).map(t => (
              <span key={t} className="company-chip">{t}</span>
            ))}
          </div>
        )}
      </div>
      <button className="btn-modal-add" onClick={() => onAdd(p)}>Add</button>
    </div>
  );
}

export default function AddTaskModal({ initialStatus, onClose, onAdd }) {
  const [mode, setMode] = useState("company");
  const [company, setCompany] = useState("");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [results, setResults] = useState([]);
  const [suggested, setSuggested] = useState([]);

  useEffect(() => {
    if (mode === "company") {
      if (!company) { setResults([]); setSuggested([]); return; }
      let list = getProblemsForCompany(company, { topic });
      if (difficulty) list = list.filter(p => p.difficulty.toLowerCase() === difficulty.toLowerCase());
      if (query) list = list.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
      setResults(list.slice(0, 60));
      setSuggested(getSuggestedForCompany(company, { topic, difficulty }));
      return;
    }
    setSuggested([]);
    // Search mode — instant local search over all 3,647 problems
    setResults(searchAllProblems({ query, difficulty, topic }));
  }, [mode, company, difficulty, topic, query]);

  const handleAdd = (p) => {
    onAdd({
      title: p.title,
      titleSlug: p.titleSlug,
      difficulty: p.difficulty,
      status,
      companies: p.companies ?? (company ? [company] : []),
      topics: p.topics ?? [],
      url: p.url ?? `https://leetcode.com/problems/${p.titleSlug}/`,
    });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add Problem</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab ${mode === "company" ? "active" : ""}`} onClick={() => setMode("company")}>
            Browse by Company
          </button>
          <button className={`modal-tab ${mode === "search" ? "active" : ""}`} onClick={() => setMode("search")}>
            Search Problems
          </button>
        </div>

        <div className="modal-filters">
          {mode === "company" && (
            <select className="modal-sel modal-sel--company" value={company} onChange={e => setCompany(e.target.value)}>
              <option value="">Select company...</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <input
            autoFocus
            className="modal-input"
            placeholder={mode === "company" ? "Filter by title..." : "Search by title..."}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select className="modal-sel" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select className="modal-sel" value={topic} onChange={e => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="modal-sel" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="todo">To Do</option>
            <option value="doing">In Progress</option>
          </select>
        </div>

        <div className="modal-list">
          {mode === "company" && !company && (
            <p className="modal-hint">Select a company to browse its interview problems</p>
          )}
          {mode === "search" && !query && !difficulty && !topic && (
            <p className="modal-hint">Type a title or pick a difficulty to search all 3,647 problems</p>
          )}
          {results.length === 0 && (mode === "search" ? (query || difficulty || topic) : company) && (
            <p className="modal-hint">No results</p>
          )}
          {results.map(p => (
            <ProblemRow key={p.titleSlug} p={p} company={company} onAdd={handleAdd} />
          ))}

          {mode === "company" && company && suggested.length > 0 && (
            <>
              <div className="modal-section-divider">
                <span>Suggested by similarity · {suggested.length}</span>
              </div>
              {suggested.map(p => (
                <ProblemRow key={`s-${p.titleSlug}`} p={p} company={company} onAdd={handleAdd} suggested />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
