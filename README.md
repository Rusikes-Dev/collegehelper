# JEE College Finder

A paid tool that answers one question well: **given my JEE rank and preferences, which colleges and programmes had closing ranks that make me eligible, based on previous-year JoSAA data?**

Students enter their rank, pick a category, institute types and programmes, pay ₹49 through Razorpay, and get a filterable list of matching programmes with a choice-list builder and PDF export.

---

## Status

| Area | State |
| --- | --- |
| Data importer | Working. JoSAA 2025 rounds 1 and 6 imported: 138 institutes, 25,236 rows |
| Eligibility engine | Working, 52 tests passing |
| Payment flow | Complete, needs your Razorpay keys |
| Accounts, restore access | Complete, needs your Supabase project |
| Admin panel | Complete, needs `ADMIN_PASSWORD` |
| Visitor and source analytics | Complete, first-party, no third-party scripts |
| Results, filters, sorting, search, pagination | Complete |
| Choice list + PDF | Complete |
| Landing, SEO and legal pages | Complete, real contact details wired in |

**Before going live** see [What you still need to provide](#what-you-still-need-to-provide).

---

## Features

- **Round-aware matching.** Cutoffs are compared against one counselling round at a time, defaulting to the latest held, so a seat published in several rounds is never listed several times. "Compare all rounds" is available explicitly for seeing how far a cutoff moved.
- **Rank-aware matching.** IIT and IISc seats are compared against your JEE Advanced rank, NIT/IIIT/GFTI seats against your JEE Main rank. Never mixed.
- **Correct category handling.** Reserved-category cutoffs are category ranks, so they are compared against your category rank. If you have not supplied one, those seats are excluded and reported rather than compared against your AIR.
- **PwD rank list handled separately**, including JoSAA's inconsistent `P` rank suffix.
- **Gender pools and HS/OS quota** applied per row.
- **Free result count before payment.** Students see how many matches exist before paying, and are not charged when the answer is zero.
- **Server-enforced paywall.** Results are computed server-side from a signed session; there is no client flag to flip.
- **Choice list** with reordering and a server-rendered PDF.
- **Near-miss section** for programmes that closed slightly above your rank.
- **Access that survives the device.** Students give an email address and mobile number before paying, and can restore their list on any other phone or browser with the same pair.
- **One payment, not one search.** Access belongs to the student, so changing a branch and re-running costs nothing.
- **Admin panel** at `/admin`: traffic and conversion, every payment including abandoned ones, and granting or revoking access by hand.
- **First-party analytics.** Visitors, sources and devices recorded in your own database. No third-party scripts, no IP addresses stored.
- **Built for phones.** Bottom sheets that can be thumbed away, a thumb-reachable action bar, 44 px targets, 16 px inputs so iOS never zooms on focus, installable to the home screen, and a dark mode that follows the phone's own setting.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript | Server rendering keeps the dataset and the paywall on the server |
| Cutoff data | Preprocessed JSON, loaded server-side | 13k rows load in ~15 ms; no query planner needed. See [Scaling](#scaling-past-json) |
| Accounts, payments, analytics | Supabase (Postgres), server-side only | Needs to outlive a cookie and be queryable. RLS on, no policies: only the service-role key can read it |
| Payments | Razorpay Orders + signature verification | Standard Indian gateway |
| PDF | pdfkit, server-side | Values come from the dataset, so the document cannot be forged client-side |
| Validation | Zod | One schema shared by the form and the API |
| Styling | Plain CSS with custom properties | No build step, no utility-class bloat, full control of mobile sizing |

No CSS framework, no state library, no ORM, and no Supabase SDK — the four REST verbs this needs are a 120-line wrapper in `src/lib/supabase.ts`. Dependencies were kept to what earns its place.

---

## Local setup

```bash
git clone <your-repo> && cd jee-college-finder
npm install

cp .env.example .env.local
# fill in SESSION_SECRET, your Razorpay test keys, and (recommended)
# your Supabase URL + service-role key and an ADMIN_PASSWORD

# import cutoff data before first run
mkdir -p raw && cp /path/to/JoSAA.html raw/
npm run import -- --in ./raw --year 2025 --round 1

npm run dev          # http://localhost:3000
```

The site runs with only `SESSION_SECRET` set. Payments need the Razorpay keys; accounts, restore
and the admin panel need Supabase. Each part degrades on its own and says so rather than failing
obscurely.

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

### Required

| Variable | Notes |
| --- | --- |
| `SESSION_SECRET` | ≥32 chars. Signs the session cookie. Rotating it logs everyone out. |
| `RAZORPAY_KEY_ID` | `rzp_test_…` or `rzp_live_…`. Sent to the browser; safe. |
| `RAZORPAY_KEY_SECRET` | **Server only.** Never expose, never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs and sitemap. |

### Supabase — accounts, restore, admin panel

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | Project Settings → Data API. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Bypasses row-level security and can read every student's contact details. Never prefix with `NEXT_PUBLIC_`. |

Leave these out and the site still runs and still takes payments — but access lives only in the
browser cookie, so nobody can restore on a second device and the admin panel has nothing to show.

### Admin panel

| Variable | Notes |
| --- | --- |
| `ADMIN_PASSWORD` | ≥10 chars. The panel is disabled until this is set. Changing it signs out any open session. |
| `ADMIN_EMAIL` | Cosmetic; labels your entries in the audit log. |
| `ADMIN_SESSION_SECRET` | Optional. Signs admin cookies separately from student sessions. Falls back to `SESSION_SECRET`. |

### Payments and access

| Variable | Default | Notes |
| --- | --- | --- |
| `PRICE_PAISE` | `4900` | ₹49. |
| `ACCESS_VALIDITY_DAYS` | `365` | How long access lasts after payment. `0` means it never expires. |
| `RAZORPAY_WEBHOOK_SECRET` | — | Strongly recommended. See [Webhook](#webhook-the-safety-net). |
| `DATASET_PATH` | — | Absolute path to a dataset outside the repo. |

`.env.local` is gitignored. `.env.example` contains placeholders only.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com). Any region near your users; Mumbai is closest for an Indian audience.
2. **SQL Editor → New query.** Paste the whole of `supabase/schema.sql` and run it. It is idempotent, so re-running after a change is safe.
3. **Project Settings → Data API** for `SUPABASE_URL`; **Project Settings → API Keys** for the service-role key.
4. Add both to `.env.local` and to Vercel, then redeploy.

### What is stored, and what is not

| Stored | Not stored |
| --- | --- |
| Email, mobile number, optional name | Passwords — there are none |
| Payment status, amount, Razorpay ids | Card, UPI or bank details — those never touch this server |
| Access grants and their history | |
| Page views: a random visitor id, path, source, coarse device, country | IP addresses |
| Funnel counts | Rank values against a named person |

Every table has RLS enabled with **no policies**, so the anon key can read nothing at all. Only the
server, holding the service-role key, can touch them.

---

## Razorpay setup

1. Create an account at [razorpay.com](https://razorpay.com) and complete KYC (required for live mode).
2. **Settings → API Keys → Generate Key.** Copy both values into `.env.local`.
3. Start in **Test Mode**. Test card `4111 1111 1111 1111`, any future expiry, any CVV.
4. Razorpay requires a live site with reachable **Contact**, **Terms**, **Privacy**, **Refund** and **Shipping/Delivery** pages before approving live mode. The first four are built; fill in your real business name, address and support email in `src/content/pages.ts`.

### Webhook: the safety net

Set this up before you go live. It is not optional in practice.

Students pay on phones, and UPI apps routinely switch away from the browser and do not always come
back. When that happens the money is taken but the browser never calls `/api/payment/verify`, and
the student is left paid-but-locked-out, emailing you.

Because the email and mobile number are collected *before* the payment, the order row already knows
who the buyer is, so the webhook can grant access with no browser involved. The student then
restores with the same email and mobile number and finds their list waiting.

**Razorpay → Settings → Webhooks → Add New Webhook**

| Field | Value |
| --- | --- |
| URL | `https://your-domain.com/api/payment/webhook` |
| Active events | `payment.captured`, `payment.failed` |
| Secret | Any strong string. Put the same value in `RAZORPAY_WEBHOOK_SECRET`. |

The webhook secret is **not** your API key secret. Signatures are verified against the raw request
body before anything is written.

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
npm run import -- --in ./raw/r6.html --year 2025 --round 6 --append
npm run import -- --in ./raw/2024r6.html --year 2024 --round 6 --append
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

## How access works

This is the one design decision worth understanding before changing anything.

**Access belongs to the student, not to a search.** A payment writes a row in `access_grants`
against the `app_users` row for their (email, phone) pair. The session cookie carries the user id;
the grant in the database decides whether results are shown.

Three things follow, all of them deliberate:

- **Restoring works.** The grant outlives the cookie, the browser and the device.
- **Re-running is free.** A student who paid can change one branch and search again without paying
  twice. On the old cookie-scoped model that second search would have been charged, which is the
  single largest source of refund requests on tools like this.
- **Revoking works.** Cancelling a grant in the admin panel locks the student out within 30 seconds,
  even though their cookie still says paid. There is a 30-second cache on the check; that is the
  whole delay.

`ACCESS_VALIDITY_DAYS` controls how long a paid grant lasts. Set it to `0` for access that never
expires.

If you would rather sell one search at a time, the change is contained: grant with
`days: <short>` in `src/app/api/payment/verify/route.ts`, and make `/api/search` compare the new
search against the one stored on the grant.

---

## Admin panel

Lives at `/admin`. Set `ADMIN_PASSWORD` and it switches on; leave it blank and the route shows an
explanatory screen and nothing else. It is excluded from `robots.txt`, carries `X-Robots-Tag:
noindex`, and its own page views are excluded from your traffic figures.

| Tab | What it answers |
| --- | --- |
| **Overview** | Where visitors come from, and where they drop out. The funnel runs visitors → searches → paywall → contact details → paid, each step showing its conversion off the one before, so you can see *which* step is losing people rather than only that revenue is flat. |
| **Students** | Search by email, phone or name. Open anyone to see their payments, their access history and where they first came from. Grant, revoke or block from here. Export the list as CSV. |
| **Give access** | Grant by email and mobile number, for any length or permanently. Creates the account if it does not exist, so it works for someone who has never used the site. Sits next to the audit log of every grant and revoke. |
| **Payments** | Every order, including abandoned ones. Rows appear the moment the payment window opens, so a pile of "Started" rows is checkout abandonment — worth reading as a signal about price or friction, not as a bug. |
| **Visitor log** | The live arrival feed. For the question a dashboard cannot answer: what did the person who came in from that Instagram post actually do? |

### When a student says they paid but cannot get in

1. **Students** tab, search their email or phone.
2. If the account exists with a captured payment but no live grant, open it and **Grant access**.
3. If nothing is found, they most likely mistyped their email at checkout. Check the **Payments**
   tab for the amount and time; the address they typed is on the order row.
4. Use **Give access** with the address they can actually receive mail at, then tell them to open
   `/restore` and enter that same pair.

Every grant, revoke and block is written to `admin_audit` permanently, with your `ADMIN_EMAIL`
against it.

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
| Keep access after a refund or chargeback | Grants live in the database, not the cookie. Revoking takes effect within 30 seconds |
| Guess someone else's email and phone to steal their access | Restore is rate limited to 8 attempts per 15 minutes per IP, and the failure message is identical whether the account exists, never paid, or lapsed |
| Reach the admin panel | Password in an environment variable, compared in constant time; signed `SameSite=Strict` cookie that embeds a fingerprint of the password, so changing it revokes every open session; sign-in limited to 6 attempts per 15 minutes |
| Forge an admin cookie | Same HMAC scheme as student sessions, verified before the payload is read |
| Fake a webhook to grant themselves access | HMAC-SHA256 over the raw body with a separate webhook secret |
| Read another student's contact details | Every Supabase table has RLS on with no policies. The anon key reads nothing; only the server's service-role key can |

Payment ids, session ids and internal row ids never appear in the PDF. Security headers, including a CSP scoped to Razorpay, are set in `next.config.ts`.

---

## Deployment (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add all environment variables under **Settings → Environment Variables**.
3. Commit `data/dataset.json` so it ships with the build, or set `DATASET_PATH` to a mounted volume.
4. Deploy. `pdfkit` is declared in `serverExternalPackages`, so it runs on the Node runtime.
5. Add the Razorpay webhook pointing at the deployed URL.

Analytics and audit writes are scheduled with Next's `after()`, so they run once the response has
been sent and still complete before the serverless function freezes. A plain unawaited promise
would be killed there, and the dashboard would quietly under-report.

Because sessions are stateless and signed, the app scales horizontally with no shared session store. The **rate limiter is per-instance**; move it to Redis before running many instances.

### Scaling past JSON

The current dataset is ~510 KB (13,292 rows) and evaluates in 2–9 ms. A full multi-year JoSAA archive is roughly 200k rows — about 8 MB and ~150 ms per query. If you reach that point, move `rows` into Postgres with an index on `(institute_type, category, close_rank)` and push the eligibility filter into SQL. `src/lib/dataset.ts` is the only file that would change; the engine and routes read through its interface.

---

## Project structure

```
scripts/import-josaa.mjs    Importer: parse, validate, normalise, report
data/dataset.json           Generated. Server-side only
data/institute-meta.json    Optional institute -> state map
supabase/schema.sql         Tables, RLS and the admin reporting functions

src/middleware.ts           Visitor id + first-touch attribution cookies

src/lib/
  types.ts                  Domain types
  dataset.ts                Loader + indexes (server-only)
  eligibility.ts            Rank matching, confidence bands, sorting
  session.ts                Signed sessions, hasAccess(), requirePaidSession()
  razorpay.ts               Orders, signature and webhook verification
  supabase.ts               Thin PostgREST client (no SDK)
  db.ts                     Users, grants, payments, visits, events, audit
  contact.ts                Email and phone normalisation — the restore credential
  attribution.ts            UTM, referrer classification, device parsing
  admin.ts                  Admin password check and signed admin session
  format.ts                 Shared display helpers
  validation.ts             Zod schemas
  ratelimit.ts              Per-IP limits

src/app/api/
  search, results, options, session, choice-list/pdf
  account                   Capture email + phone before payment
  access/restore            Get back in on a new device
  payment/order, verify, webhook
  track                     Page view and funnel beacon
  admin/                    login, stats, users, users/[id], access,
                            payments, visits, audit, export

src/components/             FindForm, Paywall, ResultsView, ProgramPicker,
                            Sheet, RankRuler, RestoreForm, Analytics
src/components/admin/       AdminApp, AdminLogin, AdminOverview, AdminUsers,
                            AdminPayments, AdminVisitors, AdminGrant, shared
src/content/pages.ts        Informational and legal page copy

tests/eligibility.test.ts   21 tests — rank matching
tests/contact.test.ts       11 tests — restore credential normalisation
tests/attribution.test.ts   12 tests — traffic source classification
```

---

## Testing

```bash
npm test
```

52 tests across four files.

**Eligibility (21).** The boundary cases that matter: exact closing rank, one rank worse,
Advanced-only and Main-only routing, IISc's Advanced exception, reserved-category seats without a
category rank, OPEN seats for reserved-category students, PwD rank lists, gender pools, home-state
quota and sort order.

**Contact normalisation (11).** The highest-stakes tests here. If normalisation is not
deterministic, a student who typed `+91 98765 43210` at checkout and `9876543210` on the restore
page is treated as two different people, and the one who paid cannot get back in. Ten ways of
writing the same number must all collapse to one stored value.

**Attribution (12).** That a `utm_source=instagram` link is filed as social rather than direct,
that self-referrals are not counted as a source, and that crawlers stay out of your traffic.

**Round selection (8).** That choosing one round returns each seat exactly once. Every seat is
published once per counselling round, so with two rounds loaded an unfiltered search returns each
one twice — which would double the match count the paywall is asking a student to pay against.

Manual checks worth repeating before a release:

- With DevTools, set any cookie or local value you like and call `/api/results` — it must return 402.
- Pay in test mode, then replay the same `/api/payment/verify` body in a fresh session — it must fail on order mismatch.
- Load `/results` directly without paying — it must redirect to `/find`.
- Load `/admin` signed out — it must show only the password form, with no admin markup in view-source.
- Pay in test mode, clear all cookies, then restore with the same email and mobile number.
- Grant access to a fresh email and phone from the admin panel, restore with it, then revoke and reload `/results` — access must drop within 30 seconds.
- Run the whole flow at 360 px width and confirm every control is reachable one-handed.

---

## What you still need to provide

1. **Razorpay keys** (test first, then live after KYC).
2. **A session secret** — `openssl rand -hex 32`.
3. **A Supabase project**, with `supabase/schema.sql` run against it. Without it nobody can restore access on a second device.
4. **An admin password** — `ADMIN_PASSWORD`, at least 10 characters.
5. **A Razorpay webhook secret**, and the webhook configured. See [Webhook](#webhook-the-safety-net).
6. **Business contact details** for the Contact page, in `src/content/pages.ts`. Razorpay will not approve live mode without them.
7. **A privacy policy that matches reality.** You now collect email addresses and phone numbers. `src/content/pages.ts` needs to say what you store, why, how long for, and how someone asks for deletion.
8. **Institute locations** in `data/institute-meta.json`. Strongly recommended now rather than optional — see below.
9. **Optionally, further rounds and years.** Rounds 1 and 6 for 2025 are loaded, and the search defaults to the latest round held. Import more with `--append`; no code change is needed, because the default round is read from the data.

### Why institute locations now matter

The dataset holds 6,940 Home State and Other State rows, plus Goa, J&K and Ladakh quotas. Without a state map the tool cannot tell whether an HS row applies to a given student, so it keeps those rows and marks them as home-state dependent.

The effect is visible at weaker ranks. A JEE Main AIR of 400,000 currently returns 8 options, all of them NIT Manipur home-state seats — genuinely available to a Manipur candidate and useless to anyone else. Filling in `data/institute-meta.json` makes that filter exact.

---

## Licence and attribution

Cutoff figures are published by the Joint Seat Allocation Authority (JoSAA). This project is not affiliated with JoSAA, the NTA or any participating institute. Acknowledge the source wherever the data is displayed.
