import { useState, useMemo, useCallback } from "react";
import Column from "./Column";
import DailyColumn from "./DailyColumn";
import AddTaskModal from "./AddTaskModal";
import ProblemDrawer from "./ProblemDrawer";
import { api, getCompaniesForSlug, getProblemBySlug } from "../services/api";
import { fetchProblem } from "../services/leetcodeAPI";
import { useLeetCode } from "../hooks/useLeetCode";

export default function Board() {
  const { data } = useLeetCode();
  const [tasks, setTasks] = useState(() => api.getTasks());
  const [addingStatus, setAddingStatus] = useState(null);
  const [filterCompany, setFilterCompany] = useState(
    () => localStorage.getItem("lc_filter_company") ?? ""
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerProblem, setDrawerProblem] = useState(null);

  const applyCompanyFilter = (val) => {
    setFilterCompany(val);
    if (val) localStorage.setItem("lc_filter_company", val);
    else localStorage.removeItem("lc_filter_company");
  };

  const handleDelete = (id) => { api.deleteTask(id); setTasks(api.getTasks()); };
  const handleAdd = (task) => { const result = api.createTask(task); setTasks(api.getTasks()); return result; };

  const handleOpenProblem = useCallback(async (task) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerProblem(null);
    try {
      const problem = await fetchProblem(task.titleSlug);
      setDrawerProblem({
        title: problem?.title ?? task.title,
        titleSlug: task.titleSlug,
        questionId: problem?.questionId ?? null,
        difficulty: problem?.difficulty ?? task.difficulty,
        question: problem?.question ?? null,
        topicTags: problem?.topicTags ?? [],
        hints: problem?.hints ?? [],
        url: task.url ?? `https://leetcode.com/problems/${task.titleSlug}/`,
      });
    } catch {
      setDrawerProblem({
        title: task.title,
        titleSlug: task.titleSlug,
        difficulty: task.difficulty,
        question: null,
        topicTags: [],
      });
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const handleAddToProgress = useCallback((task) => {
    handleAdd({ ...task, status: "doing" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recent 100: unique solved submissions, newest first
  const recent100 = useMemo(() => {
    const subs = data?.submissions ?? [];
    const seen = new Set();
    const result = [];
    for (const s of subs) {
      if (seen.has(s.titleSlug)) continue;
      seen.add(s.titleSlug);
      result.push({
        id: `rc-${s.titleSlug}`,
        title: s.title,
        titleSlug: s.titleSlug,
        difficulty: getProblemBySlug(s.titleSlug)?.difficulty ?? "Unknown",
        premium: getProblemBySlug(s.titleSlug)?.premium ?? false,
        status: "recent",
        companies: getCompaniesForSlug(s.titleSlug),
        topics: [],
        url: `https://leetcode.com/problems/${s.titleSlug}/`,
        timestamp: s.timestamp,
        fromAPI: true,
      });
      if (result.length >= 100) break;
    }
    return result;
  }, [data]);

  const doingTasks = tasks.filter(t => t.status === "doing");

  return (
    <div className="board-wrap">
      <div className="board">
        {/* Column 1 — Daily */}
        <DailyColumn
          filterCompany={filterCompany}
          onCompanyChange={applyCompanyFilter}
          onAddToProgress={handleAddToProgress}
          onOpen={handleOpenProblem}
        />

        {/* Column 2 — In Progress */}
        <Column
          status="doing"
          tasks={doingTasks}
          onDelete={handleDelete}
          onAdd={() => setAddingStatus("doing")}
          onOpen={handleOpenProblem}
        />

        {/* Column 3 — Recent 100 */}
        <Column
          status="recent"
          tasks={recent100}
          onOpen={handleOpenProblem}
          readOnly
        />
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
