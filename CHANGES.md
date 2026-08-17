# What changed

A summary of this round of work, so you can review it in order rather than
reading a diff. Everything below is in the repo and builds; 44 tests pass.

---

## 1. Email and phone before payment

The paywall now takes an optional name, an email address and a mobile number on
the same screen as the value summary, so it is still one tap to pay.

- `src/lib/contact.ts` normalises both. Ten ways of writing the same Indian
  number all collapse to one stored value.
- `POST /api/account` saves the details and, if that pair already has access,
  says so and lets the student straight through without charging again.
- The details are prefilled into the Razorpay window, so UPI and OTP screens do
  not ask for them a third time.
- `POST /api/payment/order` refuses to create an order until they are present.

**Why before rather than after:** it is what makes restore possible, it stops
returning buyers being charged twice, and it means a payment that completes
after the browser dies can still be matched to a person.

---

## 2. Supabase

`supabase/schema.sql` creates six tables — `app_users`, `payments`,
`access_grants`, `visits`, `events`, `admin_audit` — plus the SQL functions the
admin dashboard reads through. Run it once in the Supabase SQL editor. It is
idempotent.

Every table has RLS enabled with **no policies**, so the anon key reads nothing.
Only the server, holding the service-role key, can touch them.

No Supabase SDK was added. `src/lib/supabase.ts` is a ~120-line PostgREST
wrapper, in keeping with how the rest of the project is built.

**If you skip this:** the site still runs and still takes payments. Access just
lives in the browser cookie, nobody can restore on a second device, and the
admin panel says so plainly instead of breaking.

---

## 3. Restore access

`/restore` — email and mobile number, one button.

The failure message is deliberately identical whether the account does not
exist, never paid, or has lapsed. Anything more specific would turn the page
into a way of testing whether a phone number belongs to a customer. It has the
tightest rate limit in the app: 8 attempts per 15 minutes.

Linked from the header, the footer, the paywall, the contact page and the
refund policy.

---

## 4. A model change worth a decision from you

**Access now belongs to the student, not to a single search.**

A payment writes a grant against the user. The cookie carries the user id; the
grant decides whether results are shown.

- Restoring works, because the grant outlives the cookie and the device.
- Re-running is free. Changing one branch and searching again costs nothing.
  On the old model that second search would have been charged, which is the
  largest source of refund requests on tools like this.
- Revoking works. Cancelling a grant locks the student out within 30 seconds
  even though their cookie still says paid.

`ACCESS_VALIDITY_DAYS` controls the length, default 365, `0` for never expires.

If you would rather sell one search at a time, the change is contained and the
README says where.

---

## 5. Admin panel

`/admin`, gated on the server. Set `ADMIN_PASSWORD` to switch it on.

| Tab | What it answers |
| --- | --- |
| Overview | Visitors → searches → paywall → contact → paid, each step showing conversion off the one before, so you can see *which* step loses people. Plus revenue, a daily chart, and breakdowns by source, medium, referring site, landing page, device and country. |
| Students | Search by email, phone or name. Open anyone for their payments, access history and first source. Grant, revoke, block. CSV export. |
| Give access | Grant by email and mobile number, any length or permanent. Creates the account if it does not exist. Audit log alongside. |
| Payments | Every order including abandoned ones — rows are written when the payment window opens, so checkout abandonment is visible. |
| Visitor log | Live arrivals, for the question a dashboard cannot answer. |

Password compared in constant time; `SameSite=Strict` signed cookie that embeds
a fingerprint of the password, so changing it revokes every open session; login
limited to 6 attempts per 15 minutes; excluded from robots, `X-Robots-Tag:
noindex`, and its own page views excluded from your traffic.

---

## 6. Visitor tracking with source

`src/middleware.ts` sets a random visitor id and pins **first-touch**
attribution for a year.

First touch matters: without it, every student who leaves and comes back via a
bookmark is re-attributed to "direct", and organic search looks like it converts
far worse than it does.

Self-referrals are excluded, `gclid` and `fbclid` are handled, bots are filtered,
and **no IP address is stored** — country comes from the edge header.

First-party throughout. No third-party analytics script is loaded.

---

## 7. Razorpay webhook

`/api/payment/webhook`, verified by HMAC over the raw body with a separate
webhook secret.

This closes the one real gap in the old flow. Students pay on phones, and UPI
apps routinely switch away from the browser without coming back; the money is
taken but `/api/payment/verify` is never called. Because contact details are now
captured before payment, the webhook can grant access with no browser involved,
and the student simply restores.

**Set this up before going live.** Instructions are in the README.

---

## 8. Mobile

- Bottom sheets can be swiped down to dismiss — grip only, so scrolling a long
  filter list cannot close them by accident.
- A thumb-reachable action bar on results (Filters · Choice list), replacing the
  Filters chip that scrolled off the top.
- `dvh` sheet sizing so iOS toolbars do not crop them; `overscroll-behavior` to
  stop scroll chaining.
- Installable to the home screen (`manifest.ts` + icon) — counselling runs over
  days and students come back repeatedly.
- Dark mode following the phone's own setting. Tokens only; no component knows.
- Tap highlight removed, 16 px inputs so iOS never zooms on focus, `inputMode`
  and `autoComplete` set correctly on every new field.

---

## 9. Bugs found and fixed along the way

These were found by testing rather than by reading, and three of them would have
been invisible in production:

1. **Attribution miscounted your most important channel.** A link tagged
   `utm_source=instagram` skipped referrer classification and recorded medium as
   `none`, landing in the same bucket as genuine direct traffic. Since Instagram
   and WhatsApp strip referrers, that is exactly how a student tool spreads.
2. **Background writes would have been dropped on Vercel.** Unawaited promises
   are killed when the function freezes, so analytics would have landed only
   intermittently and the dashboard would have quietly under-reported. Now
   scheduled with Next's `after()`.
3. **`handleError` swallowed deliberate 5xx.** A deployment missing its Razorpay
   keys told students "something went wrong on our side" and told you nothing.
4. **`access_until` reported expired grants**, so a lapsed student showed a
   stale expiry date. Caught by running the schema against a real Postgres.
5. A lowercased "indian" in a validation message.

---

## 10. Privacy policy

It previously said, accurately at the time: *"we do not ask for your name, email
or phone number."* That is no longer true, so it has been rewritten to say what
is collected, why, where it is stored, how long it is kept, who else sees it,
and how to ask for deletion. The contact and refund pages now point at Restore
access first.

**Please read this page before going live.** It is the one file here where being
wrong has consequences beyond a bug, and you may want your own wording.

---

## 11. Security headers

- Razorpay entries widened to `https://*.razorpay.com`. Their checkout hands off
  to bank and UPI subdomains that are not documented and do change, and a CSP
  that blocks one fails as a student who cannot pay and never tells you.
- Added `frame-ancestors 'none'` and HSTS.
- `form-action` left unset deliberately — bank redirects post to hosts that
  cannot be enumerated ahead of time.
- `X-Robots-Tag: noindex` on `/admin` and `/results`.

---

## What you need to do

1. Create a Supabase project and run `supabase/schema.sql`.
2. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASSWORD` to
   Vercel. See `.env.example` — it explains every variable.
3. Add the Razorpay webhook and `RAZORPAY_WEBHOOK_SECRET`.
4. Fill in your business contact details in `src/content/pages.ts`.
5. Read the privacy policy and adjust the wording to match how you actually
   intend to operate.
6. Deploy, then run the manual checks in the README's Testing section — in
   particular: pay in test mode, clear all cookies, and restore.
