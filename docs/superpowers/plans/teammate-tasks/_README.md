# Teammate task packets

These are self-contained, copy-pasteable task instructions for the CleaningOrg hackathon (submission 2026-05-01 17:00).

## Background you need before starting

1. The full design spec: [`../../specs/2026-05-01-end-to-end-booking-design.md`](../../specs/2026-05-01-end-to-end-booking-design.md) — read the §Goal, §Actors, §Job state machine, and §Data model sections (5 min).
2. The full implementation plan: [`../2026-05-01-end-to-end-booking.md`](../2026-05-01-end-to-end-booking.md) — only as a reference if your task packet links to a specific section.
3. **Phase 0 (Task A — foundation) is already complete and pushed to `main`.** That added the Zustand stores, types, and seed data your task imports from. Don't redo it. Just `git pull` before you start.

## What's already on `main`

- `src/data/identities.ts` — `Role`, `Identity`, `identities[]`, `getIdentity`, `getIdentityForRole`
- `src/data/reviewers.ts` — `Reviewer`, `reviewers[]`, `getReviewer`
- `src/data/jobs.ts` — `JobStatus`, `ChecklistItem`, `Job`, `seedJobs[]`, `formatJobDate`
- `src/store/identity.ts` — `useIdentityStore`, `useActiveIdentity`
- `src/store/jobs.ts` — `useJobsStore`, `BookJobInput`, plus selector hooks: `useJobsForBooker`, `useJobsForCleaner`, `useJobsForReviewer`, `useHistoryForCleaner`, `useHistoryForReviewer`, `useJob`
- The old `src/data/bookings.ts` is **still there** and untouched — do not delete it unless your task packet says to.

## Task packets

| File | Owner | Files touched |
|------|-------|---------------|
| [`task-b-tabs-and-lists.md`](task-b-tabs-and-lists.md) | Lead | `(tabs)/_layout.tsx`, new `jobs.tsx`, new `history.tsx`, new `job-card.tsx`; deletes old `bookings.tsx`/`booking-card.tsx`/`bookings.ts` |
| [`task-c-job-detail.md`](task-c-job-detail.md) | Teammate 1 | `app/_layout.tsx`, new `app/jobs/[id].tsx` |
| [`task-d-book-flow.md`](task-d-book-flow.md) | Teammate 2 | `app/book.tsx` (full rewrite) |
| [`task-e-profile-switcher.md`](task-e-profile-switcher.md) | Lead | `(tabs)/profile.tsx` (full rewrite) |

## House rules

- Type-check with `bunx tsc --noEmit` before committing. If it fails, fix and re-check.
- Commit at the end of your task with the message body provided in the packet.
- Push immediately after commit. Pull before you start.
- File names: kebab-case (`job-card.tsx`); React components: PascalCase.
- Brand colors: `BRAND` (`#0EA5A8`), `BRAND_LIGHT` (`#E6F7F7`), in `src/constants/colors.ts`.
- Theme colors come from `useTheme()` (`@react-navigation/native`): `colors.background`, `colors.card`, `colors.text`, `colors.border`.

## Locked across all packets

- Routes:
  - Jobs tab: `/(tabs)/jobs`
  - History tab: `/(tabs)/history`
  - Job detail: `/jobs/[id]`
  - Book modal: `/book` (existing)
- Identity ids in seeds: `booker-1` (booker), `1` (cleaner Maria — collides with `professionals[0].id` deliberately), `r1` (reviewer Priya — matches `reviewers[0].id`).
- Decline reason is **required** (non-empty trim).
- Cancel only from `ready-to-clean`, only by the booker.
