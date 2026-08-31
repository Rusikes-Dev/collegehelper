# What changed in this rebuild

> The zip does not contain `data/cutoffs.csv` (12 MB, unchanged). Keep your copy.

## Delete these files after copying this over your repo

They are no longer imported, and leaving them creates duplicate routes:

```
src/app/college-predictor/page.tsx
src/app/contact/page.tsx
src/components/site-header.tsx
src/components/predictor/quick-form.tsx
src/components/college/search-box.tsx
```

`src/app/colleges/page.tsx` and `src/app/colleges/[slug]/page.tsx` are replaced,
not deleted — overwrite them.

## Structure

The site is now five screens and nothing else. On a phone they sit in a fixed
bar at the bottom; from tablet width up the same five move into the header.

| Tab | Route | What it is |
| --- | --- | --- |
| Predict | `/` | The predictor. It is the home page, so arriving and using it are the same action. |
| Search | `/colleges` | Hand-written college pages, one for now. |
| Services | `/services` | Hostels, PG, flats, mess. Marked clearly as not live. |
| Updates | `/cet-updates` | Notices, key dates, explainers. |
| About | `/about` | What the tool does, where the data comes from, contact. |

`/restore-access` and `/admin` still exist and are reachable by link. They are
not tabs, because they are not something a student does every visit.

## Predictor

- Seven steps became three: score, category, branches.
- The city filter is gone. It split small result sets into empty ones.
- 112 branches became three groups: Technical, Core, Other. Each button lists
  what is inside it, so the filter can be seen into.
- Results are one scannable list with a chance filter and a round filter.

## Design

- Two typefaces: Public Sans for everything, IBM Plex Mono for every percentile,
  rank and course code.
- Deep navy is the only brand colour. Green, amber and red are reserved for
  Good chance / Possible / Reach and are used for nothing else, so a colour on
  this site always means one thing.
- The cutoff meter on every result row: closing cutoff at the centre line, the
  candidate on one side of it.

## Bugs fixed along the way

- `src/app/api/predictor/results/route.ts` now passes the admin threshold
  settings into `predict_colleges`. Migration `0004` added those parameters and
  the route was never updated, so changing a threshold in `/admin` relabelled
  the results without changing which ones were selected.
- `src/app/api/payment/verify/route.ts` will no longer mark an already-captured
  payment as failed. Order ids are not secret, so any request could previously
  flip a successful payment's record.
- `scripts/import-cutoffs.ts` no longer resets `is_published`,
  `location_verified` and the city on colleges that already exist. Re-importing
  a corrected CAP round used to unpublish every college you had reviewed.
- `h-13` was not a real Tailwind class. The spacing scale now defines it.
