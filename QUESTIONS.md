# Questions

## 2026-04-12 12:06 PM CDT

- No blocking questions right now. Continuing autonomous execution.

## 2026-04-12 04:00 PM CDT

- Need one unblock to finish final SQL step: please provide a fresh, working `SUPABASE_DB_URL` (or direct DB password/connection) for project `ykbazffnruyitblyxyog` so I can run `supabase/schema.sql` and switch off fallback persistence.

## 2026-04-12 04:13 PM CDT

- Still one external input needed to fully close the project: a valid SQL credential for the Supabase project (`SUPABASE_DB_URL` refresh or direct DB password/host/user). I will apply schema and verify canonical table writes immediately after it is provided.

## 2026-04-12 04:58 PM CDT

- Can you drop a fresh SQL connection string for Supabase project `ykbazffnruyitblyxyog` into `~/.luna/secrets/keys.env` as `SUPABASE_DB_URL` so I can run `supabase/schema.sql` and seed schools right away?

## 2026-04-21 — Project ID correction (confirmed by data)

- The real Supabase project for this app is `cdmulguhddxjrzjtjqol` (project name: "commit", us-east-2). Earlier entries referencing `ykbazffnruyitblyxyog` were pointed at a LunaOS project, not commit.
- Confirmed by row counts in `cdmulguhddxjrzjtjqol`: 1,442 programs and ~1,415 coaches, exactly matching the nightly loader output recorded in PROGRESS.md. The GitHub Actions nightly workflow has been writing to commit via its own repo secrets all along.
- Schema from `supabase/schema.sql` was applied cleanly to `cdmulguhddxjrzjtjqol` on 2026-04-21 (idempotent, no data touched, RLS enabled on all 14 tables).
- Split-brain issue: Vercel production deploy was pointed at LunaOS Supabase keys (found in `commit-baseball/app/.env.vercel.prod`), so waitlist signups have been landing in LunaOS `sashanoire_subscribers` fallback while program data lived in commit. Vercel env swap to commit's keys is pending — existing waitlist rows in LunaOS should be exported/copied to `cdmulguhddxjrzjtjqol.public.waitlist` before or after the swap so no signups are lost.
- Unrelated tables in `cdmulguhddxjrzjtjqol` (`journeys`, `journey_stages`, `workflows`, `templates`, `campaigns`, etc.) are leftovers from prior project reuse — not breaking anything, can be ignored or cleaned up later.
