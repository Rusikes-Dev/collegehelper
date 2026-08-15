# JEE College Finder

A paid tool that answers one question well: **given my JEE rank and preferences, which colleges and programmes had closing ranks that make me eligible, based on previous-year JoSAA data?**

Students enter their rank, pick a category, institute types and programmes, pay ₹49 through Razorpay, and get a filterable list of matching programmes with a choice-list builder and PDF export.

---

## Status

| Area | State |
| --- | --- |
| Data importer | Working. Full JoSAA round-1 dataset imported: 138 institutes, 13,292 rows, 0 errors |
| Eligibility engine | Working, 21 tests passing |
| Payment flow | Complete, needs your Razorpay keys |
| Results, filters, sorting, search, pagination | Complete |
| Choice list + PDF | Complete |
| Landing, SEO and legal pages | Complete, contact details need filling in |
| Analytics | Hooks in place, no provider wired |

**Before going live** see [What you still need to provide](#what-you-still-need-to-provide).

---

## Features

- **Rank-aware matching.** IIT and IISc seats are compared against your JEE Advanced rank, NIT/IIIT/GFTI seats against your JEE Main rank. Never mixed.
- **Correct category handling.** Reserved-category cutoffs are category ranks, so they are compared against your category rank. If you have not supplied one, those seats are excluded and reported rather than compared against your AIR.
- **PwD rank list handled separately**, including JoSAA's inconsistent `P` rank suffix.
- **Gender pools and HS/OS quota** applied per row.
- **Free result count before payment.** Students see how many matches exist before paying, and are not charged when the answer is zero.
- **Server-enforced paywall.** Results are computed server-side from a signed session; there is no client flag to flip.
- **Choice list** with reordering and a server-rendered PDF.
- **Near-miss section** for programmes that closed slightly above your rank.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript | Server rendering keeps the dataset and the paywall on the server |
| Data store | Preprocessed JSON, loaded server-side | 4.6k rows load in ~15 ms; no database to run. See [Scaling](#scaling-past-json) |
| Payments | Razorpay Orders + signature verification | Standard Indian gateway |
| PDF | pdfkit, server-side | Values come from the dataset, so the document cannot be forged client-side |
| Validation | Zod | One schema shared by the form and the API |
| Styling | Plain CSS with custom properties | No build step, no utility-class bloat, full control of mobile sizing |

No CSS framework, no state library, no ORM. Dependencies were kept to what earns its place.

---

## Local setup

```bash
git clone <your-repo> && cd jee-college-finder
npm install

cp .env.example .env.local
# then fill in SESSION_SECRET and your Razorpay test keys

# import cutoff data before first run
mkdir -p raw && cp /path/to/JoSAA.html raw/
npm run import -- --in ./raw --year 2025 --round 1

npm run dev          # http://localhost:3000
```

Generate a session secret with:

```bash
openssl rand -hex 32
```

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Eligibility engine test suite |
| `npm run typecheck` | TypeScript, no emit |
| `npm run import -- <flags>` | Import cutoff data |

---

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | ≥32 chars. Signs the session cookie. Rotating it logs everyone out. |
| `RAZORPAY_KEY_ID` | Yes | `rzp_test_…` or `rzp_live_…`. Sent to the browser; safe. |
| `RAZORPAY_KEY_SECRET` | Yes | **Server only.** Never expose, never prefix with `NEXT_PUBLIC_`. |
| `PRICE_PAISE` | No | Defaults to `4900` (₹49). |
| `DATASET_PATH` | No | Absolute path to a dataset outside the repo. |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical URLs and sitemap. |

`.env.local` is gitignored. `.env.example` contains placeholders only.

---

## Razorpay setup

1. Create an account at [razorpay.com](https://razorpay.com) and complete KYC (required for live mode).
2. **Settings → API Keys → Generate Key.** Copy both values into `.env.local`.
3. Start in **Test Mode**. Test card `4111 1111 1111 1111`, any future expiry, any CVV.
4. Razorpay requires a live site with reachable **Contact**, **Terms**, **Privacy**, **Refund** and **Shipping/Delivery** pages before approving live mode. The first four are built; fill in your real business name, address and support email in `src/content/pages.ts`.
5. Optional but recommended: add a webhook on `payment.captured` as a backstop for users who close the browser mid-payment.

---

## Data import

### Getting the source file

1. Open the JoSAA [opening & closing rank](https://josaa.admissions.nic.in/applicant/seatallotmentresult/currentorcr.aspx) page.
2. Select the round, and **ALL** for institute type, institute, programme and seat type.
3. Submit, then **wait for the full table to finish rendering** — this matters, see below.
4. Save with `Ctrl+S` as *Web page, complete*.

### Running the import

```bash
npm run import -- --in ./raw --year 2025 --round 1
```

| Flag | Meaning |
| --- | --- |
| `--in` | File or directory of `.html` / `.csv` sources |
| `--year` | Counselling year. **Required** — not present in the source file |
| `--round` | Round number. **Required** — not reliably present in the source |
| `--out` | Output path, default `./data/dataset.json` |
| `--append` | Merge into the existing dataset instead of replacing it |
| `--strict` | Abort on any error rather than importing what is valid |

Re-importing the same year and round with `--append` **replaces** those rows, so re-running is safe and idempotent.

To load several rounds:

```bash
npm run import -- --in ./raw/r1.html --year 2025 --round 1
npm run import -- --in ./raw/r5.html --year 2025 --round 5 --append
npm run import -- --in ./raw/2024r5.html --year 2024 --round 5 --append
```

### What the importer validates

Errors (row rejected): missing institute or programme, blank or non-numeric rank, opening rank better than closing rank within the same rank list, unknown category or gender.

Warnings (row kept, reported): truncated rows, unrecognised rank suffixes, implausibly large ranks, mixed rank lists, unknown quota codes, institutes falling back to the GFTI classification.

Two JoSAA quirks the importer handles rather than rejecting, both found in the real data:

- **Trailing `.0` on ranks.** Some NIT Mizoram home-state rows export as `1032951.0`. A zero fraction is a formatting artefact and is dropped; a genuine fraction would mean the column is not a rank and is rejected.
- **Mixed rank lists on PwD rows.** JoSAA fills PwD seats from two lists and marks only PwD-list ranks with a trailing `P`, so a row can read opening `315`, closing `109P`. The usual `opening ≤ closing` check cannot apply, so the row is kept and the incomparable opening rank is hidden in the UI rather than shown as if it were meaningful.

Every import prints a summary:

```
Imported  13,292 records
Skipped   0
Warnings  11
Errors    0
Duplicates 0

Institutes 138 — IIT: 23, NIT: 31, IIIT: 28, GFTI: 56
Programmes 286
Quotas     AI, HS, OS, GO, JK, LA
Rank exam  24 institute(s) use JEE Advanced, 114 use JEE Main
```

**Read the summary every time.** The institute-type split is the fastest way to spot a truncated or partial capture.

### Extending the vocabularies

Categories, quotas, institute-type rules and rank-exam overrides are declared at the top of `scripts/import-josaa.mjs`. Adding a new quota code or category is a one-line change; no application code needs touching. Institute type is derived from the name, and any institute that falls through to GFTI is listed in the summary for you to confirm.

### Institute locations

The JoSAA export contains no state or city. `data/institute-meta.json` maps institute names to locations; fill it in to enable the Home State / Other State quota filter and the state filter. Institutes left out are shown as *Not available* and their HS/OS rows are kept rather than guessed at.

---

## Security

The threat is a student trying to reach results without paying. The defences:

| Attack | Defence |
| --- | --- |
| Flip a frontend `paid` flag | Payment state lives only in an HMAC-signed HttpOnly cookie written by the server |
| Call `/api/results` directly | Route calls `requirePaidSession()`; returns 402 without a verified payment |
| Edit rank or category in the results request | Rank and preferences are read from the signed session, not the query string. Query params can only narrow |
| Forge a session cookie | SHA-256 HMAC with `SESSION_SECRET`, compared in constant time |
| Replay another payment's signature | Order id must match the one issued to this session |
| Fake the Razorpay callback | Signature verified with the secret key, then confirmed by a server-to-server fetch of the payment, including its amount |
| Pay ₹1 instead of ₹49 | Amount is set server-side at order creation and re-checked against the fetched payment |
| Brute-force endpoints | Per-IP fixed-window rate limits on every sensitive route |
| Inject values into the PDF | The client sends only choice identity; every displayed value is looked up server-side |
| Read the dataset from the browser | The dataset is `server-only` and never serialised to the client |

Payment ids, session ids and internal row ids never appear in the PDF. Security headers, including a CSP scoped to Razorpay, are set in `next.config.ts`.

---

## Deployment (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add all environment variables under **Settings → Environment Variables**.
3. Commit `data/dataset.json` so it ships with the build, or set `DATASET_PATH` to a mounted volume.
4. Deploy. `pdfkit` is declared in `serverExternalPackages`, so it runs on the Node runtime.

Because sessions are stateless and signed, the app scales horizontally with no shared session store. The **rate limiter is per-instance**; move it to Redis before running many instances.

### Scaling past JSON

The current dataset is ~510 KB (13,292 rows) and evaluates in 2–9 ms. A full multi-year JoSAA archive is roughly 200k rows — about 8 MB and ~150 ms per query. If you reach that point, move `rows` into Postgres with an index on `(institute_type, category, close_rank)` and push the eligibility filter into SQL. `src/lib/dataset.ts` is the only file that would change; the engine and routes read through its interface.

---

## Project structure

```
scripts/import-josaa.mjs    Importer: parse, validate, normalise, report
data/dataset.json           Generated. Server-side only
data/institute-meta.json    Optional institute -> state map
src/lib/
  types.ts                  Domain types
  dataset.ts                Loader + indexes (server-only)
  eligibility.ts            Rank matching, confidence bands, sorting
  session.ts                Signed sessions, requirePaidSession()
  razorpay.ts               Orders, signature verification, payment fetch
  validation.ts             Zod schemas
  ratelimit.ts              Per-IP limits
src/app/api/                search, payment/order, payment/verify, results,
                            options, session, choice-list/pdf
src/components/             FindForm, Paywall, ResultsView, ProgramPicker,
                            Sheet, RankRuler
src/content/pages.ts        Informational and legal page copy
tests/eligibility.test.ts   21 tests
```

---

## Testing

```bash
npm test
```

Covers the boundary cases that matter: exact closing rank, one rank worse, Advanced-only and Main-only routing, IISc's Advanced exception, reserved-category seats without a category rank, OPEN seats for reserved-category students, PwD rank lists, gender pools, home-state quota and sort order.

Manual checks worth repeating before a release:

- With DevTools, set any cookie or local value you like and call `/api/results` — it must return 402.
- Pay in test mode, then replay the same `/api/payment/verify` body in a fresh session — it must fail on order mismatch.
- Load `/results` directly without paying — it must redirect to `/find`.
- Run the form at 360 px width and confirm every control is reachable one-handed.

---

## What you still need to provide

1. **Razorpay keys** (test first, then live after KYC).
2. **A session secret** — `openssl rand -hex 32`.
3. **Business contact details** for the Contact page, in `src/content/pages.ts`. Razorpay will not approve live mode without them.
4. **Institute locations** in `data/institute-meta.json`. Strongly recommended now rather than optional — see below.
5. **Optionally, further rounds and years.** Round 1 for 2025 is loaded. Later rounds have looser cutoffs and are what most students actually want to compare against. Import them with `--append`.

### Why institute locations now matter

The dataset holds 6,940 Home State and Other State rows, plus Goa, J&K and Ladakh quotas. Without a state map the tool cannot tell whether an HS row applies to a given student, so it keeps those rows and marks them as home-state dependent.

The effect is visible at weaker ranks. A JEE Main AIR of 400,000 currently returns 8 options, all of them NIT Manipur home-state seats — genuinely available to a Manipur candidate and useless to anyone else. Filling in `data/institute-meta.json` makes that filter exact.

---

## Licence and attribution

Cutoff figures are published by the Joint Seat Allocation Authority (JoSAA). This project is not affiliated with JoSAA, the NTA or any participating institute. Acknowledge the source wherever the data is displayed.
