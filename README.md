# LeetCode Tracker

A personal Kanban board for tracking LeetCode progress — browse problems by company, search across the full problem set, view problem descriptions in a side drawer, and see your recent accepted submissions automatically.

**Live demo:** https://rustampy.github.io/leetcode-tracker/

---

## Features

- **Kanban board** — To Do / In Progress / Completed columns, stored in `localStorage`
- **Completed column** — auto-populated from your LeetCode accepted submissions via GraphQL
- **Company browser** — filter problems by company from a curated dataset
- **Problem search** — instant search across all 3,600+ problems (local, no network call)
- **Problem drawer** — description, topic tags, and hints fetched via LeetCode GraphQL
- **Username switching** — change the tracked account at runtime; data is cached indefinitely (localStorage)
- **ML problem suggestions** — "Suggested by similarity" section in the company browser, powered by a content-based model trained on topics, difficulty, and problem descriptions

---

## Architecture

```
frontend/   React + Vite (GitHub Pages static site)
backend/    FastAPI (local dev only — proxies LeetCode API, manages tasks)
cloudflare-worker/   Cloudflare Worker — GraphQL proxy for production
scripts/    Build-time data scripts (run by GitHub Actions)
```

### Data flow

| Env | LeetCode GraphQL | Problem data | Tasks |
|-----|-----------------|--------------|-------|
| **Local dev** | Vite proxy → `leetcode.com/graphql` | `problemsData.json` (local) | FastAPI + `tasks.json` |
| **Production** | Cloudflare Worker → `leetcode.com/graphql` | `problemsData.json` (bundled) | `localStorage` |

---

## Local development

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Build static data files

```bash
# Required once (or whenever you want to refresh)
python3 scripts/fetch_user_data.py      # LeetCode profile → frontend/src/data/userData.json
python3 scripts/build_company_data.py   # company-tagged problems → frontend/src/data/companyData.json
python3 scripts/build_problems_data.py  # Leetcode.csv → frontend/src/data/problemsData.json
python3 scripts/suggest_company_problems.py  # ML suggestions → appended to companyData.json
```

The last three scripts produce static JSON that is committed to the repo and bundled into the app at build time. Only `fetch_user_data.py` runs in CI (to refresh live stats on every deploy).

To track your own account, change `USERNAME` in `scripts/fetch_user_data.py` and `backend/main.py` before running.

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# runs on http://localhost:8000
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
# runs on http://localhost:5173
```

The Vite dev server proxies `/api/*` to the FastAPI backend and `/lc-graphql` to `leetcode.com/graphql`, so no CORS issues.

---

## Deploying to GitHub Pages

### 1. Deploy the Cloudflare Worker (one-time setup)

The frontend needs a proxy to call LeetCode's GraphQL API from the browser in production. A free Cloudflare Worker handles this.

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
# outputs: https://lc-graphql-proxy.<your-subdomain>.workers.dev
```

Or paste `cloudflare-worker/worker.js` directly into the [Cloudflare dashboard](https://dash.cloudflare.com) under **Workers & Pages → Create Worker**.

Update `ALLOWED_ORIGIN` in `cloudflare-worker/worker.js` to match your GitHub Pages URL before deploying.

### 2. Add the Worker URL as a GitHub secret

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|-------|
| `VITE_GQL_PROXY` | `https://lc-graphql-proxy.<your-subdomain>.workers.dev` |

### 3. Push to `main`

GitHub Actions will:
1. Fetch your LeetCode profile (`scripts/fetch_user_data.py`)
2. Build the Vite app (with `VITE_GQL_PROXY` baked in)
3. Deploy to GitHub Pages

The company data, problem list, and ML suggestions are **pre-built locally and committed** — they don't re-run in CI.

The site auto-rebuilds daily at 06:00 UTC to refresh your stats.

---

## Changing the default tracked user

1. Edit `USERNAME` in `scripts/fetch_user_data.py`
2. Edit `USERNAME` in `backend/main.py`
3. Commit and push — the Actions build will regenerate `userData.json`

Users can also switch accounts at runtime via the **account button** in the profile card. The new username is persisted in `localStorage` and a cookie.

---

## ML similarity model

When you browse a company's problems, a **"Suggested by similarity"** section appears below the known problems. These are ranked by cosine similarity to the centroid of that company's problem set.

### Features

| Feature | Weight | Details |
|---------|--------|---------|
| Topic tags | ×3 | Multi-hot encoded across 72 unique topics |
| Difficulty | ×1 | One-hot (Easy / Medium / Hard) |
| Problem description | ×2 | TF-IDF (3,000 terms, sublinear TF, L2-normalised) |

All features are stacked into a single sparse matrix and similarity is computed via cosine similarity against each company's centroid.

### Rebuilding suggestions

```bash
# First run: fetches ~3,600 descriptions from LeetCode GraphQL (takes ~10 min)
# Subsequent runs: uses local cache at scripts/.desc_cache.json (fast)
python3 scripts/suggest_company_problems.py
git add frontend/src/data/companyData.json && git commit -m "refresh ML suggestions"
```

---

## Acknowledgements

Problem dataset sourced from the CSV compiled by **Ashutosh Papnoi**:
[Latest Complete LeetCode Problems Dataset 2025](https://www.kaggle.com/datasets/ashutoshpapnoi/latest-complete-leetcode-problems-dataset-2025) — thank you for keeping it up to date!

Company-wise problem lists sourced from the [liquidslr/interview-company-wise-problems](https://github.com/liquidslr/interview-company-wise-problems) repository.
