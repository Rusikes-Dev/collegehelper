# College Helper — collegehelper.xyz

Static site for Indian competitive exams (JEE, NEET, UPSC, SSC, banking, CAT, CLAT, GATE,
CUET, MHT CET) with paid MHT CET and NEET college predictors, built for free hosting on
Cloudflare Pages.

## What is in this folder

| Path | What it is |
|---|---|
| `site/` | The built website. This is what Cloudflare serves. |
| `src/` | The site generator. `python3 src/build.py` rebuilds `site/` from the data files. |
| `src/data/` | All content: exams, guides, config. The admin panel edits these via `overrides.json`. |
| `functions/` | Cloudflare Pages Functions — the payment API (Razorpay) and dataset delivery. |
| `private-data/` | The two paid cutoff datasets. **Not** part of the public site; you upload them to Cloudflare KV once via `/admin/data.html`. |

**Keep the GitHub repository PRIVATE.** `private-data/` contains the paid datasets.

## One-time setup (full click-by-click steps are in the chat message that came with this zip)

1. **GitHub** — create a *private* repo, upload everything in this folder.
2. **Cloudflare Pages** — create a Pages project from that repo with:
   - Build command: `python3 src/build.py`
   - Build output directory: `site`
   - Environment variable (build): `PYTHON_VERSION` = `3.12`
3. **KV** — create a KV namespace, bind it to the Pages project as `CH_KV`
   (Settings → Bindings → KV namespace).
4. **Environment variables** (Settings → Environment variables, Production — mark the
   secrets as *Secret*):
   - `RZP_KEY_ID` — from Razorpay Dashboard → Account & Settings → API Keys
   - `RZP_KEY_SECRET` — same place (secret)
   - `ADMIN_SECRET` — any long random string you invent (secret)
   - `PRICE_CET` — price in rupees, e.g. `49`
   - `PRICE_NEET` — price in rupees, e.g. `49`
5. **Redeploy** (Deployments → Retry/Redeploy) so bindings and variables take effect.
6. **Upload the datasets** — open `https://<your-project>.pages.dev/admin/data.html`,
   paste your `ADMIN_SECRET`, upload `private-data/cet-cutoffs.json` and
   `private-data/neet-cutoffs.json`.
7. **Domain** — add `collegehelper.xyz` to Cloudflare (Free plan), set the two Cloudflare
   nameservers at Spaceship, then Pages project → Custom domains → add the domain.
8. **Protect `/admin`** — Cloudflare Zero Trust → Access → add a self-hosted application
   for `collegehelper.xyz` path `admin*`, policy allowing only your email.

## Changing the price

Two places must match:

1. `PRICE_CET` / `PRICE_NEET` environment variables — **this is the amount actually charged**.
2. `"price"` in `src/data/config.py` (TOOLS) — this is only what the marketing pages and
   structured data display.

Change both, redeploy.

## Test payments before going live

Put your Razorpay **test mode** keys into the env vars first. Pay with test card
`4111 1111 1111 1111`, any future expiry, any CVV. When everything works, swap in the
live keys and redeploy. (Live mode requires completed Razorpay KYC.)

## Day-to-day content editing

Open `https://collegehelper.xyz/admin/` (default passcode `changeme` — change it in
Settings, and rely on Cloudflare Access for real protection). Edit exams, dates, alerts,
guides, the calendar and the homepage board. The Publish tab commits
`src/data/overrides.json` to your repo using a GitHub fine-grained token
(Contents: Read and write, this repo only); Cloudflare rebuilds automatically in ~1 minute.

To refresh a predictor dataset later: replace the file in `private-data/`, then re-upload it
from `/admin/data.html`. No rebuild needed.

## How the paywall works

- Datasets live in Cloudflare KV, not in the public folder, so they cannot be fetched
  without paying (same principle as the original Vercel + Supabase version).
- `POST /api/create-order` makes a Razorpay order server-side (amount cannot be tampered).
- After checkout, `POST /api/verify-payment` verifies the Razorpay HMAC signature with your
  key secret and mints a lifetime access token in KV.
- `GET /api/data/{cet|neet}` serves the dataset only with a valid token.
- `POST /api/restore-access` lets a buyer restore access on any device using the Razorpay
  payment ID from their receipt.
- The prediction itself still runs in the buyer's browser; ranks are never uploaded.

Free-plan limits are generous for this: 100,000 function requests/day and 100,000 KV
reads/day. One unlocked visitor ≈ a handful of requests.

## Local preview

```
cd site && python3 -m http.server 8000
```

Pages and the admin panel work locally; payments and dataset delivery only work on the
deployed Cloudflare site (they need Functions + KV).
