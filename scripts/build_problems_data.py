#!/usr/bin/env python3
"""
Converts the latest leets/leetcode_YYYY.csv into frontend/src/data/problemsData.json.

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

import csv, json
from pathlib import Path

ROOT = Path(__file__).parent.parent
LEETS_DIR = ROOT / "leets"
OUT_FILE = ROOT / "frontend" / "src" / "data" / "problemsData.json"


# ── helpers ────────────────────────────────────────────────────────


def find_latest_csv() -> Path:
    candidates = sorted(LEETS_DIR.glob("leetcode_*.csv"), reverse=True)
    if not candidates:
        raise FileNotFoundError(f"No leetcode_YYYY.csv found in {LEETS_DIR}")
    chosen = candidates[0]
    print(f"  Using CSV: {chosen.name}")
    return chosen


def slug_from_link(link: str) -> str:
    return link.rstrip("/").split("/")[-1]


# ── main ───────────────────────────────────────────────────────────


def main(csv_file: Path | None = None, **_):
    csv_file = csv_file or find_latest_csv()

    problems: dict = {}
    with csv_file.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
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

    print(f"  Parsed {len(problems)} problems from CSV.")

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(problems, separators=(",", ":"), ensure_ascii=False))
    size_kb = OUT_FILE.stat().st_size // 1024
    print(f"  Written {len(problems)} problems → {OUT_FILE} ({size_kb} KB)")


if __name__ == "__main__":
    main()
