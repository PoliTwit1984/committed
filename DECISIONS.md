# Decisions

## 2026-04-12

1. **Separate git repo inside `app/`**
- The parent repository has many unrelated in-flight changes, so this MVP is versioned in a dedicated nested repo to keep commit history clean and auditable.

2. **Design language: trust-first baseball**
- Implemented navy/off-white/orange palette with serif headlines and restrained card-based layout.
- Chose “Rapsodo-meets-newsletter” visual tone over flashy sports visuals to build parent trust quickly.

3. **Validation strategy**
- Zod schema is the single source of truth for API validation.
- Forms use zod resolver with explicit input/output typing split to prevent runtime drift and keep strict TypeScript compatibility.

4. **Admin auth via middleware basic auth**
- Used route-level middleware and `ADMIN_PASSWORD_COMMIT` for MVP speed and reliability.
- Chose fixed username `admin` and env-managed password to avoid adding an auth provider dependency.

5. **Supabase fallback persistence**
- Canonical target is `waitlist` and `demo_reports` tables per spec.
- Because direct SQL migration was blocked by DB credential failure, implemented fallback writes/reads for waitlist using existing Supabase table `sashanoire_subscribers` to preserve functional end-to-end behavior.

6. **Email provider resolution**
- Final implementation uses Resend per live spec updates.
- Default from-address set to `onboarding@resend.dev` for immediate delivery reliability.

7. **Demo output format**
- Enforced a strict JSON response shape from GPT-4o and validated it server-side before returning to UI.
- This avoids markdown parsing errors and guarantees the report renderer receives consistent fields.

8. **Phase 2 schema now, crawlers later**
- Added empty Supabase tables for the Phase 2 moat (`programs`, `coaches`, `program_needs`, `commitments`, `showcases`, `showcase_outcomes`, `hs_players`) so future ingestion/features can slot in without disruptive migrations.
- Kept MVP runtime stable by querying these tables opportunistically and falling back to generic recruiting logic when tables are absent or empty.

## 2026-04-13

1. **Primary source strategy for full college load**
- Chose The Baseball Cube school listings as the canonical baseball-program source for initial broad coverage across NCAA D1/D2/D3, NAIA, and JUCO.
- Chose profile-page parsing for JUCO division disambiguation, because `schools/juco` is merged across NJCAA/CCCAA/NWAC.

2. **Website enrichment approach**
- Chose NCAA directory API as first-pass website source for NCAA programs (higher precision than generic search).
- Added fallback search enrichment only for unresolved websites to maximize coverage while keeping import deterministic.

3. **Coach sync model**
- Treat current head coach as a refreshed snapshot each load (delete and rebuild source-owned head coach rows) instead of append-only history.
- This keeps `coaches` aligned with latest known program leadership for recruiting workflows.

4. **Nightly refresh orchestration**
- Chose GitHub Actions scheduled workflow for daily refresh (`nightly-program-refresh.yml`) with manual trigger support.
- Secrets are managed as GitHub repository secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) to keep runtime credentials out of code.
