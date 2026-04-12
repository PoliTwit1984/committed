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

### Follow-up after MVP ship
- Fix or rotate `SUPABASE_DB_URL` credentials, then run `supabase/schema.sql`.
- Remove fallback compatibility path once canonical tables exist.
