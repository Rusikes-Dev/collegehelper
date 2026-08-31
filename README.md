# CollegeHelper.xyz

MHT-CET college information and college predictor for Maharashtra.

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Razorpay · Vercel.

---

## 1. Install

```bash
git clone <your-repo> collegehelper
cd collegehelper
npm install
cp .env.example .env.local     # then fill it in, see section 6
```

Python 3.10+ is needed only for the cutoff extractor:

```bash
pip install pymupdf
```

## 2. Run locally

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

## 3. Configure Supabase

1. Create a project at supabase.com.
2. Open **SQL Editor** and run the migrations **in order**:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_predictor.sql`
3. Copy **Project Settings → API** values into `.env.local`.
4. Create your admin login under **Authentication → Users → Add user**, then
   promote it (replace the email):

   ```sql
   insert into admin_users (id, email, role)
   select id, email, 'superadmin' from auth.users where email = 'you@example.com';
   ```

Optional but recommended — generate real database types so every query is
column-checked:

```bash
npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
```

Then swap `any` for the generated `Database` type in `src/lib/supabase/admin.ts`.

## 4. Configure Razorpay

1. Create an account and get **Key ID** and **Key Secret** (test mode first).
2. Put them in `.env.local`.
3. Add a webhook pointing at `https://your-domain/api/payment/webhook`, subscribed
   to `payment.captured`, `payment.failed`, `refund.processed`. Copy the webhook
   secret into `RAZORPAY_WEBHOOK_SECRET`.

The webhook is not optional. It is what grants access when the payment succeeded
but the browser callback never arrived — closed tab, dead network, killed app.

## 5. Deploy to Vercel

1. Import the repo at vercel.com.
2. Add every variable from `.env.example` under **Settings → Environment Variables**.
   `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`
   must **not** be prefixed `NEXT_PUBLIC_`.
3. Deploy, then point `collegehelper.xyz` at it under **Settings → Domains**.
4. Update the Razorpay webhook URL to the live domain.

## 6. Environment variables

See `.env.example`. Note what is *not* there: the predictor price and its
FREE/PAID mode are database settings, changed from `/admin` without a deploy.

## 7. Database migrations

Plain SQL files in `supabase/migrations`, applied in filename order. There is no
migration runner — paste them into the Supabase SQL editor, or use the Supabase
CLI if you prefer. Add new ones as `0004_*.sql` and never edit an applied file.

## 8. Import cutoff data

```bash
# 1. Extract from the official PDFs
python3 scripts/extract_cutoffs.py --out ./data --year 2026-27 \
  --pdf "CAP Round I=/path/2026ENGG_CAP1_MH_CutOff_V1.pdf" \
  --pdf "CAP Round II=/path/2026ENGG_CAP2_MH_CutOff.pdf" \
  --pdf "CAP Round III=/path/2026ENGG_CAP3_MH_CutOff.pdf"

python3 scripts/decode_seat_types.py --data ./data
python3 scripts/derive_locations.py  --data ./data

# 2. Check data/anomalies.json is empty before going further.
#    Anything the parser could not align is reported there rather than guessed.

# 3. Load into Supabase
npm run import:cutoffs -- --data ./data --year 2026-27
```

The importer is idempotent. It upserts colleges, branches and programs, and
replaces cutoff rows **per dataset**, so re-importing a corrected Round II
leaves Rounds I and III untouched.

Colleges and datasets import **unpublished**. Nothing appears on the site or in
predictor results until you publish it. That is deliberate: the city values are
derived from institute names and need a human eye first.

Publish a dataset:

```sql
update cutoff_datasets set is_published = true where academic_year = '2026-27';
```

See `DATA_PIPELINE.md` for what the extractor does and the five traps in the
source PDFs it handles.

## 9. Add a college page

College pages are hand-written records in `src/data/colleges.ts`, not database
rows. Copy the existing block, edit it, save. The page, the Search entry and the
sitemap all follow. See `EDITING.md`.

The database still holds every college in the cutoff data, and the predictor
still searches all of them; `src/data/colleges.ts` is only the set that has a
written-up page.

## 10. Add a new academic year

1. Run the extractor with the new PDFs and `--year 2027-28`.
2. Run the importer with the same `--year`.
3. Publish the new datasets.
4. In `/admin/settings`, set **Active academic year** to `2027-28`.

No code change, no migration, no redeploy. Old years stay in the database and
stay labelled with their own year and round — 2026 and 2027 data are never mixed.

## 11. Make the predictor FREE or PAID

`/admin/settings` → **College Predictor** → `FREE` / `PAID`. Takes effect
immediately for everyone.

The paywall is enforced in one place, `src/app/api/predictor/results/route.ts`.
When locked, the result rows are never serialised into the response — the caller
gets counts only, so the paid content cannot be pulled out of the network tab.

## 12. Change the price

`/admin/settings` → **Price** → enter rupees. Stored as paise (49 → 4900).
The amount sent to Razorpay is read server-side, so a tampered client cannot
pay ₹1 for a ₹49 product.

## 13. Grant access manually

`/admin/users` → **Grant access manually** → email + phone → Grant access.
Creates the user if needed. Useful when a payment succeeded but the callback
did not land.

Access is a grant with a source (`payment` / `admin` / `promo` / `free_mode`),
never a boolean on the user. Revoking sets `revoked_at` rather than deleting,
so the audit trail survives.

## 14. View analytics

`/admin/analytics`. First-party only: no third-party script, no personal data
beyond an anonymous browser id, and only the referring *host* is stored, which
is enough to separate Instagram traffic from search without recording where an
individual came from.

## 15. Architecture notes

```
src/
  app/
    api/            route handlers — the only place secrets are used
    admin/          admin panel, gated by requireAdminPage()
    colleges/       directory + one reusable [slug] template
    college-predictor/
  components/
    predictor/      multi-step flow, results, payment step
    ui/             shared primitives
  lib/
    predictor.ts    banding logic — pure, no I/O, unit-testable
    settings.ts     runtime settings from the database
    access.ts       signed cookie + access_grants
    razorpay.ts     order creation and signature verification
```

Three rules the code follows throughout:

- **Percentile and rank never convert into each other.** The source publishes
  both; deriving one from the other would be a guess presented as data.
- **Nothing is invented.** Missing fees, placements or campus details render as
  gaps, not estimates.
- **Server decides.** Price, access and payment validity are all determined
  server-side. The browser is never trusted.

## 16. Still needs your configuration

- Real Supabase project, keys and migrations applied.
- Real Razorpay account, keys and a live webhook URL.
- `ACCESS_TOKEN_SECRET` — generate with `openssl rand -base64 32`.
- Your admin user promoted in `admin_users`.
- Support email in `src/app/contact/page.tsx` (currently a placeholder).
- An Open Graph image at `public/og.png` for Instagram link previews.
- Review and publish colleges; verify the derived city values.
- The three SQL migrations have not been run against a live Postgres — apply
  `0001` to a scratch project first.
