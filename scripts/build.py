#!/usr/bin/env python3
"""
Master build orchestrator for leetcode-tracker data pipeline.

Steps
─────
1. fetch_problems_data  — LeetCode GraphQL → problemsData.json
2. build_company_data   — GitHub repos (intermediate only) → companyData.json
3. suggest_company_problems — TF-IDF AI suggestions → companyData.json
                              (strips scraped problems, keeps only companies + suggested)

Usage
─────
  cd scripts
  python build.py               # full build
  python build.py --skip-suggest  # skip the ML suggestion step
"""

import argparse, sys, time
from pathlib import Path

ROOT = Path(__file__).parent.parent


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

    # 1. Fetch problems from LeetCode GraphQL
    import fetch_problems_data

    step("fetch_problems_data", fetch_problems_data.main)

    # 2. Build company data (intermediate scraped data, used to seed AI suggestions)
    import build_company_data

    step("build_company_data", build_company_data.main)

    # 3. ML suggestions — computes AI suggestions and strips scraped data from output
    if not args.skip_suggest:
        import suggest_company_problems

        step("suggest_company_problems", suggest_company_problems.main)
    else:
        print("\n[build] Skipping suggest_company_problems (--skip-suggest)")

    print("\n[build] All steps complete.")


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()
