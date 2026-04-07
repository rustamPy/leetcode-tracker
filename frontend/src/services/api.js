import companyData from "../data/companyData.json";
import userData    from "../data/userData.json";

const TASKS_KEY = "lc_tasks_v1";

/* ── Static user data (pre-fetched at build time) ──────────── */
export const userProfile    = userData.profile;
export const userSolved     = userData.solved;
export const userContest    = userData.contest    ?? {};
export const userBadges     = userData.badges     ?? [];
export const userActiveBadge = userData.activeBadge ?? null;
export const userSubmissions = userData.submissions ?? [];
export const dataFetchedAt  = userData.fetchedAt;

/* ── Company data ──────────────────────────────────────────── */
export const companies    = companyData.companies;       // sorted string[]
export const problemsBySlug = companyData.problems;      // slug → {title,difficulty,topics,url,companies}

export function getCompaniesForSlug(slug) {
  return problemsBySlug[slug]?.companies ?? [];
}

export function getProblemsForCompany(company) {
  return Object.entries(problemsBySlug)
    .filter(([, p]) => p.companies.includes(company))
    .map(([slug, p]) => ({ ...p, titleSlug: slug }))
    .sort((a, b) => {
      const order = { Easy: 0, Medium: 1, Hard: 2 };
      return (order[a.difficulty] ?? 3) - (order[b.difficulty] ?? 3);
    });
}

export function searchProblems({ query = "", difficulty = "" } = {}) {
  const q = query.trim().toLowerCase();
  const d = difficulty.toLowerCase();
  return Object.entries(problemsBySlug)
    .filter(([, p]) => {
      const matchQ = !q || p.title.toLowerCase().includes(q);
      const matchD = !d || p.difficulty.toLowerCase() === d;
      return matchQ && matchD;
    })
    .map(([slug, p]) => ({ ...p, titleSlug: slug }))
    .sort((a, b) => {
      const order = { Easy: 0, Medium: 1, Hard: 2 };
      return (order[a.difficulty] ?? 3) - (order[b.difficulty] ?? 3);
    })
    .slice(0, 50);
}

/* ── localStorage tasks ────────────────────────────────────── */
function loadTasks() {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
  catch { return []; }
}
function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export const api = {
  getTasks:   ()             => loadTasks(),
  createTask: (task)         => { const t = { ...task, id: crypto.randomUUID() }; saveTasks([...loadTasks(), t]); return t; },
  updateTask: (id, update)   => { const tasks = loadTasks().map(t => t.id === id ? { ...t, ...update } : t); saveTasks(tasks); return tasks.find(t => t.id === id); },
  deleteTask: (id)           => { saveTasks(loadTasks().filter(t => t.id !== id)); },
};
