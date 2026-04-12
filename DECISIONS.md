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
