import companyData from "../data/companyData.json";
import userData from "../data/userData.json";
import problemsData from "../data/problemsData.json";

const TASKS_KEY = "lc_tasks_v1";

/* ── Static user data (pre-fetched at build time) ──────────── */
export const userProfile = userData.profile;
export const userSolved = userData.solved;
export const userContest = userData.contest ?? {};
export const userBadges = userData.badges ?? [];
export const userActiveBadge = userData.activeBadge ?? null;
export const userSubmissions = userData.submissions ?? [];
export const dataFetchedAt = userData.fetchedAt;

/* ── Company data ──────────────────────────────────────────── */
export const companies = companyData.companies;    // sorted string[]
export const problemsBySlug = companyData.problems;     // slug → {title,difficulty,topics,url,companies}
const suggestedByCompany = companyData.suggested ?? {}; // company → slug[]

export function getCompaniesForSlug(slug) {
  return problemsBySlug[slug]?.companies ?? [];
}

export function getSuggestedForCompany(company, { topic = "", difficulty = "" } = {}) {
  const slugs = suggestedByCompany[company] ?? [];
  const d = difficulty.toLowerCase();
  return slugs
    .map(slug => {
      // prefer full data from problemsData, fall back to companyData
      const p = allProblemsBySlug[slug] ?? problemsBySlug[slug];
      if (!p) return null;
      return { ...p, titleSlug: slug };
    })
    .filter(p => {
      if (!p) return false;
      const matchT = !topic || (p.topics ?? []).includes(topic);
      const matchD = !d || (p.difficulty ?? "").toLowerCase() === d;
      return matchT && matchD;
    });
}

export function getProblemsForCompany(company, { topic = "" } = {}) {
  return Object.entries(problemsBySlug)
    .filter(([, p]) => {
      const matchC = p.companies.includes(company);
      const matchT = !topic || (p.topics ?? []).includes(topic);
      return matchC && matchT;
    })
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

/* ── All-problems data (from Leetcode.csv via build script) ── */
// slug → { id, title, difficulty, topics, premium }
export const allProblemsBySlug = problemsData;

// Sorted list of all unique topics across all problems
export const allTopics = [...new Set(
  Object.values(problemsData).flatMap(p => p.topics ?? [])
)].sort();

export function getProblemBySlug(slug) {
  return allProblemsBySlug[slug] ?? null;
}

export function searchAllProblems({ query = "", difficulty = "", topic = "" } = {}) {
  if (!query && !difficulty && !topic) return [];
  const q = query.trim().toLowerCase();
  const d = difficulty.toLowerCase();
  const filtered = Object.entries(allProblemsBySlug)
    .filter(([, p]) => {
      const matchQ = !q || p.title.toLowerCase().includes(q);
      const matchD = !d || p.difficulty.toLowerCase() === d;
      const matchT = !topic || (p.topics ?? []).includes(topic);
      return matchQ && matchD && matchT;
    })
    .map(([slug, p]) => ({ ...p, titleSlug: slug }));

  if (!q) return filtered.slice(0, 50);

  return filtered
    .sort((a, b) => {
      const at = a.title.toLowerCase();
      const bt = b.title.toLowerCase();
      const score = t => t === q ? 0 : t.startsWith(q) ? 1 : 2;
      return score(at) - score(bt);
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
  getTasks: () => loadTasks(),
  createTask: (task) => {
    const existing = loadTasks();
    if (task.titleSlug && existing.some(t => t.titleSlug === task.titleSlug)) return null;
    const t = { ...task, id: (crypto.randomUUID ?? (() => `${Date.now()}-${Math.random().toString(36).slice(2)}`))() };
    saveTasks([...existing, t]);
    return t;
  },
  updateTask: (id, update) => { const tasks = loadTasks().map(t => t.id === id ? { ...t, ...update } : t); saveTasks(tasks); return tasks.find(t => t.id === id); },
  deleteTask: (id) => { saveTasks(loadTasks().filter(t => t.id !== id)); },
};
