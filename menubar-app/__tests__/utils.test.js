'use strict';

const { isSafeLeetCodeUrl, calcStreak } = require('../utils');

describe('isSafeLeetCodeUrl', () => {
    it('accepts a valid leetcode.com https URL', () => {
        expect(isSafeLeetCodeUrl('https://leetcode.com/problems/two-sum/')).toBe(true);
    });

    it('accepts the root leetcode.com URL', () => {
        expect(isSafeLeetCodeUrl('https://leetcode.com/')).toBe(true);
    });

    it('rejects http URLs', () => {
        expect(isSafeLeetCodeUrl('http://leetcode.com/problems/two-sum/')).toBe(false);
    });

    it('rejects URLs from other domains', () => {
        expect(isSafeLeetCodeUrl('https://evil.com/leetcode.com')).toBe(false);
    });

    it('rejects leetcode.com subdomains', () => {
        expect(isSafeLeetCodeUrl('https://sub.leetcode.com/problems/two-sum/')).toBe(false);
    });

    it('rejects an empty string', () => {
        expect(isSafeLeetCodeUrl('')).toBe(false);
    });

    it('rejects a plain string that is not a URL', () => {
        expect(isSafeLeetCodeUrl('not-a-url')).toBe(false);
    });

    it('rejects javascript: scheme', () => {
        expect(isSafeLeetCodeUrl('javascript:alert(1)')).toBe(false);
    });
});

describe('calcStreak', () => {
    const DAY_S = 86400;

    function tsSeconds(daysAgo) {
        return Math.floor((Date.now() - daysAgo * DAY_S * 1000) / 1000);
    }

    it('returns 0 for an empty submissions array', () => {
        expect(calcStreak([])).toBe(0);
    });

    it('returns 0 when the most recent submission is older than yesterday', () => {
        const subs = [{ timestamp: tsSeconds(3) }, { timestamp: tsSeconds(4) }];
        expect(calcStreak(subs)).toBe(0);
    });

    it('returns 1 for a single submission today', () => {
        const subs = [{ timestamp: tsSeconds(0) }];
        expect(calcStreak(subs)).toBe(1);
    });

    it('returns 1 for a single submission yesterday', () => {
        const subs = [{ timestamp: tsSeconds(1) }];
        expect(calcStreak(subs)).toBe(1);
    });

    it('counts a consecutive multi-day streak starting today', () => {
        const subs = [
            { timestamp: tsSeconds(0) },
            { timestamp: tsSeconds(1) },
            { timestamp: tsSeconds(2) },
        ];
        expect(calcStreak(subs)).toBe(3);
    });

    it('stops counting at a gap in the streak', () => {
        const subs = [
            { timestamp: tsSeconds(0) },
            { timestamp: tsSeconds(1) },
            { timestamp: tsSeconds(3) },
        ];
        expect(calcStreak(subs)).toBe(2);
    });

    it('counts multiple submissions per day as a single day', () => {
        const nowTs = tsSeconds(0);
        const subs = [
            { timestamp: nowTs },
            { timestamp: nowTs - 60 },
            { timestamp: tsSeconds(1) },
        ];
        expect(calcStreak(subs)).toBe(2);
    });
});
