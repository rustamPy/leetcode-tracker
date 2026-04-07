#!/usr/bin/env python3
"""
Fetches all company-wise problem CSVs from liquidslr/interview-company-wise-problems
and builds frontend/src/data/companyData.json
"""
import csv, io, json, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

RAW   = "https://raw.githubusercontent.com/liquidslr/interview-company-wise-problems/main"
API   = "https://api.github.com/repos/liquidslr/interview-company-wise-problems/contents"
OUT   = Path(__file__).parent.parent / "frontend" / "src" / "data" / "companyData.json"

HEADERS = {"User-Agent": "lc-tracker-build/1.0"}


def slug_from(link: str) -> str:
    return link.rstrip("/").split("/")[-1]


def fetch(company: str):
    for fname in ["5. All.csv", "1. Thirty Days.csv"]:
        url = f"{RAW}/{urllib.parse.quote(company)}/{urllib.parse.quote(fname)}"
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as r:
                rows = list(csv.DictReader(io.StringIO(r.read().decode("utf-8"))))
            if rows:
                return company, rows
        except Exception:
            continue
    return company, []


def main():
    req = urllib.request.Request(API, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        items = json.loads(r.read())

    companies = [x["name"] for x in items if x["type"] == "dir"]
    print(f"Fetching {len(companies)} companies...\n")

    problems: dict = {}
    found: list = []

    with ThreadPoolExecutor(max_workers=15) as pool:
        futures = {pool.submit(fetch, c): c for c in companies}
        done = 0
        for fut in as_completed(futures):
            company, rows = fut.result()
            done += 1
            if rows:
                found.append(company)
                for row in rows:
                    link = row.get("Link", "").strip()
                    slug = slug_from(link)
                    if not slug or not link:
                        continue
                    if slug not in problems:
                        problems[slug] = {
                            "title":      row.get("Title", slug).strip(),
                            "difficulty": row.get("Difficulty", "").strip().capitalize(),
                            "topics":     [t.strip() for t in row.get("Topics", "").split(",") if t.strip()],
                            "url":        link,
                            "companies":  [],
                        }
                    if company not in problems[slug]["companies"]:
                        problems[slug]["companies"].append(company)

            status = "OK" if rows else "—"
            print(f"  [{done:>3}/{len(companies)}] {status}  {company}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"problems": problems, "companies": sorted(found)}, separators=(",", ":")))
    size_kb = OUT.stat().st_size // 1024
    print(f"\nSaved {len(problems)} problems from {len(found)} companies → {OUT} ({size_kb} KB)")


if __name__ == "__main__":
    main()
