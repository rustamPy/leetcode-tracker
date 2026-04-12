'use strict';

const {
    app, BrowserWindow, Tray, ipcMain,
    shell, nativeImage, screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { isSafeLeetCodeUrl, calcStreak } = require('./utils');

if (!app.requestSingleInstanceLock()) { app.quit(); }

let tray = null;
let win = null;
let userData = null;
let fetchedAt = null;
let _companyData = null;

const EMPTY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=',
    'base64',
);

app.dock?.hide();

app.whenReady().then(async () => {
    createTray();
    createWindow();
    await loadInitialData();
});

app.on('window-all-closed', e => e.preventDefault());

function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    let icon;
    if (fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
        icon.setTemplateImage(true);
    } else {
        icon = nativeImage.createFromBuffer(EMPTY_PNG);
    }

    tray = new Tray(icon);
    tray.setTitle('');
    tray.setToolTip('LeetCode Tracker');
    tray.on('click', toggleWindow);
    tray.on('right-click', toggleWindow);
}

function createWindow() {
    win = new BrowserWindow({
        width: 400,
        height: 590,
        show: false,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    if (process.env.NODE_ENV === 'development') {
        const fs = require('fs');
        fs.watch(path.join(__dirname, 'renderer', 'index.html'), () => {
            win.webContents.reloadIgnoringCache();
        });
    }

    win.on('blur', () => {
        if (!win.webContents.isDevToolsOpened()) win.hide();
    });
}

function toggleWindow() {
    if (!win) return;
    if (win.isVisible()) {
        win.hide();
    } else {
        positionAndShow();
    }
}

function positionAndShow() {
    const tb = tray.getBounds();
    const wb = win.getBounds();
    const disp = screen.getDisplayNearestPoint({ x: tb.x, y: tb.y });
    const wa = disp.workArea;

    let x = Math.round(tb.x + tb.width / 2 - wb.width / 2);
    let y = tb.y + tb.height + 4;

    if (x + wb.width > wa.x + wa.width) x = wa.x + wa.width - wb.width - 8;
    if (x < wa.x) x = wa.x + 8;
    if (y + wb.height > wa.y + wa.height) y = tb.y - wb.height - 4;

    win.setPosition(x, y);
    win.show();
    win.focus();
    win.webContents.send('data-update', { userData, fetchedAt });
}

ipcMain.handle('get-cached-data', () => ({ userData, fetchedAt }));

ipcMain.handle('fetch-user-data', async (_, username) => {
    try {
        const fresh = await fetchLeetCodeData(username ?? getStoredUsername());
        userData = fresh;
        fetchedAt = Date.now();
        updateTrayTitle();
        saveUserDataLocally(fresh);
        return { userData, fetchedAt };
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle('get-companies', () => {
    const data = readCompanyData();
    return data ? (data.companies ?? []) : [];
});

ipcMain.handle('get-company-problems', (_, company) => {
    const data = readCompanyData();
    if (!data) return { real: [], suggested: [] };
    const problems = data.problems ?? {};
    const suggestedMap = data.suggested ?? {};

    let allProblems = problems;
    try {
        const pd = dataFile('problemsData.json');
        if (pd) allProblems = { ...JSON.parse(fs.readFileSync(pd, 'utf-8')), ...problems };
    } catch { }

    const real = Object.entries(problems)
        .filter(([, p]) => Array.isArray(p.companies) && p.companies.includes(company))
        .map(([slug, p]) => ({ ...p, titleSlug: slug }));
    const realSlugs = new Set(real.map(p => p.titleSlug));

    const suggested = (suggestedMap[company] ?? [])
        .filter(slug => !realSlugs.has(slug))
        .slice(0, 200)
        .map(slug => ({ ...allProblems[slug], titleSlug: slug }))
        .filter(p => p && p.title);

    return { real, suggested };
});

ipcMain.handle('get-daily-problem', async () => {
    try {
        const p = dataFile('problemsData.json');
        if (!p) return null;
        const all = JSON.parse(fs.readFileSync(p, 'utf-8'));
        const slugs = Object.keys(all).filter(s => !all[s].premium && all[s].id);
        if (!slugs.length) return null;
        const d = new Date();
        const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
        const slug = slugs[seed % slugs.length];
        const prob = { ...all[slug], titleSlug: slug };
        try {
            const qData = await gqlRequest(GQL_PROBLEM_PREMIUM, { titleSlug: slug });
            if (typeof qData?.question?.isPaidOnly === 'boolean') {
                prob.premium = qData.question.isPaidOnly;
            }
        } catch { /* fall back to local data on network error */ }
        return prob;
    } catch { return null; }
});

ipcMain.handle('check-premium', async (_, titleSlug) => {
    if (typeof titleSlug !== 'string' || !/^[a-z0-9-]+$/.test(titleSlug.trim())) return null;
    try {
        const data = await gqlRequest(GQL_PROBLEM_PREMIUM, { titleSlug: titleSlug.trim() });
        return typeof data?.question?.isPaidOnly === 'boolean' ? data.question.isPaidOnly : null;
    } catch { return null; }
});

ipcMain.handle('get-username', () => getStoredUsername());

ipcMain.handle('save-username', (_, username) => {
    if (typeof username !== 'string') return false;
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(username.trim())) return false;
    fs.writeFileSync(usernameFile(), username.trim(), 'utf-8');
    return true;
});

ipcMain.handle('get-session', () => getStoredSession());

ipcMain.handle('save-session', (_, token) => {
    try {
        if (typeof token !== 'string') return false;
        // Only allow characters valid in a cookie value (no semicolons, spaces, etc.)
        const clean = token.trim();
        if (clean && !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/.test(clean)) return false;
        if (clean) fs.writeFileSync(sessionFile(), clean, 'utf-8');
        else if (fs.existsSync(sessionFile())) fs.unlinkSync(sessionFile());
        return true;
    } catch { return false; }
});

// Returns the LeetCode username the stored session token belongs to, or null.
ipcMain.handle('get-session-username', async () => {
    const session = getStoredSession();
    if (!session) return null;
    try {
        const data = await gqlRequest('query { userStatus { username } }', {});
        return data?.userStatus?.username ?? null;
    } catch { return null; }
});

// Returns the full session status object.
// { hasSession, expired?, mismatch?, sessionUsername?, storedUsername }
ipcMain.handle('check-session', async () => {
    const storedUsername = getStoredUsername();
    const session = getStoredSession();
    if (!session) return { hasSession: false, storedUsername };
    try {
        const data = await gqlRequest('query { userStatus { username } }', {});
        const sessionUsername = data?.userStatus?.username ?? null;
        if (!sessionUsername) return { hasSession: false, expired: true, storedUsername };
        const mismatch = sessionUsername.toLowerCase() !== storedUsername.toLowerCase();
        return { hasSession: true, sessionUsername, storedUsername, mismatch };
    } catch {
        // Network error — session file exists but couldn't verify; don't block the UI
        return { hasSession: true, sessionUsername: null, storedUsername };
    }
});

// Opens an in-app LeetCode login window; resolves with { success, token, sessionUsername }
// once the LEETCODE_SESSION cookie appears in that window's session.
ipcMain.handle('login-with-browser', async () => {
    return new Promise((resolve) => {
        const authWin = new BrowserWindow({
            width: 920,
            height: 660,
            show: true,
            alwaysOnTop: true,
            title: 'Log in to LeetCode',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            },
        });

        authWin.loadURL('https://leetcode.com/accounts/login/');

        const checkCookie = async () => {
            try {
                const cookies = await authWin.webContents.session.cookies.get({
                    domain: 'leetcode.com',
                    name: 'LEETCODE_SESSION',
                });
                if (!cookies.length) return;
                const token = cookies[0].value;
                // Persist immediately so gqlRequest picks it up
                fs.writeFileSync(sessionFile(), token, 'utf-8');
                let sessionUsername = null;
                try {
                    const d = await gqlRequest('query { userStatus { username } }', {});
                    sessionUsername = d?.userStatus?.username ?? null;
                } catch { }
                authWin.close();
                resolve({ success: true, token, sessionUsername });
            } catch { }
        };

        authWin.webContents.on('did-navigate', checkCookie);
        authWin.webContents.on('did-navigate-in-page', checkCookie);
        authWin.on('closed', () => resolve({ success: false }));
    });
});

ipcMain.on('open-url', (_, url) => {
    if (isSafeLeetCodeUrl(url)) shell.openExternal(url);
});

ipcMain.on('open-webapp', () => {
    const user = getStoredUsername();
    shell.openExternal(`https://leetcode.com/${encodeURIComponent(user)}/`);
});

ipcMain.on('open-tracker', () => {
    const session = getStoredSession();
    const base = 'https://rustampy.github.io/leetcode-tracker/';
    const url = session ? `${base}#lc-session=${encodeURIComponent(session)}` : base;
    shell.openExternal(url);
});

const GQL_PROBLEM_PREMIUM = `
query QuestionPremium($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    isPaidOnly
  }
}`;

const GQL_PROFILE = `
query GetUser($u: String!) {
  matchedUser(username: $u) {
    username
    profile { realName userAvatar ranking countryName }
    submitStats: submitStatsGlobal {
      acSubmissionNum { difficulty count }
    }
    badges      { id name displayName icon }
    activeBadge { id displayName icon }
  }
  userContestRanking(username: $u) {
    attendedContestsCount rating globalRanking topPercentage
  }
}`;

const GQL_SUBS = `
query GetSubs($u: String!, $limit: Int!) {
  recentAcSubmissionList(username: $u, limit: $limit) {
    id title titleSlug timestamp
  }
}`;

// Authenticated query — requires LEETCODE_SESSION cookie.
// userProgressQuestionList(questionStatus: SOLVED) returns every problem
// the authenticated user has accepted. Pagination via skip/limit inside filters.
// Query shape confirmed via LeetCode GraphQL introspection.
const GQL_ALL_AC = `
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

async function fetchAllAcSubmissions() {
    const PAGE = 100;
    const seen = new Map();
    let skip = 0;
    for (let guard = 0; guard < 200; guard++) {
        const data = await gqlRequest(GQL_ALL_AC, { skip, limit: PAGE });
        const list = data?.userProgressQuestionList?.questions ?? [];
        for (const q of list) {
            if (!seen.has(q.titleSlug)) {
                seen.set(q.titleSlug, {
                    title: q.title,
                    titleSlug: q.titleSlug,
                    timestamp: q.lastSubmittedAt
                        ? String(Math.floor(new Date(q.lastSubmittedAt).getTime() / 1000))
                        : '0',
                    lang: '',
                });
            }
        }
        const total = data?.userProgressQuestionList?.totalNum ?? 0;
        if (!list.length || seen.size >= total) break;
        skip += PAGE;
    }
    return [...seen.values()];
}

function gqlRequest(query, variables) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query, variables });
        const session = getStoredSession();
        const req = https.request(
            {
                hostname: 'leetcode.com',
                path: '/graphql',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'User-Agent': 'Mozilla/5.0 LC-Tracker-MenuBar/1.0',
                    'Referer': 'https://leetcode.com',
                    'Origin': 'https://leetcode.com',
                    ...(session ? { 'Cookie': `LEETCODE_SESSION=${session}` } : {}),
                },
            },
            res => {
                let data = '';
                res.on('data', c => { data += c; });
                res.on('end', () => {
                    try {
                        const j = JSON.parse(data);
                        if (j.errors) reject(new Error(j.errors[0].message));
                        else resolve(j.data);
                    } catch (e) { reject(e); }
                });
            },
        );
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timed out')); });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function fetchLeetCodeData(username) {
    const session = getStoredSession();
    const profileData = await gqlRequest(GQL_PROFILE, { u: username });

    const user = profileData?.matchedUser;
    if (!user) throw new Error(`User "${username}" not found on LeetCode`);

    // With session: paginate submissionList (no cap, returns ALL accepted).
    // Without session: recentAcSubmissionList is capped at ~20 by LeetCode regardless of limit.
    let submissions;
    if (session) {
        submissions = await fetchAllAcSubmissions();
    } else {
        const subsData = await gqlRequest(GQL_SUBS, { u: username, limit: 100 });
        submissions = subsData?.recentAcSubmissionList ?? [];
    }

    const counts = user.submitStats?.acSubmissionNum ?? [];
    const byDiff = Object.fromEntries(counts.map(c => [c.difficulty, c.count]));

    return {
        username,
        profile: user.profile ?? {},
        solved: {
            total: byDiff.All ?? 0,
            easy: byDiff.Easy ?? 0,
            medium: byDiff.Medium ?? 0,
            hard: byDiff.Hard ?? 0,
        },
        contest: profileData?.userContestRanking ?? {},
        badges: user.badges ?? [],
        activeBadge: user.activeBadge ?? null,
        submissions,
    };
}

function updateTrayTitle() {
    if (!tray) return;
    const streak = userData ? calcStreak(userData.submissions) : 0;
    const total = userData?.solved?.total ?? 0;
    tray.setTitle(streak > 0 ? ` ${streak}` : '');
    tray.setToolTip(`LeetCode Tracker\n${total} solved · ${streak}-day streak`);
}

function dataDir() {
    const rp = path.join(process.resourcesPath ?? __dirname, 'data');
    if (fs.existsSync(rp)) return rp;
    return path.join(__dirname, 'data');
}

function dataFile(name) {
    const p = path.join(dataDir(), name);
    return fs.existsSync(p) ? p : null;
}

function usernameFile() {
    return path.join(app.getPath('userData'), 'username.txt');
}

function sessionFile() {
    return path.join(app.getPath('userData'), 'session.txt');
}

function getStoredSession() {
    try {
        const f = sessionFile();
        return fs.existsSync(f) ? fs.readFileSync(f, 'utf-8').trim() : '';
    } catch { return ''; }
}

function getStoredUsername() {
    const f = usernameFile();
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf-8').trim();
    try {
        const fp = dataFile('userData.json');
        if (fp) return JSON.parse(fs.readFileSync(fp, 'utf-8')).username ?? 'thisisrustam';
    } catch { }
    return 'thisisrustam';
}

function readCompanyData() {
    if (_companyData) return _companyData;
    const p = dataFile('companyData.json');
    if (!p) return null;
    try {
        _companyData = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return _companyData;
    } catch { return null; }
}

function saveUserDataLocally(data) {
    try {
        const dir = app.getPath('userData');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Merge with previously saved submissions for the same user.
        // LeetCode's public API caps recentAcSubmissionList at ~20 per fetch,
        // so we accumulate slugs across refreshes rather than overwriting.
        try {
            const savedPath = path.join(dir, 'live-userData.json');
            if (fs.existsSync(savedPath)) {
                const prev = JSON.parse(fs.readFileSync(savedPath, 'utf-8'));
                if (
                    prev.username?.toLowerCase() === data.username?.toLowerCase() &&
                    Array.isArray(prev.submissions) && prev.submissions.length
                ) {
                    const newSlugs = new Set((data.submissions ?? []).map(s => s.titleSlug));
                    data = {
                        ...data,
                        submissions: [
                            ...(data.submissions ?? []),
                            ...prev.submissions.filter(s => !newSlugs.has(s.titleSlug)),
                        ],
                    };
                }
            }
        } catch { }

        fs.writeFileSync(
            path.join(dir, 'live-userData.json'),
            JSON.stringify({ ...data, fetchedAt: new Date().toISOString() }),
        );
    } catch { }
}

async function loadInitialData() {
    try {
        const p = path.join(app.getPath('userData'), 'live-userData.json');
        if (fs.existsSync(p)) {
            const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
            userData = raw;
            fetchedAt = new Date(raw.fetchedAt).getTime();
            updateTrayTitle();
        }
    } catch { }

    if (!userData) {
        try {
            const fp = dataFile('userData.json');
            if (fp) {
                const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
                const s = raw.solved ?? {};
                userData = {
                    username: raw.username ?? getStoredUsername(),
                    profile: raw.profile ?? {},
                    solved: {
                        total: s.solvedProblem ?? 0,
                        easy: s.easySolved ?? 0,
                        medium: s.mediumSolved ?? 0,
                        hard: s.hardSolved ?? 0,
                    },
                    contest: raw.contest ?? {},
                    badges: raw.badges ?? [],
                    activeBadge: raw.activeBadge ?? null,
                    submissions: raw.submissions ?? [],
                };
                fetchedAt = raw.fetchedAt ? new Date(raw.fetchedAt).getTime() : null;
                updateTrayTitle();
            }
        } catch { }
    }

    fetchLeetCodeData(getStoredUsername())
        .then(fresh => {
            userData = fresh;
            fetchedAt = Date.now();
            updateTrayTitle();
            saveUserDataLocally(fresh);
            if (win?.isVisible()) win.webContents.send('data-update', { userData, fetchedAt });
        })
        .catch(() => { });
}
