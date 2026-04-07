const API_BASE = "https://alfa-leetcode-api.onrender.com";
const USERNAME = "thisisrustam";
const TASKS_KEY = "lc_tasks_v1";

async function fetchAPI(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
  catch { return []; }
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export const USERNAME_CONST = USERNAME;

export const api = {
  getProfile:     () => fetchAPI(`/${USERNAME}/profile`),
  getSolved:      () => fetchAPI(`/${USERNAME}/solved`),
  getSubmissions: (limit = 100) => fetchAPI(`/${USERNAME}/acSubmission?limit=${limit}`),
  getProblems:    (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    return fetchAPI(`/problems${qs ? "?" + qs : ""}`);
  },

  getTasks:    ()               => loadTasks(),
  createTask:  (task)           => { const t = { ...task, id: crypto.randomUUID() }; saveTasks([...loadTasks(), t]); return t; },
  updateTask:  (id, update)     => { const tasks = loadTasks().map(t => t.id === id ? { ...t, ...update } : t); saveTasks(tasks); return tasks.find(t => t.id === id); },
  deleteTask:  (id)             => { saveTasks(loadTasks().filter(t => t.id !== id)); return { ok: true }; },
};
