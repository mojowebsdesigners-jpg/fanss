# Lumina — Single-Creator Premium Fan Platform

A production-grade, crypto-native subscription platform built around **one creator** and **many fans**: subscriptions, PPV, tips, paid messages, bundles, a private media vault, notifications, analytics and a full admin console.

> Original product & branding. Fanvue/OnlyFans are referenced for product category only — no assets, colors or UI were copied.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js Route Handlers (server-side business logic only) |
| Database | Supabase PostgreSQL with RLS on every table |
| Auth | Supabase Auth (email/password, session refresh in middleware) |
| Storage | Supabase Storage — private `vault` bucket, short-lived signed URLs |
| Payments | NOWPayments (hosted invoices + IPN webhooks), abstracted provider interface |
| Email | Resend (optional, gracefully disabled without key) |
| Jobs | Vercel Cron → `/api/cron/daily` (03:00 UTC) |
| Hosting | Vercel-ready (see `vercel.json`) |

## Architecture

```
NEXT.JS (App Router)
   ├─ Server Components → read via cookie-bound Supabase client (RLS applies)
   └─ Route Handlers    → business logic via service-role client (verified, atomic)
        ├─ lib/payments/*   provider abstraction + idempotent fulfillment
        ├─ lib/access.ts    single source of truth for media/post authorization
        └─ lib/notify.ts    in-app + email notifications
SUPABASE (Auth + Postgres + Storage)
CRYPTO PROVIDER (NOWPayments) → signed webhook → verification → fulfillment
```

### Critical business rules (enforced in code + schema)

1. A subscription activates **only** after a verified provider webhook / authenticated status poll — never on frontend success.
2. PPV, tips, bundles and paid messages record **only** after `payments.status = completed` via `completePayment()`.
3. Webhook processing is **idempotent**: DB-level guards (`neq status completed`), unique constraints (`unique(user_id, post_id)`, `unique(payment_id)`) and upserts make retries harmless.
4. The `vault` bucket is **fully private**; every byte is served through `resolveMediaAccess()` → 10-minute signed URLs.
5. Frontend state is never trusted: every API re-checks auth, role and ownership.
6. Purchases (PPV/bundles/messages) **survive subscription expiry** — enforced in `can_access_post()`.
7. The creator is a **singleton** (`creator_profiles` max 1 row via check constraint).
8. No secrets in the repo — `.env` is git-ignored; `.env.example` documents every variable.

## Database

Migrations live in `supabase/migrations/` (plain SQL, ordered, idempotent):

- `0001_core.sql` — profiles/roles, creator singleton, plans, subscriptions, vault, posts, engagement, bundles, promotions, referrals, payouts, helpers, RLS, triggers, updated_at.
- `0002_commerce.sql` — payments ledger, purchase tables, messaging, notifications, moderation, analytics tables, **`can_access_post()`** access-control function, RLS.
- `0003_seed.sql` — storage buckets + policies, seed creator/admin/plan/starter content/promotion.

### Seeded accounts (change the passwords immediately)

| Role | Email | Password |
|---|---|---|
| Creator | `creator@lumina.local` | `Creator#2026!` |
| Admin | `admin@lumina.local` | `Admin#2026!` |

Fans self-register at `/signup` (`?ref=username` is captured for referral tracking).

## Setup

```bash
git clone <your-repo> lumina && cd lumina
npm install
cp .env.example .env      # fill in the values
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (server) | **never** expose to the browser |
| `PAYMENT_PROVIDER_API_KEY` | for real payments | NOWPayments API key |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET` | for real payments | NOWPayments **IPN secret** (not the API key) |
| `PAYMENT_PROVIDER` | optional | `sandbox` or `production` |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional | transactional email |
| `NEXT_PUBLIC_APP_URL` | ✅ | e.g. `https://yourdomain.com` (used in invoice callbacks) |
| `CRON_SECRET` | ✅ (prod) | bearer token for `/api/cron/daily` |
| `BOOTSTRAP_*` | one-time | only if you use the bootstrap script flow |

Without payment keys the app runs on a **mock provider** with a sandbox checkout page (`/pay/mock`) that drives the real fulfillment pipeline — perfect for testing the lifecycle end-to-end without fake states.

### Apply the database migrations

Pick one:

```bash
# A) Supabase CLI
npx supabase link --project-ref <project-ref>
npx supabase db push

# B) psql
psql "$DATABASE_URL" -f supabase/migrations/0001_core.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_commerce.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_seed.sql

# C) Supabase Dashboard → SQL Editor → paste each file in order
```

Then verify:

```bash
npm run bootstrap
```

### Storage

The seed creates three buckets:

- `avatars` — public; users may write only under `auth.uid()/`
- `branding` — public read; creator/admin write
- `vault` — **private**; creator reads/writes only their own `uid/` folder, admin allowed; nothing public. All fan-facing access is mediated by signed URLs from `resolveMediaAccess()`.

## Payments

`lib/payments/provider.ts` defines the interface; `nowpayments.ts` and `mock.ts` implement it.

- **Checkout**: `POST /api/payments/{subscribe|ppv|tip|bundle|message}` → creates a `pending` payment row → asks the provider for a hosted invoice → returns `invoiceUrl`.
- **Confirmation**: provider POSTs to `/api/payments/webhook`. The handler verifies the `x-nowpayments-sig` HMAC-SHA512 signature (sorted keys, IPN secret), logs every delivery to `webhook_deliveries`, records `payment_events`, and triggers fulfillment **exactly once**.
- **Polling fallback**: `/payment/[id]` polls `/api/payments/status?id=…`, which re-checks the authoritative status server-side (`GET /v1/invoice/{id}`) — so activation works even if a webhook is missed.
- **No frontend trust**: success redirects alone never unlock anything.

Configure the IPN callback URL in your NOWPayments account: `https://YOURDOMAIN.com/api/payments/webhook` (also sent per-invoice as `ipn_callback_url`).

## Vercel deployment

1. Push to GitHub; import the repo in Vercel.
2. Add all env vars (Production + Preview).
3. `vercel.json` registers the daily cron (03:00 UTC) calling `/api/cron/daily` with `Authorization: Bearer $CRON_SECRET` — set `CRON_SECRET` in Vercel.
4. Set the webhook URL in your payment provider to `https://yourdomain.com/api/payments/webhook`.
5. Deploy. Build passes with `next build`; no extra build config needed.

## Feature map

| Area | Where |
|---|---|
| Landing page | `/` (hero, featured content, membership, FAQ) |
| Creator profile | `/creator` (tabs, subscription card, locked previews) |
| Feed | `/feed` + infinite scroll via `/api/posts` |
| Post detail | `/post/[id]` — access-checked media, like/save/comment/report |
| Subscribe | `/subscribe` (+ promo codes) |
| Tips | Tip modal → `/api/tips` |
| Messaging | `/messages` — free & paid media, read state, unlock flow |
| Media vault | `/creator/vault` — upload (drag&drop), folders, tags, search, bulk ops |
| Composer | `/creator/content` — post/PPV/schedule/draft, pin/feature/archive |
| Studio | `/creator/dashboard`, subscribers, PPV, tips, payments, analytics (recharts), bundles, promotions, settings |
| Fan library | `/purchases` (PPV, bundles, paid messages), `/payment-history`, `/saved` |
| Notifications | `/notifications` + bell |
| Admin | `/admin` — overview, users, content, payments, reports, audit log, settings |
| Compliance | age gate, `/terms`, `/privacy`, `/dmca`, `/guidelines`, maintenance mode |

## Testing the payment lifecycle

1. Sign up as a fan, subscribe → sandbox checkout → *Simulate successful payment* → subscription activates, notification appears, subscriber content unlocks.
2. Try the other outcomes (fail/expire) — nothing unlocks, status shows on the receipt page.
3. Re-run the same webhook five times (or simulate twice) — exactly one subscription/purchase/tip is created.
4. Buy a PPV post, then let the subscription expire (or cancel) — the PPV remains accessible in `/purchases`.
5. As creator, send a paid message; as fan, unlock it — media stays locked until the payment verifies.

## Security notes

- Every sensitive endpoint re-validates session, role and ownership server-side.
- Rate limiting on auth, messaging, comments, likes, uploads, payments, reports, broadcasts.
- Payment webhooks: signature check, event logging, dedup, retry-safe.
- Security headers (CSP, nosniff, frame-deny, referrer, permissions) in `next.config.ts`.
- Service-role key never crosses the `NEXT_PUBLIC_` boundary.
- In-memory rate limiter is per-instance; swap in Redis for multi-region scale.

## Production checklist

- [ ] Change seeded creator/admin passwords (or delete the seeded users and re-create).
- [ ] Set real NOWPayments keys + IPN secret; switch `PAYMENT_PROVIDER=production`.
- [ ] Confirm provider supports your jurisdiction & content category (adult content is restricted on many processors — verify BEFORE launch).
- [ ] Set `NEXT_PUBLIC_APP_URL` to the final domain; update CSP `form-action` if needed.
- [ ] Set `CRON_SECRET`; verify cron hits with auth.
- [ ] Complete provider KYC / payout setup; review settlement currency.
- [ ] Review age/compliance obligations per target market (18 U.S.C. §2257 or local equivalent) — the data model separates verification records; integrate a proper verification vendor before allowing adult uploads.
- [ ] Run `npm run build` in CI; keep `typecheck` green.
- [ ] Rotate any keys that were ever pasted into chats/tickets.
