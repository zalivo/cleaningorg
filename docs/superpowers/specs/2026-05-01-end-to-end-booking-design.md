# End-to-End Booking — Design

**Date:** 2026-05-01
**Context:** 6-hour hackathon build on the existing CleaningOrg Expo Router scaffold. Submission deadline 17:00.

## Goal

Turn the current customer-only mock UI into a working three-sided cleaning marketplace where a job moves through a real state machine driven by three distinct user roles. State persists across reloads via `AsyncStorage`. Real backend is an explicit stretch goal, not part of the committed scope.

## Actors

Three seeded demo identities, switchable from the Profile tab. No real auth.

| Role | Responsibilities |
|------|------------------|
| **Booker / Property Admin** | Books a job; assigns the cleaner and reviewer at booking time. |
| **Cleaner** | Performs the work; transitions the job through `cleaning` and `ready-for-review`. |
| **Reviewer** | Approves the work or declines it with a written reason. |

## Job state machine

```
ready-to-clean → cleaning → ready-for-review → reviewing → done
     ↑                                              │
     └──────────────── (decline) ───────────────────┘
```

- A new booking is created already in `ready-to-clean` (cleaner + reviewer assigned at creation).
- Decline returns the job to `ready-to-clean` with the same assigned cleaner; `declineReason` is captured and `declineCount` incremented.
- Booker may `cancel` while in `ready-to-clean`; this transitions to a terminal `cancelled` status. Cancellation is not part of the loop — it is a side exit.

## Data model

```ts
// src/data/identities.ts
type Role = "booker" | "cleaner" | "reviewer";
interface Identity { id: string; name: string; role: Role; avatar?: string; }
```

```ts
// src/store/jobs.ts
type JobStatus =
  | "ready-to-clean"
  | "cleaning"
  | "ready-for-review"
  | "reviewing"
  | "done"
  | "cancelled";

interface ChecklistItem { room: string; done: boolean; }

interface Job {
  id: string;
  serviceId: ServiceId;
  serviceName: string;
  bookerId: string;
  cleanerId: string;
  reviewerId: string;
  date: string;            // ISO
  address: string;
  notes?: string;
  totalPrice: number;
  status: JobStatus;
  checklist?: ChecklistItem[];   // populated on first start-cleaning
  photoUri?: string;             // optional photo from cleaner
  declineReason?: string;        // last reviewer rejection note
  declineCount: number;
  createdAt: string;
}
```

The existing `Booking` type in `src/data/bookings.ts` is replaced by `Job`. The seed `bookings[]` array is rewritten as `seedJobs[]` with examples in multiple states so each role has content on first launch.

A new `src/data/reviewers.ts` adds 2–3 reviewer profiles. Existing `professionals.ts` is reused as the cleaner pool.

## Architecture

### Stores (Zustand + persist middleware)

Two persisted stores, AsyncStorage-backed:

- `useJobsStore` — key `cleaningorg/jobs`. Holds `jobs: Job[]` plus action functions.
- `useIdentityStore` — key `cleaningorg/identity`. Holds `activeIdentityId` and a derived selector `useActiveIdentity()`.

Persistence adapter: `@react-native-async-storage/async-storage` via the standard zustand adapter.

### Store actions

```ts
bookJob(input): Job
startCleaning(jobId)        // ready-to-clean → cleaning  (creates checklist from service)
finishCleaning(jobId)       // cleaning → ready-for-review  (requires all checklist items done)
startReview(jobId)          // ready-for-review → reviewing
approve(jobId)              // reviewing → done
decline(jobId, reason)      // reviewing → ready-to-clean; sets declineReason; declineCount++
cancel(jobId)               // ready-to-clean → cancelled (booker only)
setPhoto(jobId, uri)        // cleaner attaches photo (any time during cleaning)
toggleChecklist(jobId, room) // cleaner ticks room
resetDemo()                 // re-seed jobs + restore active identity to booker
```

Each action validates that:
1. The current status permits the transition.
2. The active identity has the right role *and* is the assigned actor on that job (`bookerId` / `cleanerId` / `reviewerId`).

Invalid attempts are no-ops with `console.warn`. We do not ship an error UI for this in the hackathon scope.

## Routing

```
src/app/
├── _layout.tsx                  (existing; wraps with stores)
├── (tabs)/
│   ├── _layout.tsx              (role-aware: hides tabs via href: null)
│   ├── index.tsx                (Home — booker only)
│   ├── jobs.tsx                 (renamed from bookings.tsx — role-filtered list)
│   ├── history.tsx              (new — done/cancelled jobs for cleaner & reviewer)
│   └── profile.tsx              (adds identity switcher)
├── jobs/[id].tsx                (new — shared detail; role-conditional actions)
├── book.tsx                     (existing; gains cleaner + reviewer pickers; writes to store)
└── pros/[id].tsx                (kept — accessible from home carousel)
```

Tab visibility per active identity:

| Role | Tab 1 | Tab 2 | Tab 3 |
|------|-------|-------|-------|
| Booker | Home | My Bookings | Profile |
| Cleaner | My Jobs | History | Profile |
| Reviewer | To Review | History | Profile |

Implementation: every `<Tabs.Screen>` defined; `options.href` set to `null` for tabs that don't apply to the active role. Labels are also role-dependent for `jobs.tsx` ("My Bookings" / "My Jobs" / "To Review").

### `jobs.tsx` filtering

| Active role | Shown jobs |
|-------------|-----------|
| Booker | jobs where `bookerId === activeIdentity.id` and `status !== done && status !== cancelled` |
| Cleaner | jobs where `cleanerId === activeIdentity.id` and `status ∈ {ready-to-clean, cleaning, ready-for-review}` |
| Reviewer | jobs where `reviewerId === activeIdentity.id` and `status ∈ {ready-for-review, reviewing}` |

### `history.tsx` filtering

| Active role | Shown jobs |
|-------------|-----------|
| Cleaner | jobs where `cleanerId === activeIdentity.id` and `status ∈ {done, cancelled}` |
| Reviewer | jobs where `reviewerId === activeIdentity.id` and `status === done` |
| Booker | (tab hidden) |

### `jobs/[id].tsx` — shared screen, role-conditional actions

Top of screen: shared job summary (service, date, address, assigned cleaner & reviewer names, current status pill, decline reason banner if `declineCount > 0`).

Bottom action panel switches on the active identity's role:

- **Booker**
  - Status timeline (read-only).
  - "Cancel booking" button only when `status === ready-to-clean`.
- **Cleaner** (and `cleanerId === activeIdentity.id`)
  - When `ready-to-clean`: "Start cleaning" button.
  - When `cleaning`: room checklist (toggles), optional photo picker, "Mark ready for review" (disabled until all checklist items done).
  - When `ready-for-review`+: read-only summary.
- **Reviewer** (and `reviewerId === activeIdentity.id`)
  - When `ready-for-review`: "Start review" button.
  - When `reviewing`: shows checklist + photo, "Approve" button, "Decline" button (opens reason input — submission requires non-empty reason).
  - When `done`: read-only.

If the active identity isn't the assigned actor for the job's current step, the panel shows the read-only summary only — no action buttons.

## Book flow changes (`book.tsx`)

Two new required fields below Address:

- **Cleaner** — chip picker over `professionals[]`.
- **Reviewer** — chip picker over `reviewers[]`.

Confirm button:
1. Validates: address, cleaner, reviewer all set.
2. Calls `useJobsStore.getState().bookJob({...})`.
3. Navigates to `/(tabs)/jobs` (no more `Alert`).

Date/time chips ("Tomorrow", "Morning") resolve to a real ISO date via small helpers (`resolveDate(dateId)`, `resolveTime(timeId)`) so jobs sort correctly.

## Profile screen changes

Adds an **Identity switcher** as a segmented control (or three pressable cards) listing the three demo identities — one per role. Tapping sets `activeIdentityId`. Below it, a **Reset demo data** action calling `resetDemo()`.

## Stretch goals (in priority order)

### Stretch b — Richer cleaner UX

- Each service in `services.ts` gets a `rooms: string[]` field (e.g., Standard Clean → `["Kitchen", "Bathroom", "Living areas", "Bedrooms"]`).
- `startCleaning` builds `job.checklist` from the service's `rooms` (all `done: false`).
- Detail screen renders the checklist; cleaner taps to toggle.
- Optional photo via `expo-image-picker` (added with `bunx expo add expo-image-picker`); single photo URI stored on the job; reviewer sees it.
- "Mark ready for review" is disabled until every checklist item is done.

### Stretch c — Toasts

- `src/components/toast.tsx` — top-anchored toast with auto-dismiss.
- `useToastQueue()` hook backed by a tiny in-memory store; renders one toast at a time.
- Mounted at the root layout.
- Subscribes to `useJobsStore` via `subscribe(selector)` and triggers a toast when a job's `status` changes *and* the active identity is the booker/cleaner/reviewer assigned to that job.
- Copy examples: "Maria started cleaning 742 Evergreen Terrace" / "Job is ready for review" / "Reviewer declined: <reason>".

## Out of scope

- Real authentication.
- Real backend / API routes / database (explicit stretch beyond b and c).
- Ratings, chat, payment processing.
- Push notifications via OS-level APIs (toasts are in-app only).
- Multi-photo uploads, video, voice notes.
- Search / filtering on the home page beyond what already exists.
- Web-specific polish; we target the demo on iOS simulator (web should still build but isn't tested).

## Testing strategy

Hackathon scope — manual end-to-end, not automated tests:

1. As Booker: create a job, assigning Cleaner X and Reviewer Y.
2. Switch to Cleaner X: see job in My Jobs → Start cleaning → tick checklist → Mark ready for review.
3. Switch to Reviewer Y: see job in To Review → Start review → Decline with reason "test loop".
4. Switch to Cleaner X: see job back in `ready-to-clean` with decline banner.
5. Repeat 2–3 but Approve. Confirm job appears in History for cleaner and reviewer; gone from booker's active list.
6. Reload the app: state persists.
7. "Reset demo data" returns to a clean baseline.

## Time budget

Starting ~11:00, submit 17:00 (6h, ~30 min spent in brainstorming):

| Block | Duration | Work |
|-------|----------|------|
| 1 | 0:30 | Zustand stores + types + seed data |
| 2 | 0:30 | Identity store + Profile switcher |
| 3 | 0:45 | Role-aware tabs + new History tab + job listing filters |
| 4 | 0:45 | Job detail screen + role-conditional actions + state transitions |
| 5 | 0:30 | Book flow: cleaner/reviewer pickers + writes to store |
| 6 | 0:20 | Decline-with-reason flow |
| 7 | 0:30 | Manual end-to-end pass + bug fixes |
| 8 | 0:30 | Polish (empty states, copy, status pills) |
| Buffer | ~1:00 | Stretch b first, then c. If b runs long, ship c only. |

## Risks

- **AsyncStorage on web** — the package falls back to `localStorage` on web. Should "just work" but is one of the more likely surprises; if blocked, fall back to in-memory only on web.
- **`expo-image-picker` permissions** — adding stretch b touches native permissions; if it balloons we drop the photo and keep the checklist.
- **Subscribe-based toasts** — easy to over-fire on every state mutation. Mitigation: compare previous and next status per job inside the subscriber.
