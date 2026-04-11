'use strict';

const {
    app, BrowserWindow, Tray, ipcMain,
    shell, nativeImage, screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// ── Single-instance guard ────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); }

// ── State ────────────────────────────────────────────────────────────────────
let tray = null;
let win = null;
let userData = null;   // in-memory cache of current user stats
let fetchedAt = null;   // timestamp (ms) of last successful fetch
let _companyData = null; // lazy-loaded, cached once

// ── Transparent 1×1 PNG fallback for tray icon ───────────────────────────────
const EMPTY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=',
    'base64',
);

// ── App bootstrap ────────────────────────────────────────────────────────────
app.dock?.hide(); // hide from macOS Dock

app.whenReady().then(async () => {
    createTray();
    createWindow();
    await loadInitialData();
});

// Keep the app alive when the popup window is closed
app.on('window-all-closed', e => e.preventDefault());

// ── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    let icon;
    if (fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
        icon.setTemplateImage(true); // adapts to dark/light menu bar
    } else {
        icon = nativeImage.createFromBuffer(EMPTY_PNG);
    }

    tray = new Tray(icon);
    tray.setTitle('');
    tray.setToolTip('LeetCode Tracker');
    tray.on('click', toggleWindow);
    tray.on('right-click', toggleWindow);
}

// ── Popup window ─────────────────────────────────────────────────────────────
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
            sandbox: false,  // preload needs require('electron')
        },
    });

    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Auto-hide when the popup loses focus
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

    // Keep within screen
    if (x + wb.width > wa.x + wa.width) x = wa.x + wa.width - wb.width - 8;
    if (x < wa.x) x = wa.x + 8;
    if (y + wb.height > wa.y + wa.height) y = tb.y - wb.height - 4; // above tray

    win.setPosition(x, y);
    win.show();
    win.focus();
    // Push current data immediately so the renderer always has fresh state
    win.webContents.send('data-update', { userData, fetchedAt });
}

// ── IPC handlers ─────────────────────────────────────────────────────────────
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

    // Real questions: problems that list this company in their companies array
    const real = Object.entries(problems)
        .filter(([, p]) => Array.isArray(p.companies) && p.companies.includes(company))
        .map(([slug, p]) => ({ ...p, titleSlug: slug }));
    const realSlugs = new Set(real.map(p => p.titleSlug));

    // AI-suggested: ML model output, excluding real ones, up to 150
    const suggested = (suggestedMap[company] ?? [])
        .filter(slug => !realSlugs.has(slug))
        .slice(0, 150)
        .map(slug => ({ ...problems[slug], titleSlug: slug }))
        .filter(p => p && p.title);

    return { real, suggested };
});

ipcMain.handle('get-daily-problem', () => {
    try {
        const p = dataFile('problemsData.json');
        if (!p) return null;
        const all = JSON.parse(fs.readFileSync(p, 'utf-8'));
        // Filter out premium problems that users can't access
        const slugs = Object.keys(all).filter(s => !all[s].premium && all[s].id);
        if (!slugs.length) return null;
        // Seed by calendar date so it changes each day but is consistent within a day
        const d = new Date();
        const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
        const slug = slugs[seed % slugs.length];
        return { ...all[slug], titleSlug: slug };
    } catch { return null; }
});

ipcMain.handle('get-username', () => getStoredUsername());

ipcMain.handle('save-username', (_, username) => {
    if (typeof username !== 'string') return false;
    // Validate: only safe characters, reasonable length
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(username.trim())) return false;
    fs.writeFileSync(usernameFile(), username.trim(), 'utf-8');
    return true;
});

// One-way messages
ipcMain.on('open-url', (_, url) => {
    if (isSafeLeetCodeUrl(url)) shell.openExternal(url);
});

ipcMain.on('open-webapp', () => {
    const user = getStoredUsername();
    shell.openExternal(`https://leetcode.com/${encodeURIComponent(user)}/`);
});

ipcMain.on('open-tracker', () => {
    shell.openExternal('https://rustampy.github.io/leetcode-tracker/');
});

// ── URL validation ────────────────────────────────────────────────────────────
function isSafeLeetCodeUrl(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && u.hostname === 'leetcode.com';
    } catch { return false; }
}

// ── LeetCode GraphQL API ─────────────────────────────────────────────────────
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

function gqlRequest(query, variables) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query, variables });
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
    const [profileData, subsData] = await Promise.all([
        gqlRequest(GQL_PROFILE, { u: username }),
        gqlRequest(GQL_SUBS, { u: username, limit: 100 }),
    ]);

    const user = profileData?.matchedUser;
    if (!user) throw new Error(`User "${username}" not found on LeetCode`);

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
        submissions: subsData?.recentAcSubmissionList ?? [],
    };
}

// ── Streak calculation ───────────────────────────────────────────────────────
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

function updateTrayTitle() {
    if (!tray) return;
    const streak = userData ? calcStreak(userData.submissions) : 0;
    const total = userData?.solved?.total ?? 0;
    tray.setTitle(streak > 0 ? ` ${streak}` : '');
    tray.setToolTip(`LeetCode Tracker\n${total} solved · ${streak}-day streak`);
}

// ── Data persistence helpers ─────────────────────────────────────────────────
function dataDir() {
    // When bundled by electron-builder, extraResources lands in process.resourcesPath
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

function getStoredUsername() {
    const f = usernameFile();
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf-8').trim();
    // Fall back to bundled userData.json username
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
        fs.writeFileSync(
            path.join(dir, 'live-userData.json'),
            JSON.stringify({ ...data, fetchedAt: new Date().toISOString() }),
        );
    } catch { }
}

// ── Startup data loading ─────────────────────────────────────────────────────
async function loadInitialData() {
    // 1. Try previously-fetched live cache (most up-to-date without network call)
    try {
        const p = path.join(app.getPath('userData'), 'live-userData.json');
        if (fs.existsSync(p)) {
            const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
            userData = raw;
            fetchedAt = new Date(raw.fetchedAt).getTime();
            updateTrayTitle();
        }
    } catch { }

    // 2. Fall back to bundled userData.json (static snapshot from build scripts)
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

    // 3. Silently fetch fresh data in the background
    fetchLeetCodeData(getStoredUsername())
        .then(fresh => {
            userData = fresh;
            fetchedAt = Date.now();
            updateTrayTitle();
            saveUserDataLocally(fresh);
            // Push update to popup if it's currently open
            if (win?.isVisible()) win.webContents.send('data-update', { userData, fetchedAt });
        })
        .catch(() => { }); // graceful degradation — already have cached data
}
