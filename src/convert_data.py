#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convert the two predictor repos' data into compact static JSON.

Both original tools kept their cutoff data behind a paid serverless API.
On a static host there is no server, so we ship the data as a plain JSON
file that the browser fetches only when the tool page is actually opened.

Output:
  site/assets/data/cet-cutoffs.json
  site/assets/data/neet-cutoffs.json
"""
import csv, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "site", "assets", "data")
PRIV = os.path.join(ROOT, "private-data")  # paid datasets — NOT in the public site
SRC_CET = os.environ.get("CET_SRC", "/home/claude/work/cet_raw/CET-College-Predictor-main")
SRC_NEET = os.environ.get("NEET_SRC", "/home/claude/work/neet_raw/Neet-College-Predictor-main")


def dump(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path)


# ---------------------------------------------------------------- MHT CET ---
def build_cet():
    src = os.path.join(SRC_CET, "api", "_data", "colleges.json")
    d = json.load(open(src, encoding="utf-8"))

    # Original row schema:
    # [collegeIdx, branchIdx, branchGroupIdx, categoryIdx, poolIdx,
    #  genderIdx, seatLevelIdx, percentile, closingRank, roundIdx]
    rows = []
    for r in d["rows"]:
        rows.append([
            r[0], r[1], r[2], r[3], r[4], r[5], r[6],
            round(float(r[7]), 2) if r[7] is not None else None,
            int(r[8]),
            r[9],
        ])

    out = {
        "meta": d["meta"],
        "enums": d["enums"],
        # college tuple: [name, code, city, region, type, status]
        "colleges": d["colleges"],
        "branches": d["branches"],
        "rows": rows,
    }
    size = dump(os.path.join(PRIV, "cet-cutoffs.json"), out)
    print(f"  cet-cutoffs.json   {size/1e6:6.2f} MB  "
          f"{len(d['colleges'])} colleges, {len(d['branches'])} branches, {len(rows):,} seat rows")
    return {
        "colleges": len(d["colleges"]),
        "branches": len(d["branches"]),
        "rows": len(rows),
        "source": d["meta"]["source"],
    }


# ------------------------------------------------------------------- NEET ---
def build_neet():
    cpath = os.path.join(SRC_NEET, "data", "colleges.csv")
    kpath = os.path.join(SRC_NEET, "data", "cutoffs.csv")

    colleges = {}
    order = []
    with open(cpath, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            cid = int(row["id"])
            colleges[cid] = [row["name"].strip(), row["state"].strip()]
            order.append(cid)

    # stable index map
    idx = {cid: i for i, cid in enumerate(order)}
    clist = [colleges[cid] for cid in order]

    courses, quotas, cats = [], [], []
    def key(lst, v):
        try:
            return lst.index(v)
        except ValueError:
            lst.append(v)
            return len(lst) - 1

    rows = []
    with open(kpath, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            cid = int(row["college_id"])
            if cid not in idx:
                continue
            try:
                closing = int(row["closing_rank"])
            except (ValueError, TypeError):
                continue
            try:
                opening = int(row["opening_rank"])
            except (ValueError, TypeError):
                opening = closing
            try:
                seats = int(row["seats"])
            except (ValueError, TypeError):
                seats = 0
            rows.append([
                idx[cid],
                key(courses, row["course"].strip()),
                key(quotas, row["quota"].strip()),
                key(cats, row["category"].strip()),
                int(row["round"]),
                opening,
                closing,
                seats,
            ])

    states = sorted({c[1] for c in clist if c[1] and c[1] != "Unknown"})

    out = {
        "meta": {
            "source": "MCC NEET UG All India Quota counselling allotment lists, Rounds 1-3",
            "year": 2025,
            "note": "Ranks are NEET All India Rank (overall), including for reserved-category "
                    "seats. Your category decides which seats you may compete for.",
        },
        "enums": {"course": courses, "quota": quotas, "category": cats},
        "states": states,
        # college tuple: [name, state]
        "colleges": clist,
        # row: [collegeIdx, courseIdx, quotaIdx, catIdx, round, opening, closing, seats]
        "rows": rows,
    }
    size = dump(os.path.join(PRIV, "neet-cutoffs.json"), out)
    print(f"  neet-cutoffs.json  {size/1e6:6.2f} MB  "
          f"{len(clist)} colleges, {len(rows):,} cutoff rows, {len(states)} states")
    return {
        "colleges": len(clist),
        "rows": len(rows),
        "states": len(states),
        "courses": len(courses),
        "source": out["meta"]["source"],
    }


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(PRIV, exist_ok=True)
    print("Converting predictor datasets…")
    stats = {"cet": build_cet(), "neet": build_neet()}
    dump(os.path.join(OUT, "tool-stats.json"), stats)
    print("Done.")
