import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { fetchUserData, clearCacheForUser, clearAllCache } from "../services/leetcodeAPI";
import { setCookie, getCookie, clearAllLCCookies, getLCCookieNames } from "../services/cookieUtils";
import fallback from "../data/userData.json";

const DEFAULT_USER_KEY = "lc_username_v1";
const DEFAULT_USERNAME = fallback.username ?? "thisisrustam";

function readStoredUsername() {
  return getCookie(DEFAULT_USER_KEY) ?? localStorage.getItem(DEFAULT_USER_KEY) ?? DEFAULT_USERNAME;
}

function persistUsername(user) {
  localStorage.setItem(DEFAULT_USER_KEY, user);
  setCookie(DEFAULT_USER_KEY, user, 365);
}

const LCContext = createContext(null);

function buildFallback() {
  const s = fallback.solved ?? {};
  return {
    username: fallback.username ?? DEFAULT_USERNAME,
    profile: fallback.profile ?? {},
    solved: {
      total: s.solvedProblem ?? 0,
      easy: s.easySolved ?? 0,
      medium: s.mediumSolved ?? 0,
      hard: s.hardSolved ?? 0,
    },
    contest: fallback.contest ?? {},
    badges: fallback.badges ?? [],
    activeBadge: fallback.activeBadge ?? null,
    submissions: fallback.submissions ?? [],
  };
}

export function LCProvider({ children }) {
  const [username, setUsername] = useState(() => readStoredUsername());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async (user, force = false) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchUserData(user, { force });
      setData(res.data);
      setCachedAt(res.cachedAt);
      setFromCache(res.fromCache);
    } catch (e) {
      setError(e.message);
      if (user.toLowerCase() === DEFAULT_USERNAME.toLowerCase()) {
        setData(buildFallback());
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(username); }, [username, load]);

  const changeUsername = useCallback((newUser) => {
    persistUsername(newUser);
    setUsername(newUser);
  }, []);

  const refresh = useCallback(() => { clearCacheForUser(username); load(username, true); }, [username, load]);
  const clearCache = useCallback(() => { clearAllCache(); load(username, true); }, [username, load]);
  const clearCookies = useCallback(() => {
    clearAllLCCookies();
  }, []);

  const cookieNames = getLCCookieNames();

  return (
    <LCContext.Provider value={{ username, data, loading, error, cachedAt, fromCache, changeUsername, refresh, clearCache, clearCookies, cookieNames }}>
      {children}
    </LCContext.Provider>
  );
}

export function useLeetCode() {
  const ctx = useContext(LCContext);
  if (!ctx) throw new Error("useLeetCode must be inside <LCProvider>");
  return ctx;
}
