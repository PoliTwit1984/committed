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

## Open questions

- Detailed contents of the 4-year roadmap (milestones per year, task types)
- Player profile data model (stats, video, GPA, position, measurements, growth tracking)
- School-list matching logic + data inputs
- Showcase/camp directory sourcing + cost-value scoring
- Education library format (articles / video / drip email / course)
- Pricing research
- Go-to-market / distribution
- Brand updates (landing copy direction, visuals)
