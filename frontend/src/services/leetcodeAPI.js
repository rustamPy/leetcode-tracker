/**
 * LeetCode data service — fetches via LeetCode GraphQL,
 * caches results in localStorage, supports any username.
 */

const GQL = import.meta.env.PROD
  ? (import.meta.env.VITE_GQL_PROXY ?? "")  // Cloudflare Worker URL set at build time
  : "/lc-graphql";                           // proxied via Vite → leetcode.com/graphql
const CACHE_KEY = "lc_user_cache_v1";   // { [username]: { data, cachedAt } }
const CACHE_TTL = 6 * 60 * 60 * 1000;  // 6 hours

// ── GraphQL query ──────────────────────────────────────────────
const PROFILE_QUERY = `
query GetUser($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      realName
      userAvatar
      ranking
      countryName
      company
      school
      skillTags
      starRating
    }
    submitStats: submitStatsGlobal {
      acSubmissionNum { difficulty count }
    }
    badges { id name icon displayName }
    activeBadge { id displayName icon }
  }
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    topPercentage
  }
}`;

const SUBMISSIONS_QUERY = `
query GetSubs($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id title titleSlug timestamp lang
  }
}`;

// ── Fetch helpers ──────────────────────────────────────────────
async function gql(query, variables) {
  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "GraphQL error");
  return json.data;
}

// ── Cache helpers ──────────────────────────────────────────────
function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); }
  catch { return {}; }
}
function saveCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
export function getCacheEntry(username) {
  return loadCache()[username?.toLowerCase()] ?? null;
}
export function clearCacheForUser(username) {
  const c = loadCache();
  delete c[username?.toLowerCase()];
  saveCache(c);
}
export function clearAllCache() {
  localStorage.removeItem(CACHE_KEY);
}
export function getCachedUsernames() {
  return Object.keys(loadCache());
}

// ── Normalise raw GQL response ─────────────────────────────────
function normalise(profileData, subData) {
  const u = profileData?.matchedUser ?? null;
  const cr = profileData?.userContestRanking ?? {};
  if (!u) return null;                    // username doesn't exist

  const ac = Object.fromEntries(
    (u.submitStats?.acSubmissionNum ?? []).map(s => [s.difficulty, s.count])
  );
  return {
    username: u.username,
    profile: {
      realName: u.profile?.realName ?? "",
      userAvatar: u.profile?.userAvatar ?? "",
      ranking: u.profile?.ranking ?? 0,
      countryName: u.profile?.countryName ?? "",
      company: u.profile?.company ?? "",
      school: u.profile?.school ?? "",
      skillTags: u.profile?.skillTags ?? [],
      starRating: u.profile?.starRating ?? 0,
    },
    solved: {
      total: ac["All"] ?? 0,
      easy: ac["Easy"] ?? 0,
      medium: ac["Medium"] ?? 0,
      hard: ac["Hard"] ?? 0,
    },
    contest: {
      attended: cr.attendedContestsCount ?? 0,
      rating: cr.rating ?? 0,
      globalRanking: cr.globalRanking ?? 0,
      topPercentage: cr.topPercentage ?? 0,
    },
    badges: u.badges ?? [],
    activeBadge: u.activeBadge ?? null,
    submissions: (subData?.recentAcSubmissionList ?? []).map(s => ({
      title: s.title,
      titleSlug: s.titleSlug,
      timestamp: s.timestamp,
      lang: s.lang,
    })),
  };
}

// ── Main fetch function ────────────────────────────────────────
export async function fetchUserData(username, { force = false } = {}) {
  const key = username.toLowerCase();

  // 1. Return valid cache unless forced
  if (!force) {
    const entry = getCacheEntry(username);
    if (entry && Date.now() - entry.cachedAt < CACHE_TTL) {
      return { data: entry.data, fromCache: true, cachedAt: entry.cachedAt };
    }
  }

  // 2. Fetch from LeetCode GraphQL
  const [profileData, subData] = await Promise.all([
    gql(PROFILE_QUERY, { username }),
    gql(SUBMISSIONS_QUERY, { username, limit: 300 }),
  ]);

  const data = normalise(profileData, subData);
  if (!data) throw new Error(`User "${username}" not found on LeetCode`);

  // 3. Write cache
  const cache = loadCache();
  cache[key] = { data, cachedAt: Date.now() };
  saveCache(cache);

  return { data, fromCache: false, cachedAt: Date.now() };
}

// ── Fetch full problem content (description, tags, hints) ─────
const PROBLEM_QUERY = `
query GetProblem($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
    title
    difficulty
    content
    topicTags { name slug }
    hints
  }
}`;

export async function fetchProblem(titleSlug) {
  const data = await gql(PROBLEM_QUERY, { titleSlug });
  const q = data?.question;
  if (!q) return null;
  return {
    questionId: q.questionFrontendId ?? null,
    title: q.title ?? titleSlug,
    titleSlug,
    difficulty: q.difficulty ?? null,
    question: q.content ?? null,
    topicTags: q.topicTags ?? [],
    hints: q.hints ?? [],
  };
}

// ── Validate username (lightweight — only checks matchedUser) ──
export async function validateUsername(username) {
  if (!username?.trim()) return { valid: false, error: "Username required" };
  try {
    const data = await gql(`
      query Check($u: String!) {
        matchedUser(username: $u) { username profile { userAvatar } }
      }
    `, { u: username.trim() });
    const u = data?.matchedUser;
    if (u?.username) return { valid: true, avatar: u.profile?.userAvatar ?? null };
    return { valid: false, error: "Username not found on LeetCode" };
  } catch (e) {
    // Network / proxy error — can't validate from browser, assume valid
    if (
      e.message.includes("Failed to fetch") ||
      e.message.includes("NetworkError") ||
      e.message.includes("HTTP 4") ||
      e.message.includes("HTTP 5")
    ) {
      return { valid: true, avatar: null, warning: "Could not verify (network)" };
    }
    return { valid: false, error: e.message };
  }
}
