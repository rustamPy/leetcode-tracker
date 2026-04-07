#!/usr/bin/env python3
"""
Fetch LeetCode profile + accepted submissions via LeetCode's public GraphQL API.
Run by GitHub Actions before `npm run build` — no browser calls needed.
"""
import json, time, sys, urllib.request, urllib.error

USERNAME = "thisisrustam"
GQL_URL  = "https://leetcode.com/graphql"
OUT_FILE = "frontend/src/data/userData.json"

HEADERS = {
    "Content-Type":  "application/json",
    "Referer":       "https://leetcode.com",
    "User-Agent":    "Mozilla/5.0 (compatible; leetcode-tracker-build/2.0)",
}

def gql(query, variables=None, retries=4):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(GQL_URL, data=body, headers=HEADERS, method="POST")
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except Exception as e:
            wait = 2 ** attempt
            print(f"  [{attempt+1}/{retries}] GQL failed: {e}  (retry in {wait}s)", file=sys.stderr)
            time.sleep(wait)
    return None

# ── Profile / solve counts ────────────────────────────────────
PROFILE_QUERY = """
query userProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      realName
      userAvatar
      ranking
      reputation
      starRating
      aboutMe
      countryName
      company
      school
      skillTags
    }
    submitStats: submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
    badges { id name icon displayName }
    activeBadge { id displayName icon }
  }
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    totalParticipants
    topPercentage
  }
}
"""

# ── Recent accepted submissions ───────────────────────────────
SUBMISSIONS_QUERY = """
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
    lang
    statusDisplay
  }
}
"""

print(f"Fetching data for {USERNAME} via LeetCode GraphQL...")

profile_data = gql(PROFILE_QUERY, {"username": USERNAME})
sub_data     = gql(SUBMISSIONS_QUERY, {"username": USERNAME, "limit": 300})

user     = (profile_data or {}).get("data", {}).get("matchedUser") or {}
contest  = (profile_data or {}).get("data", {}).get("userContestRanking") or {}
subs_raw = (sub_data or {}).get("data", {}).get("recentAcSubmissionList") or []

# Normalise solve counts
ac_counts = {s["difficulty"]: s["count"] for s in user.get("submitStats", {}).get("acSubmissionNum", [])}

data = {
    "username": USERNAME,
    "profile": {
        "realName":    user.get("profile", {}).get("realName", ""),
        "userAvatar":  user.get("profile", {}).get("userAvatar", ""),
        "ranking":     user.get("profile", {}).get("ranking", 0),
        "reputation":  user.get("profile", {}).get("reputation", 0),
        "countryName": user.get("profile", {}).get("countryName", ""),
        "company":     user.get("profile", {}).get("company", ""),
        "school":      user.get("profile", {}).get("school", ""),
        "skillTags":   user.get("profile", {}).get("skillTags", []),
        "starRating":  user.get("profile", {}).get("starRating", 0),
    },
    "solved": {
        "solvedProblem": ac_counts.get("All", 0),
        "easySolved":    ac_counts.get("Easy", 0),
        "mediumSolved":  ac_counts.get("Medium", 0),
        "hardSolved":    ac_counts.get("Hard", 0),
    },
    "contest": contest,
    "badges":      user.get("badges", []),
    "activeBadge": user.get("activeBadge"),
    "submissions": [
        {
            "title":     s["title"],
            "titleSlug": s["titleSlug"],
            "timestamp": s["timestamp"],
            "lang":      s["lang"],
        }
        for s in subs_raw
    ],
    "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
}

with open(OUT_FILE, "w") as f:
    json.dump(data, f)

n_sub  = len(data["submissions"])
n_solv = data["solved"]["solvedProblem"]
print(f"Saved: {n_solv} solved, {n_sub} accepted submissions → {OUT_FILE}")
