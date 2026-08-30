#!/usr/bin/env python3
"""
MHT-CET CAP cutoff extractor (DTE Maharashtra / CET Cell "Crystal Reports" PDFs).

Reads the official cutoff PDFs and emits three CSVs:
  institutes.csv   institute_code, institute_name
  programs.csv     institute_code, course_code, program_name, status, home_university
  cutoffs.csv      one row per (round, institute, course, seat_level, stage, category)

Design notes
------------
The PDFs are produced by Crystal Reports in landscape. Two structural traps:

1. WIDE TABLES SPILL ONTO A HORIZONTAL CONTINUATION PAGE.
   When a table has more category columns than fit the page width, the extra
   columns are rendered on the FOLLOWING physical page, with no institute /
   course / seat-level header, at IDENTICAL y-coordinates. Naive line-based
   text extraction silently drops those columns. We detect continuation pages
   (no "Government of Maharashtra" banner) and splice their columns onto the
   matching block of the preceding page by y-coordinate.

2. COURSE CODES ARE NOT ALWAYS 10 DIGITS.
   Some carry trailing letters (e.g. 0302524270U, 0303337293LK). We preserve
   the code verbatim.

Nothing is inferred. Percentile is never computed from rank, rank is never
computed from percentile. Any block we cannot align is written to the
anomalies report instead of being guessed at.

Usage:
  python3 extract_cutoffs.py --out ../data \
      --pdf "CAP Round I=/path/2026ENGG_CAP1_MH_CutOff_V1.pdf" \
      --pdf "CAP Round II=/path/2026ENGG_CAP2_MH_CutOff.pdf" \
      --pdf "CAP Round III=/path/2026ENGG_CAP3_MH_CutOff.pdf" \
      --year 2026-27
"""

import argparse
import csv
import json
import os
import re
import sys
from collections import defaultdict

import pymupdf  # PyMuPDF

# --- Row clustering tolerance in points. "Stage" sits ~1.7pt above its
# category labels, and the roman numeral ~0.1pt off its numbers, so we need a
# small tolerance; percentile rows are ~8pt below rank rows so 3pt is safe.
Y_TOL = 3.0

# Stage labels live left of this x; table data always starts right of it.
# Observed: labels at x 39-48, data columns never below x 73.
LABEL_ZONE_MAX = 62.0

# Anything below this y is page furniture, never table data.
PAGE_FOOTER_Y = 790.0

PAGE_BANNER = "Government of Maharashtra"

SEAT_LEVELS = {
    "State Level",
    "Home University Seats Allotted to Home University Candidates",
    "Home University Seats Allotted to Other Than Home University Candidates",
    "Other Than Home University Seats Allotted to Home University Candidates",
    "Other Than Home University Seats Allotted to Other Than Home University Candidates",
    "Minority Seats Allotted to Maharashtra State Candidature Candidates",
    "Minority Seats Allotted to Other Than Maharashtra State Candidature Candidates",
    "All India Seats",
}

RE_INSTITUTE = re.compile(r"^(\d{5})\s*-\s*(.+)$")
RE_COURSE = re.compile(r"^(\d{10}[A-Z]{0,4})\s*-\s*(.+)$")
RE_STATUS = re.compile(r"^Status:\s*(.*?)\s*Home University\s*:\s*(.*)$")
RE_ROMAN = re.compile(r"^(?:I{1,3}|IV|V|VI{0,3}|IX|X)$")
RE_INT = re.compile(r"^\d+$")
RE_PCT = re.compile(r"^\(\s*(\d+(?:\.\d+)?)\s*\)$")
RE_CATEGORY = re.compile(r"^[A-Z][A-Z0-9]{1,14}$")

NOISE_PREFIXES = (
    "Government of Maharashtra",
    "State Common Entrance Test Cell",
    "Cut Off List",
    "Degree Courses In Engineering",
    "Legends:",
    "Maharashtra State Seats",
)


def page_rows(page):
    """Cluster a page's words into rows of (x0, text), sorted top-to-bottom.

    Every page carries a vertical "Dir..." watermark as single glyphs at the
    top-left (x<45, y<60). Left in place they corrupt the banner rows, so they
    are dropped here."""
    buckets = defaultdict(list)
    for x0, y0, x1, y1, word, *_ in page.get_text("words"):
        if y0 < 60 and x0 < 45 and len(word) == 1 and word.isalpha():
            continue
        # Footer page number. Matched by position: the lowest data row observed
        # anywhere in the corpus sits at y=740, the footer number at y=816.
        # Matching it by shape instead would swallow any 1-4 digit rank that is
        # alone on a horizontal continuation page.
        if y0 > PAGE_FOOTER_Y:
            continue
        placed = False
        for key in buckets:
            if abs(key - y0) <= Y_TOL:
                buckets[key].append((x0, word))
                placed = True
                break
        if not placed:
            buckets[y0].append((x0, word))
    rows = []
    for y in sorted(buckets):
        rows.append((y, sorted(buckets[y], key=lambda t: t[0])))
    return rows


def row_text(cells):
    return " ".join(w for _, w in cells)


def classify(cells, label_max):
    """Return (kind, payload) for a clustered row.

    Table rows are split into a left "label zone" (x < label_max) holding the
    stage label, and a "data zone" holding the values. The stage label can span
    two physical lines -- e.g. "I-Non" on the rank row and "PWD" on the
    percentile row, which together mean stage "I-Non PWD". Treating rows as a
    flat token list drops those rows entirely, so the zones are kept separate.

    On horizontal continuation pages the label column does not exist and the
    data restarts at the left margin, so label_max is passed as -1 there.
    """
    words = [w for _, w in cells]
    text = row_text(cells)

    if any(text.startswith(p) for p in NOISE_PREFIXES):
        return "noise", None
    if text in SEAT_LEVELS:
        return "seat_level", text
    if text.startswith("Status:"):
        m = RE_STATUS.match(text)
        if m:
            return "status", (m.group(1).strip(), m.group(2).strip())
        return "status", (text[len("Status:"):].strip(), "")

    m = RE_INSTITUTE.match(text)
    if m:
        return "institute", (m.group(1), m.group(2).strip())
    m = RE_COURSE.match(text)
    if m:
        return "course", (m.group(1), m.group(2).strip())

    label = [w for x, w in cells if x < label_max]
    data = [(x, w) for x, w in cells if x >= label_max]
    if not data:
        return "other", text

    # Category header: label zone is empty or the literal "Stage".
    if all(RE_CATEGORY.match(w) for _, w in data) and all(
        w == "Stage" for w in label
    ):
        return "categories", data

    # Rank row: data zone is all integers.
    if all(RE_INT.match(w) for _, w in data):
        return "ranks", (" ".join(label) or None, data)

    # Percentile row: data zone is all bracketed percentiles. Any label-zone
    # token here continues the stage label from the rank row above.
    if all(RE_PCT.match(w) for _, w in data):
        return "pcts", (" ".join(label) or None, data)

    return "other", text


def parse_page(page, carry=None, label_max=LABEL_ZONE_MAX):
    """Parse one page into blocks. Blocks are anchored by their category-row y.

    `carry` supplies institute/course context from the previous page, since a
    course's seat-level tables can continue onto the next vertical page without
    repeating the course header."""
    blocks = []
    ctx = dict(carry) if carry else {
        "institute_code": None, "institute_name": None,
        "course_code": None, "course_name": None,
        "status": None, "home_university": None,
        "seat_level": None,
    }
    current = None
    pending_course_name = None

    for y, cells in page_rows(page):
        kind, payload = classify(cells, label_max)

        if kind == "noise":
            continue
        if kind == "institute":
            ctx["institute_code"], ctx["institute_name"] = payload
            ctx["course_code"] = ctx["course_name"] = None
            pending_course_name = None
            current = None
        elif kind == "course":
            ctx["course_code"], ctx["course_name"] = payload
            pending_course_name = ctx["course_code"]
            current = None
        elif kind == "status":
            ctx["status"], ctx["home_university"] = payload
            pending_course_name = None
        elif kind == "seat_level":
            ctx["seat_level"] = payload
            current = None
        elif kind == "categories":
            current = {
                "y": y,
                "ctx": dict(ctx),
                "categories": list(payload),
                "stages": [],
            }
            blocks.append(current)
        elif kind == "ranks":
            stage, cells_ = payload
            if current is None:
                # Continuation page: columns with no header of their own.
                current = {"y": y, "ctx": dict(ctx), "categories": [], "stages": []}
                blocks.append(current)
            current["stages"].append({
                "stage": stage, "y": y, "ranks": list(cells_), "pcts": [],
                "pct_seen": False,
            })
        elif kind == "pcts":
            label, cells_ = payload
            if current and current["stages"]:
                st = current["stages"][-1]
                # A second percentile row for the same stage would mean the rank
                # row between them was misread; never silently overwrite.
                if st["pct_seen"]:
                    st["duplicate_pct"] = True
                else:
                    st["pcts"] = list(cells_)
                    st["pct_seen"] = True
                    if label:
                        # Second line of a wrapped stage label, e.g. "I-Non"+"PWD".
                        st["stage"] = f"{st['stage']} {label}".strip()
        elif kind == "other":
            # Wrapped course name continuation, e.g. "Technology)". Only valid
            # immediately after the course row, before the Status row.
            if pending_course_name and ctx["course_name"] is not None:
                ctx["course_name"] = (ctx["course_name"] + " " + payload).strip()
            continue

    return blocks, ctx


def splice(main_blocks, cont_blocks, anomalies, round_name, pageno, x_offset):
    """Attach continuation-page columns to the matching main-page blocks by y.

    Continuation pages restart their x-coordinates at the left margin, which
    would collide with the main page's columns once merged. Shifting them right
    by one page width keeps the combined column order correct."""
    shift = lambda cells: [(x + x_offset, v) for x, v in cells]
    used = set()
    for cb in cont_blocks:
        match = None
        best = 1e9
        for i, mb in enumerate(main_blocks):
            if i in used:
                continue
            d = abs(mb["y"] - cb["y"])
            if d < best:
                best, match = d, i
        if match is None or best > Y_TOL * 2:
            anomalies.append({
                "round": round_name, "page": pageno + 1,
                "issue": "continuation block could not be matched to a table",
                "detail": f"continuation y={cb['y']:.1f}",
            })
            continue
        used.add(match)
        mb = main_blocks[match]
        mb["categories"].extend(shift(cb["categories"]))
        for cs in cb["stages"]:
            target = None
            best_s = 1e9
            for ms in mb["stages"]:
                d = abs(ms["y"] - cs["y"])
                if d < best_s:
                    best_s, target = d, ms
            if target is None or best_s > Y_TOL * 2:
                anomalies.append({
                    "round": round_name, "page": pageno + 1,
                    "issue": "continuation stage row unmatched",
                    "detail": f"y={cs['y']:.1f}",
                })
                continue
            target["ranks"].extend(shift(cs["ranks"]))
            target["pcts"].extend(shift(cs["pcts"]))


def emit(blocks, round_name, year, writer, institutes, programs, anomalies,
         stats, source_document=""):
    for b in blocks:
        ctx = b["ctx"]
        cats = b["categories"]
        if not ctx["institute_code"] or not ctx["course_code"]:
            anomalies.append({
                "round": round_name, "page": b.get("page"),
                "issue": "table without institute/course context", "detail": str(ctx),
            })
            continue

        institutes[ctx["institute_code"]] = ctx["institute_name"]
        programs[(ctx["institute_code"], ctx["course_code"])] = (
            ctx["course_name"], ctx["status"], ctx["home_university"],
        )

        for st in b["stages"]:
            ranks, pcts = st["ranks"], st["pcts"]
            # Columns are matched by x-position, never by index: a stage often
            # has values for only some of the categories in the header, so the
            # nth number is not necessarily the nth category.
            triples = align_by_x(cats, ranks, pcts)
            if st.get("duplicate_pct"):
                anomalies.append({
                    "round": round_name, "page": b.get("page"),
                    "issue": "two percentile rows for one stage",
                    "detail": f"{ctx['institute_code']}/{ctx['course_code']}",
                })
            if triples is None:
                anomalies.append({
                    "round": round_name, "page": b.get("page"),
                    "issue": "columns could not be aligned",
                    "detail": (f"{ctx['institute_code']}/{ctx['course_code']} "
                               f"{ctx['seat_level']} stage={st['stage']} "
                               f"cats={len(cats)} ranks={len(ranks)} "
                               f"pcts={len(pcts)}"),
                })
                stats["dropped"] += 1
                continue
            if len(triples) != len(cats):
                stats["partial_stage_rows"] += 1

            for cat, rank, pct in triples:
                m = RE_PCT.match(pct)
                writer.writerow({
                    "academic_year": year,
                    "cap_round": round_name,
                    "institute_code": ctx["institute_code"],
                    "course_code": ctx["course_code"],
                    "seat_level": ctx["seat_level"] or "",
                    "stage": st["stage"] or "",
                    "category": cat,
                    "closing_rank": rank,
                    "closing_percentile": m.group(1) if m else "",
                    "source_document": source_document,
                    "source_page": b.get("page") or "",
                })
                stats["rows"] += 1


def align_by_x(cats, ranks, pcts):
    """Match each rank/percentile pair to its category column by x-position.

    A rank token's x0 sits 10-14pt left of its category label's x0, while the
    minimum observed column pitch is 44pt, so nearest-by-x0 is unambiguous.
    Validated against index matching on every block where the counts agree:
    3015/3015 identical, zero collisions.

    Returns None (rather than a guess) if anything fails to line up.
    """
    if not cats or not ranks or len(ranks) != len(pcts):
        return None

    xs = sorted(x for x, _ in cats)
    pitch = min((xs[i + 1] - xs[i] for i in range(len(xs) - 1)), default=44.0)
    tol = max(pitch * 0.6, 20.0)

    out = []
    for i, (rx, rv) in enumerate(ranks):
        # The percentile row shares the rank row's exact x-origin.
        if abs(pcts[i][0] - rx) > 1.5:
            return None
        best, bestd = None, 1e9
        for cx, cv in cats:
            d = abs(cx - rx)
            if d < bestd:
                bestd, best = d, cv
        if best is None or bestd > tol:
            return None
        out.append((best, rv, pcts[i][1]))

    if len(set(c for c, _, _ in out)) != len(out):
        return None
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", action="append", required=True,
                    help='Round label and path, e.g. "CAP Round I=/path/f.pdf"')
    ap.add_argument("--year", default="2026-27")
    ap.add_argument("--out", default="./data")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    institutes, programs, anomalies = {}, {}, []
    stats = defaultdict(int)

    cutoff_path = os.path.join(args.out, "cutoffs.csv")
    with open(cutoff_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=[
            "academic_year", "cap_round", "institute_code", "course_code",
            "seat_level", "stage", "category", "closing_rank", "closing_percentile",
            "source_document", "source_page",
        ])
        writer.writeheader()

        for spec in args.pdf:
            round_name, path = spec.split("=", 1)
            doc = pymupdf.open(path)
            print(f"  {round_name}: {len(doc)} pages", file=sys.stderr)

            parsed = []
            carry = None
            for pno in range(len(doc)):
                page = doc[pno]
                has_banner = PAGE_BANNER in page.get_text("text")
                # Continuation pages must not inherit context as if they were a
                # fresh vertical page; they are spliced sideways instead.
                blocks, ctx = parse_page(
                    page,
                    carry if has_banner else None,
                    label_max=LABEL_ZONE_MAX if has_banner else -1.0,
                )
                for b in blocks:
                    b["page"] = pno + 1
                if has_banner:
                    carry = ctx
                parsed.append((has_banner, blocks))
                if (pno + 1) % 500 == 0:
                    print(f"    page {pno+1}", file=sys.stderr)

            # Splice continuation pages into the page before them.
            for pno in range(len(parsed)):
                has_banner, blocks = parsed[pno]
                if has_banner or not blocks:
                    continue
                if pno == 0 or not parsed[pno - 1][0]:
                    anomalies.append({
                        "round": round_name, "page": pno + 1,
                        "issue": "continuation page with no preceding main page",
                        "detail": "",
                    })
                    continue
                splice(parsed[pno - 1][1], blocks, anomalies, round_name, pno,
                       x_offset=doc[pno].rect.width)
                stats["continuation_pages"] += 1
                parsed[pno] = (has_banner, [])

            for has_banner, blocks in parsed:
                emit(blocks, round_name, args.year, writer,
                     institutes, programs, anomalies, stats,
                     source_document=os.path.basename(path))
            stats[f"pages_{round_name}"] = len(doc)

    with open(os.path.join(args.out, "institutes.csv"), "w", newline="",
              encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["institute_code", "institute_name"])
        for code in sorted(institutes):
            w.writerow([code, institutes[code]])

    with open(os.path.join(args.out, "programs.csv"), "w", newline="",
              encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["institute_code", "course_code", "program_name",
                    "status", "home_university"])
        for (ic, cc) in sorted(programs):
            name, status, hu = programs[(ic, cc)]
            w.writerow([ic, cc, name, status or "", hu or ""])

    with open(os.path.join(args.out, "anomalies.json"), "w", encoding="utf-8") as fh:
        json.dump(anomalies, fh, indent=2)

    print(json.dumps({
        "cutoff_rows": stats["rows"],
        "institutes": len(institutes),
        "programs": len(programs),
        "continuation_pages_spliced": stats["continuation_pages"],
        "blocks_recovered_by_x_match": stats["recovered"],
        "blocks_dropped": stats["dropped"],
        "anomalies": len(anomalies),
    }, indent=2))


if __name__ == "__main__":
    main()
