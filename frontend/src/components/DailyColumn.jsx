import { useState, useEffect } from "react";
import { fetchDailyProblem } from "../services/leetcodeAPI";
import { companies, getProblemsForCompany } from "../services/api";

const DIFF_COLOR = { Easy: "#00b8a3", Medium: "#ffc01e", Hard: "#ef4743" };
const DIFF_BG    = { Easy: "rgba(0,184,163,0.15)", Medium: "rgba(255,192,30,0.15)", Hard: "rgba(239,71,67,0.15)" };

/** Pick a deterministic company problem for today (seed = date + company name). */
function getCompanyDailyProblem(company) {
  const problems = getProblemsForCompany(company);
  if (!problems.length) return null;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seed = [...(company + today)].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return problems[seed % problems.length];
}

export default function DailyColumn({ filterCompany, onCompanyChange, onAddToProgress, onOpen }) {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (filterCompany) {
      setLoading(false);
      setError(null);
      setDaily(getCompanyDailyProblem(filterCompany));
      return;
    }
    setLoading(true);
    setError(null);
    fetchDailyProblem()
      .then(prob => { setDaily(prob); setLoading(false); })
      .catch(() => { setError("Could not load daily problem"); setLoading(false); });
  }, [filterCompany]);

  const diff = daily?.difficulty;

  return (
    <div className="column column--daily">
      <div className="column-header" style={{ "--col": "#0a84ff" }}>
        <span className="col-marker">01</span>
        <span className="col-title">Daily</span>
      </div>

      <div className="daily-company-wrap">
        <select
          className="daily-company-sel"
          value={filterCompany}
          onChange={e => onCompanyChange(e.target.value)}
        >
          <option value="">LeetCode daily challenge</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="column-body">
        {loading && <p className="col-empty">Loading…</p>}
        {!loading && error && <p className="col-empty" style={{ color: "var(--hard)" }}>{error}</p>}
        {!loading && !error && !daily && <p className="col-empty">No problem available</p>}

        {!loading && !error && daily && (
          <div className="daily-card">
            <div className="daily-card-meta">
              {diff && (
                <span
                  className="daily-diff-badge"
                  style={{ background: DIFF_BG[diff] ?? "rgba(255,255,255,0.08)", color: DIFF_COLOR[diff] ?? "var(--muted)" }}
                >
                  {diff}
                </span>
              )}
              {daily.questionId && (
                <span className="daily-card-num">#{daily.questionId}</span>
              )}
              {(daily.premium || daily.isPaidOnly) && (
                <span className="daily-card-premium">Premium</span>
              )}
              {filterCompany && (
                <span className="daily-company-badge">{filterCompany}</span>
              )}
            </div>

            <button
              className="daily-card-title"
              onClick={() => onOpen?.({
                title: daily.title,
                titleSlug: daily.titleSlug,
                difficulty: daily.difficulty,
                url: daily.url ?? `https://leetcode.com/problems/${daily.titleSlug}/`,
              })}
            >
              {daily.title}
            </button>

            {daily.topics?.length > 0 && (
              <div className="daily-card-topics">
                {daily.topics.slice(0, 4).map(t => (
                  <span key={t} className="topic-chip">{t}</span>
                ))}
              </div>
            )}

            <div className="daily-card-actions">
              <a
                href={daily.url ?? `https://leetcode.com/problems/${daily.titleSlug}/`}
                target="_blank"
                rel="noreferrer"
                className="btn-daily-open"
              >
                Open
              </a>
              <button
                className="btn-daily-start"
                onClick={() => onAddToProgress({
                  title: daily.title,
                  titleSlug: daily.titleSlug,
                  difficulty: daily.difficulty,
                  premium: daily.premium ?? daily.isPaidOnly ?? false,
                  topics: daily.topics ?? [],
                  companies: filterCompany ? [filterCompany] : [],
                  url: daily.url ?? `https://leetcode.com/problems/${daily.titleSlug}/`,
                })}
              >
                Start →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
