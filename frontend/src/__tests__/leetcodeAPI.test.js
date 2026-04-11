import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    getCacheEntry,
    clearCacheForUser,
    clearAllCache,
    getCachedUsernames,
    fetchUserData,
} from "../services/leetcodeAPI";

const CACHE_KEY = "lc_user_cache_v1";

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

describe("getCacheEntry", () => {
    it("returns null when the cache is empty", () => {
        expect(getCacheEntry("rustam")).toBeNull();
    });

    it("returns the cached entry (case-insensitive key)", () => {
        const entry = { data: { username: "Rustam" }, cachedAt: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rustam: entry }));
        expect(getCacheEntry("RUSTAM")).toEqual(entry);
    });
});

describe("clearCacheForUser", () => {
    it("removes the user's entry from the cache", () => {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ alice: { data: {} }, bob: { data: {} } }));
        clearCacheForUser("alice");
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
        expect(cache.alice).toBeUndefined();
        expect(cache.bob).toBeDefined();
    });

    it("handles a missing cache gracefully", () => {
        expect(() => clearCacheForUser("nobody")).not.toThrow();
    });
});

describe("clearAllCache", () => {
    it("removes the entire cache key from localStorage", () => {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ alice: {} }));
        clearAllCache();
        expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    });
});

describe("getCachedUsernames", () => {
    it("returns an empty array when cache is empty", () => {
        expect(getCachedUsernames()).toEqual([]);
    });

    it("returns all cached usernames", () => {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ alice: {}, bob: {} }));
        const names = getCachedUsernames();
        expect(names).toContain("alice");
        expect(names).toContain("bob");
    });
});

describe("fetchUserData", () => {
    it("returns cached data on a cache hit without calling fetch", async () => {
        const cachedAt = Date.now();
        const data = { username: "alice", solved: { total: 10 } };
        localStorage.setItem(CACHE_KEY, JSON.stringify({ alice: { data, cachedAt } }));

        const fetchSpy = vi.spyOn(globalThis, "fetch");
        const result = await fetchUserData("alice");
        expect(result.fromCache).toBe(true);
        expect(result.data).toEqual(data);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("calls the GQL endpoint on a cache miss", async () => {
        const profilePayload = {
            matchedUser: {
                username: "alice",
                profile: { realName: "Alice", userAvatar: "", ranking: 5000, countryName: "US", company: "", school: "", skillTags: [], starRating: 0 },
                submitStats: { acSubmissionNum: [{ difficulty: "All", count: 5 }, { difficulty: "Easy", count: 5 }, { difficulty: "Medium", count: 0 }, { difficulty: "Hard", count: 0 }] },
                badges: [],
                activeBadge: null,
            },
            userContestRanking: null,
        };
        const subsPayload = { recentAcSubmissionList: [] };

        let callCount = 0;
        vi.spyOn(globalThis, "fetch").mockImplementation(() => {
            callCount++;
            const body = callCount === 1
                ? { data: profilePayload }
                : { data: subsPayload };
            return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
        });

        const result = await fetchUserData("alice", { force: true });
        expect(result.fromCache).toBe(false);
        expect(result.data.username).toBe("alice");
        expect(result.data.solved.easy).toBe(5);
    });

    it("throws when the network request fails", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 503 });
        await expect(fetchUserData("alice", { force: true })).rejects.toThrow();
    });
});
