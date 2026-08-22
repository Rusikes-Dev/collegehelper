# What changed in this round of work

Everything below is in the repo. **52 tests pass, TypeScript is clean, and
`next build` succeeds** (41 routes).

---

## 1. Round 6 data imported

`data/dataset.json` now holds **25,236 rows across 2025 rounds 1 and 6**
(13,292 + 11,944), 138 institutes, 294 programmes.

```
Imported  11,944 records
Skipped   0
Warnings  10        (PwD mixed rank lists — expected, handled)
Errors    1         (JoSAA's trailing blank row — harmless)
```

I verified the file was round 6 by reading the selected `<option>` values in the
saved page rather than trusting the filename: **Year 2025, Round 6, Instype ALL**.

**Sanity check:** round 6 closing ranks are looser than round 1 on **72.4%** of
the 11,218 seats present in both. That is the shape later rounds should have, and
it is the fastest way to catch a mislabelled import.

### A bug this found in the importer

`mergeWithExisting()` pushed only **10 columns** on the `--append` path, silently
dropping `mixedRankLists` (column 11). Every appended round would have un-hidden
the incomparable PwD opening ranks the importer works hard to detect. Round 6 has
10 such rows. Fixed, and the merged file now verifies at 11 columns on all 25,236
rows.

### The design problem round 6 created

The eligibility engine had no round filter. Every seat is published **once per
round**, so with two rounds loaded an unfiltered search returned each seat twice.
Measured against the real data, at a JEE Main AIR of 50,000:

| Rounds | Rows scanned | Matches | Distinct seats |
| --- | --- | --- | --- |
| Round 6 only | 11,944 | 368 | 368 |
| All rounds | 25,236 | **707** | **422** |

285 phantom results, and a paywall count reading almost double the truth — on the
number a student decides whether to pay against.

So round selection is now wired end to end:

- `src/lib/rounds.ts` — `rowsForRounds()`, pure and unit-tested
- `searchSchema` accepts `rounds`; **defaults to the latest round held**, read
  from the data rather than hard-coded
- `/api/search` and `/api/results` both apply it; sessions minted before this
  existed fall back to the latest round rather than breaking
- A **round chip group** on the search form, with an explicit *Compare all
  rounds* option that warns the list will repeat programmes
- A **round filter** in the results filter sheet, shown only when the search
  spans more than one round

**Loading round 7 later needs no code change** — import with `--append` and the
default moves.

---

## 2. Custom 404, and two error boundaries

`not-found.tsx`, `error.tsx`, `global-error.tsx`.

All three lead with the same line: **if you have paid, your access is safe**, and
link to `/restore`. A paid student guessing at URLs is the arrival that costs
money, and "something went wrong" turns a transient fault into a refund request.
`global-error.tsx` is fully inline-styled — it renders when the layout that
imports `globals.css` is the thing that failed.

---

## 3. CTA above the fold

The hero now opens with a **single rank field** (`HeroRankCta`) instead of a bare
button. It asks for the one thing the visitor already has to hand, and carries
the value into `/find?rank=…` so the first field arrives filled. Hero padding and
copy were tightened so the input clears the fold at 360×640.

`/find` reads the parameter inside a **Suspense boundary** — without it,
`useSearchParams` forces the whole route out of static rendering.

---

## 4. Meta titles and descriptions on every page

Every route now has both. `/results`, `/admin` and `/thank-you` are
`noindex` — and `/thank-you` is noindexed at the **header** level too, in
`next.config.ts`, so a "payment successful" page can never surface for someone
who has not paid.

Also added: `googleBot` directives, `formatDetection: { telephone: false }`
(iOS was turning ranks into phone links — ranks are the entire content of this
site), Organization + ContactPoint JSON-LD, and BreadcrumbList on content pages.

---

## 5. Favicon

Real files, generated at 4× and downsampled so the monogram stays legible at 16px:

| File | Purpose |
| --- | --- |
| `src/app/favicon.ico` | 16/32/48/64/128/256 in one file |
| `src/app/apple-icon.png` | 180px, squared — iOS rounds it itself |
| `public/icon-192.png`, `icon-512.png` | PWA |
| `public/icon-maskable-512.png` | Android's circular crop, with safe-zone padding |

Wired into `metadata.icons`, the manifest, a long `Cache-Control`, and excluded
from the middleware matcher so they stop costing an invocation each on Vercel.

---

## 6. sitemap.xml

Rewritten. `/pay` added; `/thank-you`, `/results`, `/admin` and `/api/*`
deliberately excluded. Priorities are relative rather than decorative: the two
routes that convert sit above the explainers, which sit above the legal pages.
`robots.ts` now reads from the shared config and declares `host`.

---

## 7. Mobile breakpoints

Four widths, each earning its place rather than being a round number:

- **380px** — the floor. Budget Android handsets, and the width the whole flow
  must work at one-handed.
- **480px** — where two controls stop fitting on a row. Stat tiles drop to two
  columns; the results action bar goes to two rows rather than three ~100px buttons.
- **720px** — phone to tablet; sheets become centred dialogs.
- **1024px** — comfortable reading measure.

Plus a **landscape rule**: under 460px of height the sticky bar stands down and
the header unsticks, or a sideways phone has under 200px of content left.

---

## 8. Sticky mobile CTA

`StickyCta`, phones only, hidden on `/find`, `/results`, `/pay`, `/thank-you`,
`/restore` and `/admin` — those either have their own bottom bar or are
mid-transaction, and nudging someone sideways during checkout loses the checkout.

It watches the hero CTA with an `IntersectionObserver` and only appears once that
has scrolled away, so nobody is shown a second copy of a button already on screen.
It animates rather than unmounting, so page height does not change under a
scrolling thumb, and the footer gains bottom padding while it is up.

---

## 9. Loading states

`loading.tsx` for `/`, `/find`, `/results`, `/restore`. Skeletons shaped like the
content they replace, so nothing jumps on arrival. `/results` adds a line of
reassurance — a blank screen straight after payment is the moment a student
decides the money is gone.

---

## 10. Form error states

New `ErrorSummary` component, used by the search and restore forms.

Per-field messages alone do not work on a phone: the form is taller than the
screen, so a failed submit can look like nothing happened. The summary appears at
a fixed place, says how many fields need attention, links to each one, and takes
focus so a screen reader announces the whole list rather than just the first
error. Restore's field ids were renamed (`r-email` → `email`) so the anchors work.

---

## 11. Thank-you page

`/thank-you`, reached after the standalone checkout.

It checks the **real access grant** rather than assuming arrival means success —
so a student whose payment is still settling is told to restore, not congratulated.
Most of the page is about *tomorrow*: access follows you not this phone, re-running
is free, export the PDF before you fill choices. Plus a "money taken but nothing
unlocked?" panel pointing at `/restore` first and your email second.

---

## 12–13. Privacy policy and terms

Both now carry your real support address, plus:

- **Privacy** — a "who to contact" block and a concrete response-time commitment
- **Terms** — a governing-law clause (India) and a "how to reach us" block
- **Refunds** — the real address instead of "contact us"

---

## 14. Cookie banner

`CookieBanner` — and it **does not render unless a GA id is configured**. A
consent dialog for cookies you do not set is theatre that costs conversions. The
session cookie and visitor id are strictly necessary and first-party.

Reject is a real reject and the same size as accept. Ignoring or dismissing counts
as no consent, so nothing loads. Fails closed when `localStorage` throws in
private browsing.

---

## 15. Analytics installed

`ThirdPartyAnalytics`, alongside the first-party tracking that always runs.

- **Plausible** — cookieless, loads immediately, no banner (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`)
- **GA4** — cookies, so it does not load until someone actively accepts
  (`NEXT_PUBLIC_GA_ID`). Configured with `anonymize_ip`, and Google Signals and ad
  personalisation both **off** — this is a tool for school leavers.

Both off unless the env var is set. CSP in `next.config.ts` updated to allow both,
unconditionally, so the header cannot differ between environments.

---

## 16. Real contact information

`rushikeshlade3014s@gmail.com`, wired through `src/lib/site.ts` — one place to
change. It now appears in the footer, the contact page, privacy, terms, refunds,
the error boundary, the thank-you page, `/pay`, and the Organization schema. The
content renderer turns it into a real `mailto:` link wherever it appears in copy,
because an address you have to select and copy on a phone is one most people
will not use.

`site.ts` also has empty slots for `phone`, `addressLines` and `legalName` — every
render checks for an empty string first, so blanks are omitted rather than printing
`undefined` on a legal page.

---

## 17. Easy payment page

`/pay` — a one-screen checkout: three fields and a button. No result counts, no
feature comparison. Someone arriving here has already decided to pay, usually from
a link you sent them after a failed checkout, and every extra element is another
chance to lose them.

It works **before any search has been run**, via `POST /api/session/start`, because
access belongs to the person rather than to a search. It never overwrites an
existing session — doing so could orphan a pending `orderId` and charge someone
twice. It reuses the same three endpoints as the paywall, so there is one payment
path in the product rather than two that drift apart. Someone who already has
access is recognised and told so instead of being charged again.

The blank-session convention was lifted out of the restore route into
`session.ts` (`EMPTY_STUDENT`, `EMPTY_PREFS`, `hasRealSearch()`) so both routes
share one definition.

---

## Before you deploy

1. Set **`NEXT_PUBLIC_SITE_URL`** in Vercel. It is still `https://example.com` by
   default, and canonical tags, the sitemap and Razorpay all read it.
2. Commit `data/dataset.json` — it ships with the build.
3. Optionally set `NEXT_PUBLIC_GA_ID` and/or `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.
4. Fill in `phone`, `addressLines` and `legalName` in `src/lib/site.ts` if you
   have them; Razorpay's live-mode review looks for a business address.
5. Re-run the Razorpay webhook check — `/pay` creates orders the same way, so no
   new configuration, but it is worth confirming after any payment change.
