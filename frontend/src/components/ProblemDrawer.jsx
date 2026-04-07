import { useEffect } from "react";

const DIFF_COLOR = { Easy: "#059669", Medium: "#d97706", Hard: "#dc2626" };

export default function ProblemDrawer({ problem, loading, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const color = problem?.difficulty ? DIFF_COLOR[problem.difficulty] : null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          {loading ? (
            <span className="drawer-loading">Fetching problem…</span>
          ) : (
            <>
              <div className="drawer-title-row">
                <span className="drawer-title">
                  {problem?.questionId ? `${problem.questionId}. ` : ""}{problem?.title}
                </span>
                {problem?.difficulty && (
                  <span className="drawer-diff" style={{ color, borderColor: color }}>
                    {problem.difficulty}
                  </span>
                )}
                {problem?.titleSlug && (
                  <a
                    className="drawer-ext"
                    href={`https://leetcode.com/problems/${problem.titleSlug}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ↗ LeetCode
                  </a>
                )}
              </div>
              {problem?.topicTags?.length > 0 && (
                <div className="drawer-tags">
                  {problem.topicTags.map((t) => (
                    <span key={t.slug ?? t.name} className="task-tag">{t.name}</span>
                  ))}
                </div>
              )}
            </>
          )}
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        {!loading && problem?.question && (
          <div
            className="drawer-body"
            // Content is served from the LeetCode API (read-only problem descriptions)
            dangerouslySetInnerHTML={{ __html: problem.question }}
          />
        )}

        {!loading && !problem?.question && (
          <div className="drawer-body">
            <p className="drawer-empty">No description available. <a href={`https://leetcode.com/problems/${problem?.titleSlug}/`} target="_blank" rel="noreferrer">Open on LeetCode ↗</a></p>
          </div>
        )}
      </div>
    </div>
  );
}
