# Commit Baseball — Product Plan

Working document. Captures scoping decisions made during 2026-04-21 planning session. Append-only — don't rewrite history; add dated sections as things evolve.

## Primary user

**Rising 9th-grade baseball players (summer before they start high school) and their parents.** This is a 4+ year journey product, not a senior-year recruiting sprint.

Secondary users:
- HS / travel / club coaches (same-side advocates)
- College coaches — deferred to v2+ (NCAA contact rules make them irrelevant for the primary user until year 3-4 of the roadmap)

## Positioning

**"Everything a $5,000/year recruiting consultant does, as software — starting the summer before freshman year, so families don't have to spend that money."**

This reframes the current senior-year / active-recruiting landing copy. Scope of "what a consultant does" includes: evaluation, positioning, target school curation, showcase/camp selection, video coordination, coach outreach, deadlines/visits, offer evaluation, academic alignment, parent coaching.

## v1 scope — Player / Parent side

All 5 features ship in v1. Ship order:

1. **Personalized 4-year roadmap engine** (priority #1, ships first) — the backbone; every other feature attaches to milestones on it
2. **Player profile + baseline measurements** — data that feeds everything downstream
3. **Early realistic school list** — right-tier targeting, built on profile + roadmap stage
4. **Showcase / camp decision guidance** — cost/value attached to roadmap milestones
5. **Parent education library** — lightweight content, drips alongside everything

## v1 scope — HS / Travel / Club coach side

All 4 features in v1:

- **Advocate tools** — recommendations, push video/stats to recruiters
- **Roster-wide progress tracking** — whole program in one view
- **Program marketing / results showcase** — attract families to the club
- **B2B2C distribution channel** — coach brings their whole roster onto the platform

## Deferred to v2+

- College coach features (find hidden gems, evaluate prospects, reduce inbox spam, CRM, post needs + match)

## Pricing

- **First month free, then $29/month.** Placeholder pending pricing research.
- Research needed: graduated pricing (cheaper early years), freemium cuts, family vs. club tier pricing.

## Migration approach

**Pivot in place.** Keep the existing Next.js stack, Supabase, admin, programs DB, and auth. Rewrite senior-year-flavored landing copy and retarget the demo report toward the 4-year journey framing. No full rebuild.

## v1 roadmap spec (feature #1)

Model: **calendar-anchored, readiness-gated** — hybrid adopted from industry convergence (NCSA, Perfect Game, Baseball Factory, SportsRecruits).

**Structure:** 4 grade-year phases × 4 seasonal blocks = **16 checkpoints** per player (9th Fall → 12th Summer).

**Four task types at every checkpoint:**
1. **Athletic** — training focus + metric retest
2. **Academic** — GPA target, coursework, NCAA core-course audit
3. **Exposure** — video, showcase, outreach (NCAA-calendar-gated; no exposure activity before certain dates)
4. **Pitcher overlay** — Pitch Smart workload compliance (required for any pitcher)

**Intake parameters (collected at 9th-grade onboarding, never fork the roadmap):**
- Primary position (parameterizes metric targets)
- Division aspiration (D1 / D2 / D3 / NAIA / JUCO) — parameterizes metric thresholds and exposure intensity
- Academic profile (baseline GPA, projected rigor)

**Key NCAA dates baked in:**
- **June 15 after sophomore year** — coach contact unlocks (structural hinge)
- **Aug 1 before junior year** — official visits allowed
- NLI signing windows (early Nov, mid-April)
- Annual dead/quiet/contact/evaluation periods surfaced as reminders

**Phase-gating is readiness-based, not calendar-based alone.** A player doesn't "advance to exposure phase" purely because it's junior fall — they advance when metrics clear a threshold. Calendar sets the earliest date; readiness determines actual progression.

**Concrete checkpoint examples:**

*9th Grade Fall:* capture baseline measurables (60-yd, exit velo, throwing velo, P FB velo) with no targets yet; baseline GPA; foundational strength/mobility; zero exposure activity (no showcases, no outreach); Pitch Smart habit started. Deliverable: baseline report card + individualized winter plan.

*11th Grade Summer (hinge):* tier-appropriate metric targets (e.g., D1 position player ~90+ exit velo, <6.9 60); 1-2 high-leverage showcases (PG National, Area Code, UA); updated highlight + full-game video; active tiered outreach post-June-15 (reach/match/safety); SAT/ACT taken; NCAA Eligibility Center finalized; Pitch Smart peak-workload mgmt for pitchers. Deliverable: commitment-readiness score + 10-15 realistic programs.

**Caveat:** Specific metric thresholds and NCAA date details in this spec came from an LLM synthesis of training data (not live web research). All numbers and dates must be verified against current NCSA / Perfect Game / Baseball Factory / NCAA published sources before shipping.

## v1 player profile spec (feature #2)

**Scope: full longitudinal.** Shareable public URL deferred to v2+ (only becomes valuable at the 11th-grade-summer hinge).

**Captured at intake (9th grade):**
- Identity: name, grad year, HS, travel org, parent contact
- Position(s): primary + secondary
- Academic track baseline: unweighted GPA, projected rigor, target tier

**Tracked longitudinally (every re-test updates a time-series, never overwrites):**
- Measurables: 60-yd, exit velo (off tee + BP), throwing velo (by position), C pop time, P fastball velo + secondary pitch grades
- Academic: GPA per term, SAT/ACT attempts, NCAA core-course progression
- Stat lines per season (HS + travel) — batting / pitching splits
- Growth curves rendered per metric (for the "progress story" families + coaches want to see)

**Media:**
- Video library — practice, game, showcase footage with tags (date, pitch type, at-bat context, radar readings)
- Highlight reel (auto-generated or curated from library)

**Activity log:**
- Showcases/camps attended with cost tracking (feeds feature #4 cost/value math)
- Unofficial/official visits
- Recommendation letters
- Injury / workload log (Pitch Smart compliance per USA Baseball age guidelines)
- Awards / achievements

**Design note:** The profile is the one surface a player touches most often for 4 years — invest in UX that makes metric logging fast (mobile-first, 30 seconds to log a velo reading) or adoption dies.

## Open questions

- School-list matching logic + data inputs
- Showcase/camp directory sourcing + cost-value scoring
- Education library format (articles / video / drip email / course)
- Pricing research
- Go-to-market / distribution
- Brand updates (landing copy direction, visuals)
