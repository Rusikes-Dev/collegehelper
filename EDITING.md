# Editing the site

Five things you will change often. Each one is a single file, and none of them
needs a migration or a database change.

| What you want to change | File to open |
| --- | --- |
| Add a college page | `src/data/colleges.ts` |
| CET notices, key dates, explainers | `src/app/cet-updates/page.tsx` |
| Your email, WhatsApp, Instagram | `src/app/about/page.tsx` (the `CONTACT` block at the top) |
| Which branch goes in which group | `src/lib/branch-groups.ts` |
| Services wording | `src/app/services/page.tsx` (the `PLANNED` list) |

Predictor price and FREE/PAID still live in `/admin/settings`, not in code.

---

## 1. Add a college

Open `src/data/colleges.ts`. Copy the whole VJTI block, paste it below, and edit
it. The page, the entry in Search and the sitemap all appear on their own — you
never copy a page template.

```ts
{
  slug: 'coep-pune',              // becomes /colleges/coep-pune — must be unique
  name: 'Full official name, exactly as the CAP list prints it',
  shortName: 'What students call it',
  code: '06006',                  // 5-digit DTE institute code
  city: 'Pune',
  district: 'Pune',
  type: 'Government Autonomous',
  affiliation: null,              // null renders as "Not added yet"
  established: null,
  about: 'Two or three sentences. Only things you have checked.',
  website: null,
  admissionUrl: null,
  mapsUrl: null,
  programs: [
    { name: 'Computer Engineering', code: '0600624510', intake: null },
  ],
  cutoffYear: '2026-27',
  cutoffs: [
    { round: 'CAP Round I', program: 'Computer Engineering',
      seatType: 'GOPENS', closingRank: 71, closingPercentile: 99.9923062 },
  ],
  fees: null,
  placement: null,
  hostel: null,
},
```

**Leave anything you have not checked as `null`.** It renders as "not added yet",
which costs you nothing. One wrong fee figure costs more trust than ten blanks.

Where to get the numbers: the programme list and the cutoff rows are already in
`data/programs.csv` and `data/cutoffs.csv`, keyed by the institute code. Copy the
closing rank and the closing percentile across exactly as they appear, and never
work one out from the other.

## 2. Post a CET update

`src/app/cet-updates/page.tsx` starts with three lists: `NOTICES`, `KEY_DATES`
and `EXPLAINERS`. Add to the top of `NOTICES` for anything new. Leave a date as
`'To be announced'` until you have seen it on cetcell.mahacet.org yourself — a
wrong date is worse than no date, because someone will plan around it.

## 3. Move a branch between groups

`src/lib/branch-groups.ts` holds three regular expressions. The first group that
matches a branch name wins; anything unmatched falls into **Other**. Changing a
pattern updates the buttons in the form and the query behind them at the same
time, because both read this one file.

## 4. What the five tabs are

`src/components/nav/tabs.tsx` defines them. Changing a label or an icon there
changes it in the bottom bar on phones and the header on desktop at once.

## 5. Before you go live

- Real contact details in `src/app/about/page.tsx`. A student who cannot reach
  a person will not pay.
- `ACCESS_TOKEN_SECRET` in the environment: `openssl rand -base64 32`.
- Razorpay webhook pointed at `https://your-domain/api/payment/webhook`.
- An Open Graph image at `public/og.png` for link previews on Instagram.
