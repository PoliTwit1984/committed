# Commit Baseball MVP

AI recruiting intelligence MVP for high school baseball families.

This app ships:
- Marketing landing page + waitlist capture (`/`)
- Demo report generator powered by GPT-4o (`/demo`)
- Password-protected admin dashboard + CSV export (`/admin`, `/api/admin/export`)

## Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- shadcn/ui components
- react-hook-form + zod validation
- Supabase (primary persistence)
- OpenAI (`gpt-4o`) for report generation
- Resend for confirmation emails
- Vercel Analytics + custom event tracking (`waitlist_form_started`, `waitlist_form_completed`, `demo_form_started`, `demo_report_generated`)

## Local Setup
1. Install dependencies:
```bash
npm install
```

2. Export environment variables from the shared keys file before running:
```bash
set -a
source ~/.luna/secrets/keys.env
set +a
```

3. Start the app:
```bash
npm run dev
```

4. Run checks:
```bash
npm run lint
npm run build
```

## Environment Variables
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `ADMIN_PASSWORD_COMMIT` (used by middleware for `/admin` and `/api/admin/*`)

Optional:
- `RESEND_FROM` (default is `onboarding@resend.dev`)

## Architecture
- `app/page.tsx`: Landing page + trust-driven recruiting copy + waitlist CTA
- `components/waitlist-form.tsx`: client form + thank-you state with queue position
- `app/api/waitlist/route.ts`: validation, Supabase write, Resend confirmation
- `app/demo/page.tsx` + `components/demo-form.tsx`: demo UI and report rendering
- `app/api/generate-report/route.ts`: GPT-4o call and optional report persistence
- `app/admin/page.tsx`: dashboard metrics + recent records
- `app/api/admin/export/route.ts`: CSV export endpoint
- `middleware.ts`: basic auth gate for admin routes (`admin:<ADMIN_PASSWORD_COMMIT>`)
- `supabase/schema.sql`: canonical table schema for `waitlist` and `demo_reports`

## What Was Built
- Full landing page sections requested in spec (problem/solution/how it works/sample report/pricing)
- End-to-end waitlist submission with queue number response
- Confirmation email support via Resend
- Demo report generator with 30-60 second style loading progression
- Admin dashboard with counts, recent rows, and CSV export
- Domain-ready deployment config process for `commitrecruit.com` + `www.commitrecruit.com`

## What Was Skipped (and Why)
- Direct table migration to create `waitlist` and `demo_reports` is blocked by current `SUPABASE_DB_URL` auth failure (`Tenant or user not found`).
- To keep MVP shippable, waitlist persistence falls back to an existing Supabase table (`sashanoire_subscribers`) when `waitlist` is absent. Admin waitlist views/CSV use the same fallback path.
- Demo report persistence remains optional per spec; it is attempted, but silently tolerated if `demo_reports` is missing.

## Resend Migration Note
- Current from-address is `onboarding@resend.dev` for reliable MVP transactional delivery.
- Migrate to `hello@commitrecruit.com` once Resend domain verification/billing supports the production domain.

## Deploy (Production)
```bash
vercel --prod
```

After deploy, add domains:
```bash
vercel domains add commitrecruit.com
vercel domains add www.commitrecruit.com
```

## API Smoke Tests Used
```bash
curl -X POST http://localhost:4100/api/waitlist -H 'Content-Type: application/json' -d '{"email":"test@example.com","phone":"555-010-0000","playerName":"Jake Thompson","gradYear":"2027","position":"OF","referrer":"local-test"}'

curl -X POST http://localhost:4100/api/generate-report -H 'Content-Type: application/json' -d '{"playerName":"Jake Thompson","gradYear":"2027","position":"OF","battingAverage":".351","videoLink":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","targetSchools":"Samford, Missouri State"}'

curl -u "admin:$ADMIN_PASSWORD_COMMIT" http://localhost:4100/admin
curl -u "admin:$ADMIN_PASSWORD_COMMIT" http://localhost:4100/api/admin/export
```
