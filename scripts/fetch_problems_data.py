#!/usr/bin/env python3
"""
Fetches every problem from LeetCode's public GraphQL API and writes
frontend/src/data/problemsData.json.

No authentication required — uses the same public endpoint the website uses.

Output shape (keyed by titleSlug):
{
  "two-sum": {
    "id": 1,
    "title": "Two Sum",
    "difficulty": "Easy",
    "topics": ["Array", "Hash Table"],
    "premium": false
  },
  ...
}

Usage:
  cd scripts
  python fetch_problems_data.py
"""

import json, time, urllib.request, urllib.error
from pathlib import Path

OUT_FILE = (
    Path(__file__).parent.parent / "frontend" / "src" / "data" / "problemsData.json"
)

GQL_URL = "https://leetcode.com/graphql"
HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com/problemset/",
    "User-Agent": "Mozilla/5.0 (compatible; leetcode-tracker-build/3.0)",
}

PAGE_SIZE = 100
RATE_DELAY = 0.3  # seconds between pages

QUERY = """
query problemList($skip: Int!, $limit: Int!) {
  problemsetQuestionList: questionList(
    categorySlug: ""
    limit: $limit
    skip: $skip
    filters: {}
  ) {
    total: totalNum
    questions: data {
      frontendQuestionId: questionFrontendId
      title
      titleSlug
      difficulty
      isPaidOnly
      topicTags { name }
    }
  }
}
"""


def fetch_page(skip: int, limit: int, retries: int = 4) -> dict:
    body = json.dumps(
        {"query": QUERY, "variables": {"skip": skip, "limit": limit}}
    ).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                GQL_URL, data=body, headers=HEADERS, method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code} on skip={skip}, attempt {attempt + 1}")
            if attempt < retries - 1:
                time.sleep(2**attempt)
        except Exception as e:
            print(f"  Error on skip={skip}, attempt {attempt + 1}: {e}")
            if attempt < retries - 1:
                time.sleep(2**attempt)
    return {}


def main(**_):
    print("Fetching problem list from LeetCode GraphQL...")

    # First page to get total count
    first = fetch_page(0, PAGE_SIZE)
    pset = (first.get("data") or {}).get("problemsetQuestionList") or {}
    total = pset.get("total", 0)
    if not total:
        raise RuntimeError("Could not fetch problem list — received empty response.")

    print(f"  Total problems: {total}")

    all_questions = list(pset.get("questions") or [])
    fetched = len(all_questions)
    print(f"  Page 1: {fetched}")

    skip = PAGE_SIZE
    while skip < total:
        time.sleep(RATE_DELAY)
        page = fetch_page(skip, PAGE_SIZE)
        qs = ((page.get("data") or {}).get("problemsetQuestionList") or {}).get(
            "questions"
        ) or []
        all_questions.extend(qs)
        fetched += len(qs)
        print(f"  Fetched {fetched}/{total}", end="\r")
        skip += PAGE_SIZE

    print(f"\n  Done — {len(all_questions)} problems fetched.")

    problems: dict = {}
    for q in all_questions:
        slug = q.get("titleSlug", "").strip()
        if not slug:
            continue
        try:
            pid = int(q.get("frontendQuestionId") or 0)
        except (TypeError, ValueError):
            pid = 0
        topics = [t["name"] for t in (q.get("topicTags") or []) if t.get("name")]
        problems[slug] = {
            "id": pid,
            "title": q.get("title", "").strip(),
            "difficulty": q.get("difficulty", "").strip(),
            "topics": topics,
            "premium": bool(q.get("isPaidOnly")),
        }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(problems, separators=(",", ":"), ensure_ascii=False))
    size_kb = OUT_FILE.stat().st_size // 1024
    print(f"  Written {len(problems)} problems → {OUT_FILE} ({size_kb} KB)")


if __name__ == "__main__":
    main()
