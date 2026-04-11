import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    companies,
    getCompaniesForSlug,
    getProblemsForCompany,
    searchProblems,
    allProblemsBySlug,
    allTopics,
    getProblemBySlug,
    searchAllProblems,
    api,
} from "../services/api";

describe("companies", () => {
    it("is a non-empty array of strings", () => {
        expect(Array.isArray(companies)).toBe(true);
        expect(companies.length).toBeGreaterThan(0);
        expect(typeof companies[0]).toBe("string");
    });
});

describe("getCompaniesForSlug", () => {
    it("returns companies for a known problem slug", () => {
        const result = getCompaniesForSlug("text-justification");
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });

    it("returns an empty array for an unknown slug", () => {
        expect(getCompaniesForSlug("not-a-real-slug")).toEqual([]);
    });
});

describe("getProblemsForCompany", () => {
    it("returns problems sorted easy-medium-hard", () => {
        const problems = getProblemsForCompany("Amazon");
        expect(problems.length).toBeGreaterThan(0);
        const order = { Easy: 0, Medium: 1, Hard: 2 };
        for (let i = 1; i < problems.length; i++) {
            expect(order[problems[i].difficulty] ?? 3).toBeGreaterThanOrEqual(
                order[problems[i - 1].difficulty] ?? 3
            );
        }
    });

    it("filters by topic when provided", () => {
        const all = getProblemsForCompany("Amazon");
        const allTopicsUsed = [...new Set(all.flatMap((p) => p.topics ?? []))];
        if (!allTopicsUsed.length) return;
        const topic = allTopicsUsed[0];
        const filtered = getProblemsForCompany("Amazon", { topic });
        expect(filtered.every((p) => (p.topics ?? []).includes(topic))).toBe(true);
    });
});

describe("searchProblems", () => {
    it("returns up to 50 results when called with no arguments", () => {
        const results = searchProblems();
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThanOrEqual(50);
    });

    it("filters by query case-insensitively", () => {
        const results = searchProblems({ query: "two sum" });
        expect(results.length).toBeGreaterThan(0);
        results.forEach((p) => {
            expect(p.title.toLowerCase()).toContain("two sum");
        });
    });

    it("filters by difficulty", () => {
        const results = searchProblems({ difficulty: "hard" });
        results.forEach((p) => {
            expect(p.difficulty.toLowerCase()).toBe("hard");
        });
    });

    it("returns at most 50 results", () => {
        const results = searchProblems({ query: "a" });
        expect(results.length).toBeLessThanOrEqual(50);
    });

    it("attaches titleSlug to each result", () => {
        const results = searchProblems({ query: "two sum" });
        results.forEach((p) => expect(typeof p.titleSlug).toBe("string"));
    });
});

describe("allProblemsBySlug", () => {
    it("is a non-empty object", () => {
        expect(typeof allProblemsBySlug).toBe("object");
        expect(Object.keys(allProblemsBySlug).length).toBeGreaterThan(0);
    });
});

describe("allTopics", () => {
    it("is a sorted array of unique strings", () => {
        expect(Array.isArray(allTopics)).toBe(true);
        expect(allTopics.length).toBeGreaterThan(0);
        const sorted = [...allTopics].sort();
        expect(allTopics).toEqual(sorted);
        expect(new Set(allTopics).size).toBe(allTopics.length);
    });
});

describe("getProblemBySlug", () => {
    it("returns the problem for a known slug", () => {
        const slug = Object.keys(allProblemsBySlug)[0];
        const result = getProblemBySlug(slug);
        expect(result).not.toBeNull();
        expect(typeof result.title).toBe("string");
    });

    it("returns null for an unknown slug", () => {
        expect(getProblemBySlug("__definitely_not_a_real_slug__")).toBeNull();
    });
});

describe("searchAllProblems", () => {
    it("returns an empty array when called with no arguments", () => {
        expect(searchAllProblems()).toEqual([]);
    });

    it("matches by title", () => {
        const results = searchAllProblems({ query: "Two Sum" });
        expect(results.some((p) => p.titleSlug === "two-sum")).toBe(true);
    });

    it("filters by difficulty", () => {
        const results = searchAllProblems({ difficulty: "easy", query: "a" });
        results.forEach((p) => {
            expect(p.difficulty.toLowerCase()).toBe("easy");
        });
    });

    it("filters by topic", () => {
        const topic = "Array";
        const results = searchAllProblems({ topic, query: "sum" });
        results.forEach((p) => {
            expect(p.topics ?? []).toContain(topic);
        });
    });

    it("returns at most 50 results", () => {
        const results = searchAllProblems({ query: "a" });
        expect(results.length).toBeLessThanOrEqual(50);
    });
});

describe("api (localStorage tasks)", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("getTasks returns empty array initially", () => {
        expect(api.getTasks()).toEqual([]);
    });

    it("createTask adds a task with a generated id", () => {
        const task = api.createTask({ titleSlug: "two-sum", title: "Two Sum", status: "todo" });
        expect(task).not.toBeNull();
        expect(typeof task.id).toBe("string");
        expect(api.getTasks()).toHaveLength(1);
    });

    it("createTask returns null for duplicate titleSlug", () => {
        api.createTask({ titleSlug: "two-sum", title: "Two Sum", status: "todo" });
        const dup = api.createTask({ titleSlug: "two-sum", title: "Two Sum", status: "todo" });
        expect(dup).toBeNull();
        expect(api.getTasks()).toHaveLength(1);
    });

    it("updateTask modifies the correct task", () => {
        const task = api.createTask({ titleSlug: "two-sum", title: "Two Sum", status: "todo" });
        const updated = api.updateTask(task.id, { status: "completed" });
        expect(updated.status).toBe("completed");
        expect(api.getTasks()[0].status).toBe("completed");
    });

    it("deleteTask removes the task", () => {
        const task = api.createTask({ titleSlug: "two-sum", title: "Two Sum", status: "todo" });
        api.deleteTask(task.id);
        expect(api.getTasks()).toEqual([]);
    });

    it("multiple tasks can be created and retrieved", () => {
        api.createTask({ titleSlug: "task-1", title: "Task 1", status: "todo" });
        api.createTask({ titleSlug: "task-2", title: "Task 2", status: "todo" });
        expect(api.getTasks()).toHaveLength(2);
    });
});
