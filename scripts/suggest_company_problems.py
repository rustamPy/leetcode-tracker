#!/usr/bin/env python3
"""
Content-based recommendation using:
  - Multi-hot topic encoding  (weight x3)
  - One-hot difficulty         (weight x1)
  - TF-IDF on problem description text (weight x2, L2-normalised)

Descriptions are fetched from LeetCode GraphQL and cached in
scripts/.desc_cache.json so re-runs are fast.

Reads:  frontend/src/data/companyData.json
        frontend/src/data/problemsData.json
Writes: companyData.json  -- adds/updates top-level "suggested" key
        { "suggested": { "Google": ["slug1", ...], ... } }

The existing "problems" key is NOT modified.
"""

import html, json, re, sys, time, urllib.request, urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MultiLabelBinarizer, normalize
from sklearn.metrics.pairwise import cosine_similarity

# -- Paths ---------------------------------------------------------
BASE = Path(__file__).parent.parent
COMPANY_FILE = BASE / "frontend/src/data/companyData.json"
PROBLEMS_FILE = BASE / "frontend/src/data/problemsData.json"
DESC_CACHE = Path(__file__).parent / ".desc_cache.json"

N_SUGGEST = 300
GQL_URL = "https://leetcode.com/graphql"
HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com",
    "User-Agent": "Mozilla/5.0 (compatible; leetcode-tracker-build/2.0)",
}
WORKERS = 8
RATE_DELAY = 0.15  # seconds between batches

DESCRIPTION_QUERY = """
query GetContent($titleSlug: String!) {
  question(titleSlug: $titleSlug) { content }
}"""


# -- HTML -> plain text --------------------------------------------
_TAG_RE = re.compile(r"<[^>]+>")


def strip_html(raw):
    if not raw:
        return ""
    text = _TAG_RE.sub(" ", raw)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


# -- GQL fetch with retries ----------------------------------------
def fetch_description(slug, retries=4):
    body = json.dumps(
        {"query": DESCRIPTION_QUERY, "variables": {"titleSlug": slug}}
    ).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                GQL_URL, data=body, headers=HEADERS, method="POST"
            )
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.loads(r.read())
            content = (data.get("data") or {}).get("question") or {}
            return strip_html(content.get("content") or "")
        except Exception:
            if attempt < retries - 1:
                time.sleep(2**attempt)
    return ""


# -- Description cache ---------------------------------------------
def load_desc_cache():
    if DESC_CACHE.exists():
        try:
            return json.loads(DESC_CACHE.read_text())
        except Exception:
            pass
    return {}


def save_desc_cache(cache):
    DESC_CACHE.write_text(json.dumps(cache, separators=(",", ":")))


def get_descriptions(slugs):
    cache = load_desc_cache()
    missing = [s for s in slugs if s not in cache]

    if missing:
        print(
            f"  Fetching {len(missing)} descriptions "
            f"({len(cache)} already cached)..."
        )
        BATCH = 50
        for start in range(0, len(missing), BATCH):
            batch = missing[start : start + BATCH]
            with ThreadPoolExecutor(max_workers=WORKERS) as pool:
                futures = {pool.submit(fetch_description, s): s for s in batch}
                for fut in as_completed(futures):
                    cache[futures[fut]] = fut.result() or ""
            done = min(start + BATCH, len(missing))
            print(f"    {done}/{len(missing)}", file=sys.stderr)
            time.sleep(RATE_DELAY)
        save_desc_cache(cache)
        print(f"  Cache saved ({len(cache)} descriptions total).")

    return {s: cache.get(s, "") for s in slugs}


# -- Feature matrix ------------------------------------------------
def build_feature_matrix(slugs, all_problems, descriptions):
    """
    Sparse float32 matrix combining:
      topics (x3) | difficulty (x1) | TF-IDF text (x2)
    """
    n = len(slugs)

    # 1. Multi-hot topics * 3
    topics_list = [all_problems[s].get("topics", []) for s in slugs]
    mlb = MultiLabelBinarizer()
    topic_matrix = csr_matrix(mlb.fit_transform(topics_list).astype(np.float32) * 3.0)

    # 2. One-hot difficulty
    diff_map = {"Easy": 0, "Medium": 1, "Hard": 2}
    diff_arr = np.zeros((n, 3), dtype=np.float32)
    for i, s in enumerate(slugs):
        d = all_problems[s].get("difficulty", "")
        if d in diff_map:
            diff_arr[i, diff_map[d]] = 1.0
    diff_matrix = csr_matrix(diff_arr)

    # 3. TF-IDF on descriptions * 2
    corpus = [descriptions.get(s, "") for s in slugs]
    tfidf = TfidfVectorizer(
        max_features=3000,
        stop_words="english",
        sublinear_tf=True,
        dtype=np.float32,
    )
    tfidf_matrix = tfidf.fit_transform(corpus)
    tfidf_matrix = normalize(tfidf_matrix, norm="l2") * 2.0

    return hstack([topic_matrix, diff_matrix, tfidf_matrix], format="csr")


# -- Main ----------------------------------------------------------
def main():
    print("Loading data...")
    company_data = json.loads(COMPANY_FILE.read_text())
    all_problems = json.loads(PROBLEMS_FILE.read_text())

    slugs = list(all_problems.keys())
    slug_idx = {s: i for i, s in enumerate(slugs)}
    print(f"  {len(slugs)} problems, {len(company_data['companies'])} companies")

    print("Loading / fetching descriptions...")
    descriptions = get_descriptions(slugs)

    print("Building feature matrix (topics + difficulty + TF-IDF)...")
    X = build_feature_matrix(slugs, all_problems, descriptions)
    print(f"  Matrix shape: {X.shape}")

    # Invert company -> known slugs
    company_known = {}
    for slug, pdata in company_data["problems"].items():
        for c in pdata.get("companies", []):
            company_known.setdefault(c, set()).add(slug)

    companies = company_data["companies"]
    suggested = {}

    print("Computing recommendations...")
    for i, company in enumerate(companies):
        known = company_known.get(company, set())
        known_indices = [slug_idx[s] for s in known if s in slug_idx]

        if not known_indices:
            suggested[company] = []
            continue

        centroid = np.asarray(X[known_indices].mean(axis=0))
        sims = cosine_similarity(centroid, X)[0]

        order = np.argsort(-sims)
        recs = []
        for idx in order:
            s = slugs[idx]
            if s not in known:
                recs.append(s)
            if len(recs) >= N_SUGGEST:
                break

        suggested[company] = recs

        if (i + 1) % 100 == 0 or (i + 1) == len(companies):
            print(f"  {i + 1}/{len(companies)} done", file=sys.stderr)

    company_data["suggested"] = suggested
    # Strip scraped company-problem associations before writing the distributed file
    output = {"companies": company_data["companies"], "suggested": suggested}
    COMPANY_FILE.write_text(json.dumps(output, separators=(",", ":")))

    total = sum(len(v) for v in suggested.values())
    print(
        f"\nDone. {len(suggested)} companies x up to {N_SUGGEST} = {total} suggestions saved."
    )


if __name__ == "__main__":
    main()
