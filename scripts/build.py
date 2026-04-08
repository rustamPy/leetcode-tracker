#!/usr/bin/env python3
"""
Master build orchestrator for leetcode-tracker data pipeline.

Steps
─────
1. Validate the latest leets/leetcode_YYYY.csv (required columns present)
2. build_problems_data  — CSV (updated leetcode questions CSV) → problemsData.json
3. build_company_data   — GitHub repos (from users) → companyData.json
4. suggest_company_problems — TF-IDF suggestions (prediction model) → companyData.json updated

Usage
─────
  cd scripts
  python build.py               # full build
  python build.py --skip-suggest  # skip the ML suggestion step
"""

import argparse, sys, time
from pathlib import Path

ROOT = Path(__file__).parent.parent
LEETS_DIR = ROOT / "leets"

REQUIRED_COLUMNS = {"ID", "Title", "Difficulty", "Link", "Premium Only"}


# ── helpers ────────────────────────────────────────────────────────


def find_latest_csv() -> Path:
    candidates = sorted(LEETS_DIR.glob("leetcode_*.csv"), reverse=True)
    if not candidates:
        sys.exit(f"[build] ERROR: No leetcode_YYYY.csv found in {LEETS_DIR}")
    return candidates[0]


def validate_csv(path: Path) -> None:
    import csv

    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = set(reader.fieldnames or [])
    missing = REQUIRED_COLUMNS - headers
    if missing:
        sys.exit(f"[build] ERROR: {path.name} is missing columns: {missing}")
    print(f"[build] Validated: {path.name}  (columns OK)")


def step(name: str, fn, *args, **kwargs):
    print(f"\n[build] ── {name} ──")
    t0 = time.perf_counter()
    fn(*args, **kwargs)
    elapsed = time.perf_counter() - t0
    print(f"[build] {name} done in {elapsed:.1f}s")


# ── entry point ────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="LeetCode tracker data pipeline")
    parser.add_argument(
        "--skip-suggest", action="store_true", help="Skip ML suggestion step"
    )
    args = parser.parse_args()

    # 1. Validate CSV
    csv_file = find_latest_csv()
    validate_csv(csv_file)

    # 2. Build problems data
    import build_problems_data

    step("build_problems_data", build_problems_data.main, csv_file=csv_file)

    # 3. Build company data
    import build_company_data

    step("build_company_data", build_company_data.main)

    # 4. ML suggestions (optional)
    if not args.skip_suggest:
        import suggest_company_problems

        step("suggest_company_problems", suggest_company_problems.main)
    else:
        print("\n[build] Skipping suggest_company_problems (--skip-suggest)")

    print("\n[build] All steps complete.")


if __name__ == "__main__":
    main()
