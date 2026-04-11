<div align="center">
  <img src="menubar-app/assets/icon-source.png" alt="LeetCode Tracker" width="120" />

  <h1>LeetCode Tracker</h1>

  <p><em>Because your browser already has 47 tabs open. This lives in your menu bar instead.</em></p>

  [![Release](https://img.shields.io/github/v/release/rustamPy/leetcode-tracker?label=latest&color=black)](https://github.com/rustamPy/leetcode-tracker/releases/latest)
  [![License](https://img.shields.io/github/license/rustamPy/leetcode-tracker?color=black)](LICENSE)
  [![Platform](https://img.shields.io/badge/platform-macOS-black)](https://github.com/rustamPy/leetcode-tracker/releases/latest)
  [![Live Demo](https://img.shields.io/badge/live-demo-black)](https://rustampy.github.io/leetcode-tracker/)

</div>

---

## The Origin Story — or: How Desperation Becomes Software

It was a perfectly normal evening. I was staring at a LeetCode problem, a half-eaten bag of chips beside me, two cold coffees on the desk, and a growing sense that I had solved this exact tree problem before - somewhere, at some point, in a previous life.

I opened my LeetCode submissions page. Then another tab to check company problems. Then a Notion page to paste the link. Then accidentally closed the wrong tab. Then reopened everything. Stared at the ceiling.

*"There has to be a better way,"* I said to no one, because it was 1 AM.

The next morning, LeetCode Tracker existed. A Kanban board. A company browser. Problem descriptions without leaving the app. Recent submissions pulled in automatically. And then, because the browser was still failing me - a **menu bar app**, so the whole thing lives at the top of the screen, one click away, always watching, silently judging how many days you've skipped.

The menu bar app was the final boss. It whispered: *"You already have a web app. Why do you need a desktop app?"* And the answer was: because sometimes you just want to glance at your streak without opening a browser, okay? Let a person live.

Is it overkill? Absolutely. Does it spark joy? Mysteriously, yes.

---

## What It Does

A Kanban board for your LeetCode grind, a company problem browser, an ML-powered suggestion engine, and a macOS menu bar app — all in one place.

| Feature | Description |
|---------|-------------|
| **Kanban board** | To Do / In Progress / Completed columns, stored locally |
| **Auto-completed column** | Pulls your accepted submissions from LeetCode automatically |
| **Company browser** | Filter 3,600+ problems by company |
| **Problem search** | Instant search — no network call, just fast |
| **Problem drawer** | Description, topic tags, and hints without leaving the page |
| **Streak & stats** | Daily streak, acceptance rate, recent submissions |
| **ML suggestions** | "Suggested by similarity" — problems ranked by cosine similarity to a company's problem set |
| **Menu bar app** | Everything above, accessible from your macOS menu bar |

**Live demo:** https://rustampy.github.io/leetcode-tracker/

---

## macOS Menu Bar App

The star of the show. Lives quietly in your macOS menu bar, patiently waiting for you while you "take a quick break" that lasts two hours.

### Option A — Homebrew (the easy way)

```bash
brew tap rustamPy/tap
brew install --cask leetcode-tracker
```

That's it. Homebrew handles everything, including the macOS security warnings that would otherwise haunt you.

### Option B — Manual Download

1. Go to the [latest release](https://github.com/rustamPy/leetcode-tracker/releases/latest)
2. Download the right file for your Mac:

| File | Who it's for |
|------|-------------|
| `LeetCode.Tracker-*-arm64.dmg` | Apple Silicon (M1 / M2 / M3 / M4) — if you bought your Mac after 2020, this is you |
| `LeetCode.Tracker-*-x64.dmg` | Intel Mac — if your Mac makes fan noises during Zoom calls, this is you |

3. Open the `.dmg`, drag the app to `/Applications`
4. macOS will refuse to open it — this is expected, not a disaster

**Fix the "app is damaged" warning** (it's not damaged, macOS is just overprotective):

Run this once in Terminal:
```bash
find "/Applications/LeetCode Tracker.app" -exec xattr -d com.apple.quarantine {} \; 2>/dev/null; true
```

Or double-click the `Remove Quarantine.command` file inside the `.dmg` — it does the same thing with less typing.

### Updating

```bash
# If you installed via Homebrew:
brew upgrade --cask leetcode-tracker

# If you installed manually:
download the new .dmg and repeat the steps above
```

---

## Web App — Running Locally

Want to run the full web app on your machine, or fork it for yourself? Here's how.

### What you need

- **Python 3.10+** — for the backend and data scripts
- **Node.js 18+** — for the frontend

### Step 1 — Build the data files

These scripts generate the JSON files the app uses. Run them once before starting anything else:

```bash
python3 scripts/fetch_user_data.py       # your LeetCode profile stats
python3 scripts/build_company_data.py    # company → problems mapping
python3 scripts/build_problems_data.py   # full problem list from the CSV
python3 scripts/suggest_company_problems.py  # ML similarity suggestions
```

> **Tracking a different account?**  
> Open `scripts/fetch_user_data.py` and `backend/main.py`, change the `USERNAME` value to your LeetCode handle, then run the scripts above.

The first three scripts output static JSON files that are bundled into the app at build time. `fetch_user_data.py` also runs in CI on every push to keep your live stats current.

### Step 2 — Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# now running at http://localhost:8000
```

The backend is only needed for local development — it handles task storage and proxies LeetCode's API so your browser doesn't get blocked by CORS.

### Step 3 — Start the frontend

```bash
cd frontend
npm install
npm run dev
# now running at http://localhost:5173
```

Open `http://localhost:5173` and you're in. The dev server automatically routes API calls to the backend and LeetCode GraphQL calls through its built-in proxy.

---

## Deploying Your Own Fork to GitHub Pages

Want your own live version? Four steps.

### Step 1 — Deploy the Cloudflare Worker

The live site needs a proxy to talk to LeetCode's API from the browser. Cloudflare Workers are free and perfect for this.

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
# copy the output URL — you'll need it in a moment
```

Alternatively, paste `cloudflare-worker/worker.js` directly into the [Cloudflare dashboard](https://dash.cloudflare.com) under **Workers & Pages → Create Worker**.

Before deploying, open `cloudflare-worker/worker.js` and update `ALLOWED_ORIGIN` to match your GitHub Pages URL (e.g. `https://yourusername.github.io`).

### Step 2 — Add the Worker URL to GitHub Secrets

In your repo on GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|-------|
| `VITE_GQL_PROXY` | The Worker URL from Step 1 |

### Step 3 — Push to `main`

GitHub Actions takes over from here:
1. Fetches your LeetCode profile stats
2. Builds the Vite app with your Worker URL baked in
3. Deploys everything to GitHub Pages

The problem list, company data, and ML suggestions are pre-generated locally and committed to the repo — they don't regenerate in CI (that would take forever).

### Step 4 — Relax

Your site rebuilds automatically every day at 06:00 UTC to refresh your stats. You don't have to do anything.

---

## How the ML Suggestions Work

When you browse a company in the app, you'll see a **"Suggested by similarity"** section below the known problems. These aren't random — they're ranked by how similar they are to that company's typical problem style.

Each problem is represented as a vector combining:

| Feature | Weight | Details |
|---------|--------|---------|
| Topic tags | ×3 | Multi-hot encoded across 72 topics |
| Difficulty | ×1 | Easy / Medium / Hard |
| Problem description | ×2 | TF-IDF over 3,000 terms |

The app computes a centroid for each company's known problems, then ranks all other problems by cosine similarity to that centroid. The closer the problem, the more it "fits" that company's style.

### Refreshing the suggestions locally

```bash
# First run fetches ~3,600 descriptions from LeetCode (takes ~10 min)
# Subsequent runs use a local cache and are fast
python3 scripts/suggest_company_problems.py
git add frontend/src/data/companyData.json && git commit -m "refresh ML suggestions"
```

---

## Project Structure

```
frontend/            React + Vite — the web app (deployed to GitHub Pages)
backend/             FastAPI — local dev only, handles tasks and proxies
cloudflare-worker/   Cloudflare Worker — GraphQL proxy for production
menubar-app/         Electron — the macOS menu bar app
scripts/             Data generation scripts (Python)
leets/               Raw LeetCode CSV problem dataset
```

### How data flows

| Where | LeetCode GraphQL | Problem data | Tasks |
|-------|-----------------|--------------|-------|
| Local dev | Vite proxy → `leetcode.com/graphql` | `problemsData.json` (local file) | FastAPI + `tasks.json` |
| Production | Cloudflare Worker → `leetcode.com/graphql` | `problemsData.json` (bundled at build) | `localStorage` |

---

## For Contributors

Found a bug? Have an idea? Want to make this even more unnecessarily feature-rich? Welcome.

### Getting set up

1. Fork the repo
2. Clone your fork
3. Follow the **Local development** steps above
4. Create a branch: `git checkout -b my-feature`
5. Make your changes
6. Open a pull request

### A few things worth knowing

- The frontend is React + Vite. Components live in `frontend/src/components/`.
- The menu bar app is Electron. Its main process is `menubar-app/main.js`.
- Data scripts are in `scripts/`. They're Python and meant to be run manually, not in CI (except `fetch_user_data.py`).
- There are no tests yet. (I know. I know.)
- `companyData.json` and `problemsData.json` are large generated files — don't edit them by hand.

### Building the menu bar app locally

```bash
cd menubar-app
npm install
npm start          # run in development mode
npm run build      # build without packaging (for testing)
npm run dist       # build and package as .dmg (both architectures)
npm run dist:arm64 # Apple Silicon only
npm run dist:x64   # Intel only
```

---

## Acknowledgements

This project stands on the shoulders of people who did the tedious data work so no one else had to:

- **Ashutosh Papnoi** — compiled and maintains the LeetCode problem dataset used here:  
  [Latest Complete LeetCode Problems Dataset 2025](https://www.kaggle.com/datasets/ashutoshpapnoi/latest-complete-leetcode-problems-dataset-2025)

- **Gaurav Kumar & Snehasish Roy** — built and maintain the company-wise problem mappings that power the company browser:  
  [liquidslr/interview-company-wise-problems](https://github.com/liquidslr/interview-company-wise-problems)  
  [snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions)

Without their work, the company browser would just be a blank page with good intentions.

---

<div align="center">
  <sub>Built at 1 AM out of spite. Maintained with slightly more dignity.</sub>
</div>