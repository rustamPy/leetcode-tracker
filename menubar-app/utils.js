'use strict';

function isSafeLeetCodeUrl(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && u.hostname === 'leetcode.com';
    } catch { return false; }
}

function calcStreak(submissions = []) {
    if (!submissions.length) return 0;
    const DAY = 86_400_000;
    function key(ms) {
        const d = new Date(ms);
        return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    }
    const days = new Set(submissions.map(s => key(Number(s.timestamp) * 1000)));
    const now = Date.now();
    if (!days.has(key(now)) && !days.has(key(now - DAY))) return 0;
    let streak = 0;
    let cursor = days.has(key(now)) ? now : now - DAY;
    while (days.has(key(cursor))) { streak++; cursor -= DAY; }
    return streak;
}

module.exports = { isSafeLeetCodeUrl, calcStreak };
