#!/usr/bin/env python3
"""
Decode MHT-CET seat-type codes (GOPENS, LOBCH, PWDRSEBCS, ...) into components.

The rules come from the legend printed on every page of the source PDFs:

  Legends: Start Character G-General, L-Ladies,
           End Character H-Home University, O-Other than Home University,
                         S-State Level, AI-All India Seat.
           PWDR : PWD Common Reserved Seat, DEFR : Defense Common Reserved Seat.
           ORPHANI - Institutional Orphan, ORPHANN - Non Institutional Orphan

Nothing here is invented: every component maps to a term the PDF itself
defines. Codes are still stored verbatim in the database; this produces the
lookup table so the predictor can filter by category and gender separately
without the app hard-coding any of it.

Emits seat_types.csv and fails loudly if any code in cutoffs.csv is unparseable.
"""

import argparse
import csv
import os
import sys

# Longest-first so PWDR wins over PWD, and DEFR over DEF.
PREFIXES = [
    ("PWDR", "PWD_RESERVED", "PWD Common Reserved Seat", "ANY"),
    ("DEFR", "DEFENCE_RESERVED", "Defence Common Reserved Seat", "ANY"),
    ("PWD", "PWD", "Person With Disability", "ANY"),
    ("DEF", "DEFENCE", "Defence", "ANY"),
    ("G", "GENERAL", "General", "ANY"),
    ("L", "LADIES", "Ladies", "FEMALE"),
]

# Reserved-category tokens, longest-first (SEBC before SC, NT1/2/3 before NT).
CATEGORIES = [
    ("OPEN", "Open"),
    ("SEBC", "Socially and Educationally Backward Class"),
    ("OBC", "Other Backward Class"),
    ("NT1", "Nomadic Tribes 1"),
    ("NT2", "Nomadic Tribes 2"),
    ("NT3", "Nomadic Tribes 3"),
    ("SC", "Scheduled Caste"),
    ("ST", "Scheduled Tribe"),
    ("VJ", "Vimukta Jati"),
]

SUFFIXES = [
    ("H", "HOME", "Home University"),
    ("O", "OTHER", "Other Than Home University"),
    ("S", "STATE", "State Level"),
    ("AI", "ALL_INDIA", "All India"),
]

# Codes that stand alone rather than following prefix+category+suffix.
STANDALONE = {
    "EWS": ("EWS", "Economically Weaker Section", "ANY", None, None),
    "TFWS": ("TFWS", "Tuition Fee Waiver Scheme", "ANY", None, None),
    "MI": ("MINORITY", "Minority", "ANY", None, "MINORITY"),
    "ORPHANI": ("ORPHAN", "Institutional Orphan", "ANY", None,
                "ORPHAN_INSTITUTIONAL"),
    "ORPHANN": ("ORPHAN", "Non Institutional Orphan", "ANY", None,
                "ORPHAN_NON_INSTITUTIONAL"),
}


def decode(code):
    """Return a component dict, or None if the code does not fit the legend."""
    if code in STANDALONE:
        grp, label, gender, univ, special = STANDALONE[code]
        return {
            "code": code, "category_group": grp, "label": label,
            "gender": gender, "university_scope": univ, "special": special,
        }

    rest = code
    prefix_key = prefix_label = None
    gender = "ANY"
    for token, key, label, gnd in PREFIXES:
        if rest.startswith(token):
            prefix_key, prefix_label, gender = key, label, gnd
            rest = rest[len(token):]
            break
    if prefix_key is None:
        return None

    scope_key = scope_label = None
    for token, key, label in sorted(SUFFIXES, key=lambda t: -len(t[0])):
        if rest.endswith(token) and len(rest) > len(token):
            scope_key, scope_label = key, label
            rest = rest[: -len(token)]
            break
    if scope_key is None:
        return None

    for token, label in CATEGORIES:
        if rest == token:
            special = prefix_key if prefix_key in (
                "PWD", "PWD_RESERVED", "DEFENCE", "DEFENCE_RESERVED"
            ) else None
            parts = [prefix_label, label, scope_label]
            return {
                "code": code,
                "category_group": token,
                "label": " - ".join(p for p in parts if p),
                "gender": gender,
                "university_scope": scope_key,
                "special": special,
            }
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="../data")
    args = ap.parse_args()

    src = os.path.join(args.data, "cutoffs.csv")
    codes = set()
    with open(src, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            codes.add(row["category"])

    decoded, failed = [], []
    for code in sorted(codes):
        d = decode(code)
        (decoded if d else failed).append(d or code)

    out = os.path.join(args.data, "seat_types.csv")
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=[
            "code", "category_group", "label", "gender",
            "university_scope", "special",
        ])
        w.writeheader()
        for d in decoded:
            w.writerow(d)

    print(f"decoded {len(decoded)} / {len(codes)} seat-type codes")
    if failed:
        print("UNPARSEABLE CODES (fix the decoder, do not guess):", failed,
              file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
