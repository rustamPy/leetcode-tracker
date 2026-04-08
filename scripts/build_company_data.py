#!/usr/bin/env python3
"""
Fetches all company-wise problem CSVs from liquidslr/interview-company-wise-problems
and builds frontend/src/data/companyData.json
"""
import csv, io, json, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

RAW = "https://raw.githubusercontent.com/liquidslr/interview-company-wise-problems/main"
API = "https://api.github.com/repos/liquidslr/interview-company-wise-problems/contents"
RAW2 = "https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master"
API2 = "https://api.github.com/repos/snehasishroy/leetcode-companywise-interview-questions/contents"
OUT = Path(__file__).parent.parent / "frontend" / "src" / "data" / "companyData.json"

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


def fetch2(company: str):
    for fname in ["all.csv", "thirty-days.csv"]:
        url = f"{RAW2}/{urllib.parse.quote(company)}/{urllib.parse.quote(fname)}"
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
        companies1 = [x["name"] for x in json.loads(r.read()) if x["type"] == "dir"]

    req2 = urllib.request.Request(API2, headers=HEADERS)
    with urllib.request.urlopen(req2, timeout=20) as r:
        companies2 = [x["name"] for x in json.loads(r.read()) if x["type"] == "dir"]

    print(
        f"Fetching {len(companies1)} companies (source 1) + {len(companies2)} companies (source 2)...\n"
    )

    problems: dict = {}
    found: set = set()

    def add_rows(company, rows, link_key):
        for row in rows:
            link = row.get(link_key, "").strip()
            slug = slug_from(link)
            if not slug or not link:
                continue
            if slug not in problems:
                problems[slug] = {
                    "title": row.get("Title", slug).strip(),
                    "difficulty": row.get("Difficulty", "").strip().capitalize(),
                    "topics": [
                        t.strip() for t in row.get("Topics", "").split(",") if t.strip()
                    ],
                    "url": link,
                    "companies": [],
                }
            if company not in problems[slug]["companies"]:
                problems[slug]["companies"].append(company)

    with ThreadPoolExecutor(max_workers=15) as pool:
        futures = {}
        for c in companies1:
            futures[pool.submit(fetch, c)] = (c, "Link")
        for c in companies2:
            futures[pool.submit(fetch2, c)] = (c, "URL")

        done = 0
        total = len(futures)
        for fut in as_completed(futures):
            company, link_key = futures[fut]
            _, rows = fut.result()
            done += 1
            if rows:
                found.add(company)
                add_rows(company, rows, link_key)
            status = "OK" if rows else "—"
            print(f"  [{done:>3}/{total}] {status}  {company}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {"problems": problems, "companies": sorted(found)}, separators=(",", ":")
        )
    )
    size_kb = OUT.stat().st_size // 1024
    print(
        f"\nSaved {len(problems)} problems from {len(found)} companies → {OUT} ({size_kb} KB)"
    )


if __name__ == "__main__":
    main()
