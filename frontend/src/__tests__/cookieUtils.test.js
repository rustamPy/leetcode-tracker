import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    setCookie,
    getCookie,
    deleteCookie,
    clearAllLCCookies,
    getLCCookieNames,
} from "../services/cookieUtils";

beforeEach(() => {
    document.cookie.split(";").forEach((c) => {
        const name = c.trim().split("=")[0];
        if (name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
    });
});

describe("setCookie / getCookie", () => {
    it("returns the stored value", () => {
        setCookie("lc_test", "hello");
        expect(getCookie("lc_test")).toBe("hello");
    });

    it("returns null for a cookie that was never set", () => {
        expect(getCookie("lc_does_not_exist")).toBeNull();
    });

    it("encodes and decodes special characters", () => {
        setCookie("lc_test", "hello world");
        expect(getCookie("lc_test")).toBe("hello world");
    });

    it("overwrites an existing value", () => {
        setCookie("lc_test", "first");
        setCookie("lc_test", "second");
        expect(getCookie("lc_test")).toBe("second");
    });
});

describe("deleteCookie", () => {
    it("removes the cookie so getCookie returns null", () => {
        setCookie("lc_del", "bye");
        deleteCookie("lc_del");
        expect(getCookie("lc_del")).toBeNull();
    });
});

describe("clearAllLCCookies", () => {
    it("removes all cookies with the lc_ prefix", () => {
        setCookie("lc_a", "1");
        setCookie("lc_b", "2");
        clearAllLCCookies();
        expect(getCookie("lc_a")).toBeNull();
        expect(getCookie("lc_b")).toBeNull();
    });

    it("does not remove cookies without the lc_ prefix", () => {
        setCookie("other_cookie", "keep");
        setCookie("lc_remove", "gone");
        clearAllLCCookies();
        expect(getCookie("other_cookie")).toBe("keep");
    });
});

describe("getLCCookieNames", () => {
    it("returns only lc_-prefixed cookie names", () => {
        setCookie("lc_x", "1");
        setCookie("lc_y", "2");
        setCookie("not_lc", "3");
        const names = getLCCookieNames();
        expect(names).toContain("lc_x");
        expect(names).toContain("lc_y");
        expect(names).not.toContain("not_lc");
    });

    it("returns an empty array when no lc_ cookies exist", () => {
        expect(getLCCookieNames()).toEqual([]);
    });
});
