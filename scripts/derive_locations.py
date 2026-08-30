#!/usr/bin/env python3
"""
Derive city/district hints from official institute names.

The cutoff PDFs carry no location field. The only signal is the institute's own
registered name, which usually ends in a place ("... College of Engineering,
Amravati"). This script extracts that hint so the predictor's location filter
has something to work with on day one.

Everything produced here is written with location_verified = false. It is a
starting point for the admin screen to correct, NOT a verified fact. Where the
name gives no usable signal the fields are left empty rather than guessed.

Emits institutes_with_location.csv.
"""

import argparse
import csv
import os
import re

# "Tal. Walva District- Sangali", "Dist. Raigad", "Dist Solapur"
RE_DIST = re.compile(r"\bDist(?:rict)?\b[\.\-\s]+([A-Za-z]+)", re.I)
RE_TAL = re.compile(r"\bTal(?:uka)?\b[\.\-\s]+([A-Za-z]+)", re.I)

# Words that mean the trailing segment is part of the institution's name.
NOT_A_PLACE = {
    "institute", "institutes", "institution", "institutions", "college",
    "colleges", "engineering", "technology", "management", "research",
    "campus", "school", "polytechnic", "university", "group", "society",
    "trust", "foundation", "academy", "centre", "center", "science",
    "sciences", "studies", "education", "faculty", "department",
}


def clean(segment):
    s = segment.strip().strip(".,;:-").strip()
    s = re.sub(r"\s+", " ", s)
    return s


def derive(name):
    """Return (city_hint, district_hint). Either may be ''."""
    city = district = ""

    m = RE_DIST.search(name)
    if m:
        district = clean(m.group(1)).title()
    m = RE_TAL.search(name)
    if m:
        city = clean(m.group(1)).title()

    if not city:
        if "," in name:
            tail = clean(name.rsplit(",", 1)[-1])
            words = tail.split()
            if 1 <= len(words) <= 3 and not any(
                w.lower().strip(".") in NOT_A_PLACE for w in words
            ):
                # Strip a leading "Dist"/"Tal" marker if the tail was that.
                if not RE_DIST.search(tail) and not RE_TAL.search(tail):
                    city = tail.title()

    if city and not district:
        district = city
    return city, district


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="../data")
    args = ap.parse_args()

    src = os.path.join(args.data, "institutes.csv")
    dst = os.path.join(args.data, "institutes_with_location.csv")

    rows = list(csv.DictReader(open(src, encoding="utf-8")))
    hit = 0
    with open(dst, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=[
            "institute_code", "institute_name", "city_hint",
            "district_hint", "location_verified",
        ])
        w.writeheader()
        for r in rows:
            city, district = derive(r["institute_name"])
            if city:
                hit += 1
            w.writerow({
                "institute_code": r["institute_code"],
                "institute_name": r["institute_name"],
                "city_hint": city,
                "district_hint": district,
                "location_verified": "false",
            })

    print(f"derived a city hint for {hit} / {len(rows)} institutes "
          f"({len(rows) - hit} left blank for manual entry)")


if __name__ == "__main__":
    main()
