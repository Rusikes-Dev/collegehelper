# Cutoff data pipeline — 2026-27

## What ran

```bash
python3 scripts/extract_cutoffs.py --out ./data --year 2026-27 \
  --pdf "CAP Round I=2026ENGG_CAP1_MH_CutOff_V1.pdf" \
  --pdf "CAP Round II=2026ENGG_CAP2_MH_CutOff.pdf" \
  --pdf "CAP Round III=2026ENGG_CAP3_MH_CutOff.pdf"
python3 scripts/decode_seat_types.py --data ./data
python3 scripts/derive_locations.py  --data ./data
```

## Result

| | |
|---|---|
| Pages processed | 4,535 |
| Cutoff records | 90,289 |
| Institutes | 386 |
| Programs | 2,330 |
| Seat-type codes decoded | 97 / 97 |
| Continuation pages spliced | 14 |
| Blocks dropped | 0 |
| Anomalies | 0 |

## Verification

Row counts were checked against an independent count of bracketed percentile
tokens in a separate `pdftotext` extraction of the same PDFs:

| Round | Raw tokens | Extracted | |
|---|---|---|---|
| CAP Round I | 36,059 | 36,059 | match |
| CAP Round II | 34,391 | 34,391 | match |
| CAP Round III | 19,839 | 19,839 | match |

Three known-difficult records were also read off the PDF by hand and compared:
a spliced continuation column (PICT Computer Engineering, EWS 2656 /
99.3892340), a wrapped stage label (GCoE Amravati Mechanical, stage
"I-Non PWD", PWDOBCS 30251 / 92.8576339), and a minority stage row
(Jawaharlal Darda Civil, stage "MH", MI 193453 / 39.9385666). All matched.

## Five traps in these PDFs

1. **Horizontal continuation pages.** Tables too wide for the page put their
   remaining columns on the next physical page with no headers, aligned by
   y-coordinate. 14 pages. Missing them silently drops columns from the most
   competitive colleges.
2. **Columns match by position, not order.** A stage often has values for only
   some of the categories in its header, so the nth value is not the nth
   category. Matching is done by x-position; validated against index matching
   on all 3,015 unambiguous blocks (3,015/3,015 identical, no collisions).
3. **Stage labels wrap across two lines.** `I-Non` on the rank row plus `PWD`
   on the percentile row means stage "I-Non PWD". ~6,700 rows in Rounds II
   and III. Full label set: `I`, `II`, `VII`, `I-Non PWD`, `I-Non Defence`,
   `MH`. Round I contains only `I` and `II`.
4. **Course codes carry suffixes.** `0302524270U`, `0303337293LK`. Decoded per
   the PDF legend: L Regional Language, F Female, T TFWS, U UnAided, K Konkan.
   Stored verbatim with flags alongside.
5. **A lone rank can look like a page number.** On a continuation page a single
   1-4 digit rank is the only token on its row. Page furniture is filtered by
   position (y > 790) rather than by shape.

## Fields

`cutoffs.csv` carries closing figures only, because that is all the source
publishes. No opening rank or opening percentile exists in these documents and
none is derived. Percentile is never computed from rank or vice versa.

`institutes_with_location.csv` carries `city_hint` / `district_hint` derived
from each institute's own registered name (322 of 386; 64 left blank). Every
row is written `location_verified = false` and every college is imported
unpublished. These are a starting point for the admin screen to correct, not
verified facts.

## Re-running for a future year

The extractor takes any number of `--pdf "Round label=path"` pairs and a
`--year`. Same command, new files. `import-cutoffs.ts` replaces cutoff rows per
dataset, so re-importing a corrected round leaves the other rounds untouched.
Check `data/anomalies.json` is empty before importing; anything the parser
cannot align is reported there rather than guessed at.
