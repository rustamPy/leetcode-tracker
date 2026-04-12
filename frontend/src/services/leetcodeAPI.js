

const GQL = import.meta.env.PROD
  ? (import.meta.env.VITE_GQL_PROXY ?? "")
  : "/lc-graphql";
const CACHE_KEY = "lc_user_cache_v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_KEY = "lc_session_v1";

export function getSession() {
  return localStorage.getItem(SESSION_KEY) ?? "";
}
export function setSession(token) {
  if (token) localStorage.setItem(SESSION_KEY, token);
  else localStorage.removeItem(SESSION_KEY);
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

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

// Authenticated query — uses LEETCODE_SESSION cookie.
// userProgressQuestionList(questionStatus: SOLVED) returns every problem
// the authenticated user has accepted. Pagination via skip/limit inside filters.
// Query shape confirmed via LeetCode GraphQL introspection.
const ALL_AC_QUERY = `
query GetAllSolved($skip: Int!, $limit: Int!) {
  userProgressQuestionList(filters: {
    questionStatus: SOLVED
    skip: $skip
    limit: $limit
    sortField: LAST_SUBMITTED_AT
    sortOrder: DESCENDING
  }) {
    totalNum
    questions { title titleSlug lastSubmittedAt }
  }
}`;

// Paginate until all solved problems are fetched. Deduplicates by titleSlug.
async function fetchAllAcSubmissions() {
  const PAGE = 100;
  const seen = new Map();
  let skip = 0;
  for (let guard = 0; guard < 200; guard++) {
    const data = await gql(ALL_AC_QUERY, { skip, limit: PAGE });
    const list = data?.userProgressQuestionList?.questions ?? [];
    for (const q of list) {
      if (!seen.has(q.titleSlug)) {
        seen.set(q.titleSlug, {
          title: q.title,
          titleSlug: q.titleSlug,
          timestamp: q.lastSubmittedAt ?? "0",
          lang: "",
        });
      }
    }
    const total = data?.userProgressQuestionList?.totalNum ?? 0;
    if (!list.length || seen.size >= total) break;
    skip += PAGE;
  }
  return [...seen.values()];
}

async function gql(query, variables) {
  const session = getSession();
  const headers = { "Content-Type": "application/json" };
  if (session) headers["x-lc-session"] = session;
  const res = await fetch(GQL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "GraphQL error");
  return json.data;
}


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

function normalise(profileData, subData) {
  const u = profileData?.matchedUser ?? null;
  const cr = profileData?.userContestRanking ?? {};
  if (!u) return null;

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

export async function fetchUserData(username, { force = false } = {}) {
  const key = username.toLowerCase();

  if (!force) {
    const entry = getCacheEntry(username);
    if (entry && Date.now() - entry.cachedAt < CACHE_TTL) {
      return { data: entry.data, fromCache: true, cachedAt: entry.cachedAt };
    }
  }

  // When a session is available, use authenticated paginated submissionList
  // which returns ALL accepted submissions (no server-side cap).
  // Without auth, recentAcSubmissionList is hard-capped at ~20 by LeetCode.
  const session = getSession();
  const [profileData, recentSubData] = await Promise.all([
    gql(PROFILE_QUERY, { username }),
    session ? Promise.resolve(null) : gql(SUBMISSIONS_QUERY, { username, limit: 100 }),
  ]);

  let data = normalise(profileData, recentSubData);
  if (!data) throw new Error(`User "${username}" not found on LeetCode`);

  if (session) {
    const allSubs = await fetchAllAcSubmissions();
    data = { ...data, submissions: allSubs };
  }

  // LeetCode's public API caps recentAcSubmissionList at ~20 items regardless
  // of the requested limit. Merge with previously cached submissions for this
  // user so the solved-slugs set grows over time rather than resetting.
  const cache = loadCache();
  const prev = cache[key]?.data;
  if (prev?.username?.toLowerCase() === key && prev.submissions?.length) {
    const newSlugs = new Set(data.submissions.map(s => s.titleSlug));
    data = {
      ...data,
      submissions: [
        ...data.submissions,
        ...prev.submissions.filter(s => !newSlugs.has(s.titleSlug)),
      ],
    };
  }

  cache[key] = { data, cachedAt: Date.now() };
  saveCache(cache);

  return { data, fromCache: false, cachedAt: Date.now() };
}

const USER_STATUS_QUERY = `query { userStatus { username } }`;

// Returns the LeetCode username that the current session token belongs to.
// Returns null if no session is set or the query fails.
export async function fetchSessionUsername() {
  if (!getSession()) return null;
  try {
    const data = await gql(USER_STATUS_QUERY, {});
    return data?.userStatus?.username ?? null;
  } catch {
    return null;
  }
}

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
