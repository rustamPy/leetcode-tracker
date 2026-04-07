#!/usr/bin/env python3
"""
Converts Leetcode.csv (repo root) into frontend/src/data/problemsData.json.

Output shape — object keyed by titleSlug:
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
"""

import csv, json, re
from pathlib import Path

CSV_FILE = Path(__file__).parent.parent / "leets" / "leetcode_2025.csv"

OUT_FILE = (
    Path(__file__).parent.parent / "frontend" / "src" / "data" / "problemsData.json"
)


def slug_from_link(link: str) -> str:
    return link.rstrip("/").split("/")[-1]


def main():
    problems = {}
    with CSV_FILE.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            link = row.get("Link", "").strip()
            slug = slug_from_link(link)
            if not slug:
                continue

            topics_raw = row.get("Topics", "").strip()
            topics = (
                [t.strip() for t in topics_raw.split(",") if t.strip()]
                if topics_raw
                else []
            )

            premium_raw = row.get("Premium Only", "False").strip().lower()
            premium = premium_raw in ("true", "1", "yes")

            try:
                pid = int(row.get("ID", 0))
            except ValueError:
                pid = 0

            problems[slug] = {
                "id": pid,
                "title": row.get("Title", "").strip(),
                "difficulty": row.get("Difficulty", "").strip(),
                "topics": topics,
                "premium": premium,
            }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(problems, separators=(",", ":"), ensure_ascii=False))
    print(
        f"Written {len(problems)} problems → {OUT_FILE} ({OUT_FILE.stat().st_size // 1024} KB)"
    )


if __name__ == "__main__":
    main()
