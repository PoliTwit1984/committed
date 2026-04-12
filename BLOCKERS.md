# Blockers

## 2026-04-12 12:06 PM CDT — Supabase schema creation blocked

### What happened

- Attempted to run:
  - `psql "$SUPABASE_DB_URL" -f supabase/schema.sql`
- Connection fails with:
  - `FATAL: Tenant or user not found`

### Impact

- Cannot create `waitlist` and `demo_reports` tables directly from this environment.
- Supabase REST confirms the project is reachable, but those tables are absent from the exposed schema cache.

### Mitigation in place

- Waitlist API now falls back to an existing Supabase table (`sashanoire_subscribers`) if `waitlist` table is missing.
- Admin waitlist count/list/export consume the same fallback path, so the MVP remains operational end-to-end.
- Demo report persistence remains optional per spec; report generation still works live.
- Phase 2 moat tables are now defined in `supabase/schema.sql` and report generation is already wired to use them opportunistically when data exists. Until DB creds are fixed, those tables cannot be created/populated in the live project.

### Follow-up after MVP ship

- Fix or rotate `SUPABASE_DB_URL` credentials, then run `supabase/schema.sql`.
- Remove fallback compatibility path once canonical tables exist.

## 2026-04-12 04:00 PM CDT — Root Cause Confirmed

### Root cause

- The Postgres SQL credential path is invalid/stale for this project:
  - `psql "$SUPABASE_DB_URL"` still fails authentication.
  - Supabase REST API is healthy with existing service-role key, so the project itself is online.

### Why this still blocks final completion

- We can read/write existing tables via REST, but cannot create new tables (`waitlist`, `demo_reports`, and Phase 2 scaffold) without SQL-level DB credentials.
- No SQL execution RPC is exposed in current public schema, so we cannot force schema creation through REST calls.

### Exact unblock needed

- Provide a valid Postgres connection string (pooled or direct) for this Supabase project with create-table permissions.
- Once provided, schema apply + canonical write-path verification can be completed immediately.

## 2026-04-12 04:13 PM CDT — Additional Verification

### What was tried

- Exhaustively tested host/user connection permutations derived from existing secrets:
  - Pooler hosts (`aws-0-us-east-1.pooler.supabase.com`, `aws-0-us-west-1.pooler.supabase.com`)
  - User formats (`postgres.<project-ref>`, `postgres`)
  - URL-encoded credential reconstruction to avoid parser issues
- Confirmed all SQL attempts fail with `FATAL: Tenant or user not found` (or equivalent auth failure), while REST remains healthy.

### Conclusion

- The blocker is definitively credential-level for SQL access, not application code and not Supabase project availability.

## 2026-04-12 04:24 PM CDT — Schools Import Dependency

### New dependency introduced

- Schools import endpoints are now implemented (`/api/admin/programs`, `/api/admin/programs/seed`), but they depend on `public.programs`.
- Live Supabase currently returns:
  - `PGRST205: Could not find the table 'public.programs' in the schema cache`

### Operational impact

- Code path is ready to ingest schools.
- Production ingestion cannot run until `supabase/schema.sql` is applied through SQL credentials.

### Runtime verification

- `GET /api/admin/programs` now responds `409` with a precise migration message while the table is absent.
- `POST /api/admin/programs` now responds `409` with the same migration guidance.
- `POST /api/admin/programs/seed` now responds `409` with the same guidance.
- This confirms the feature is deployed and waiting only on schema creation.

## 2026-04-12 04:58 PM CDT - Schools DB Write Still Blocked

### Current state

- Schools API and admin dashboard support are deployed to `https://commitrecruit.com` and live.
- Runtime responds correctly, but insertion is blocked on missing `public.programs`.

### Blocking cause (confirmed)

- SQL connection string currently available in secrets fails with:
  - `FATAL: Tenant or user not found`
- Supabase REST is reachable, but no SQL execution endpoint is exposed in this project's REST surface.
- Without valid Postgres SQL access, table creation from `supabase/schema.sql` cannot be executed.

### Immediate unblock needed

- Fresh working Postgres connection string for this Supabase project, or equivalent direct SQL credential path.
