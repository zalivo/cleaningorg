import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import {
  type ChecklistItem,
  type Job,
  type JobStatus,
  type Note,
  seedJobs,
} from "@/data/jobs";
import { useRatingsStore } from "@/store/ratings";

const DEFAULT_ROOMS = [
  "Kitchen",
  "Bathroom",
  "Living areas",
  "Bedrooms",
  "Floors",
  "Trash",
];

export interface BookJobInput {
  propertyId: string;
  propertyName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  bookerId: string;
  cleanerId: string;
  cleanerName: string;
  reviewerId: string;
  reviewerName: string;
  /** ISO start of the booker-set window. Required. */
  scheduledStart: string;
  /** ISO end of the booker-set window. Required, must be after start. */
  scheduledEnd: string;
  /**
   * Snapshotted combined total in integer minor units (haléře — 1/100 of
   * a koruna). Required — every job carries a price. Compute with
   * `computePriceCents(cleaner.hourlyRate, start, end) + reviewer.feeCents`
   * at the call site so the value matches the breakdown shown to the
   * booker at confirm time.
   */
  priceCents: number;
  /**
   * Reviewer's flat inspection fee component of the total, snapshotted
   * from the Reviewer at booking time. Required for new bookings; older
   * persisted jobs may have it `undefined`.
   */
  reviewerFeeCents: number;
  notes?: string;
}

export interface NoteInput {
  text?: string;
  photoUri?: string;
}

interface JobsState {
  jobs: Job[];
  bookJob: (input: BookJobInput) => Job;
  startCleaning: (jobId: string) => void;
  finishCleaning: (jobId: string) => void;
  startReview: (jobId: string) => void;
  approve: (jobId: string) => void;
  decline: (jobId: string, reason: string) => void;
  cancel: (jobId: string) => void;
  toggleChecklist: (jobId: string, room: string) => void;
  setPhoto: (jobId: string, uri: string) => void;
  addCleanerNote: (jobId: string, input: NoteInput) => void;
  addReviewerNote: (jobId: string, input: NoteInput) => void;
  resetDemo: () => void;
}

function buildNote(input: NoteInput): Note | null {
  const text = input.text?.trim();
  const photoUri = input.photoUri;
  if (!text && !photoUri) return null;
  return {
    id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    text: text || undefined,
    photoUri: photoUri || undefined,
    createdAt: new Date().toISOString(),
  };
}

function patch(jobs: Job[], jobId: string, fn: (j: Job) => Partial<Job>): Job[] {
  return jobs.map((j) => (j.id === jobId ? { ...j, ...fn(j) } : j));
}

/** Sort jobs ascending by scheduled start (earliest first). */
function bySchedule(a: Job, b: Job): number {
  return (
    new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
  );
}

/** Sort jobs descending by scheduled start (most recent first) — for history. */
function byScheduleDesc(a: Job, b: Job): number {
  return (
    new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()
  );
}

export const useJobsStore = create<JobsState>()(
  persist(
    (set) => ({
      jobs: seedJobs,
      bookJob: (input) => {
        const startMs = new Date(input.scheduledStart).getTime();
        const endMs = new Date(input.scheduledEnd).getTime();
        if (
          !Number.isFinite(startMs) ||
          !Number.isFinite(endMs) ||
          endMs <= startMs
        ) {
          throw new Error(
            "Cannot create job: scheduledEnd must be a valid ISO 8601 timestamp strictly after scheduledStart. " +
              "The booking form is the only call site, so this almost certainly means a state-machine bug in the form's window resolver. " +
              `Received scheduledStart=${JSON.stringify(input.scheduledStart)}, scheduledEnd=${JSON.stringify(input.scheduledEnd)}.`
          );
        }
        if (!Number.isFinite(input.priceCents) || input.priceCents < 0) {
          throw new Error(
            "Cannot create job: priceCents must be a non-negative finite integer. " +
              "Compute the value with computePriceCents(cleaner.hourlyRate, scheduledStart, scheduledEnd) + reviewer.feeCents at the call site. " +
              `Received priceCents=${JSON.stringify(input.priceCents)}.`
          );
        }
        if (
          !Number.isFinite(input.reviewerFeeCents) ||
          input.reviewerFeeCents < 0
        ) {
          throw new Error(
            "Cannot create job: reviewerFeeCents must be a non-negative finite integer. " +
              "Pass `reviewer.feeCents` from the chosen reviewer at the call site. " +
              `Received reviewerFeeCents=${JSON.stringify(input.reviewerFeeCents)}.`
          );
        }
        const job: Job = {
          id: `j${Date.now()}`,
          propertyId: input.propertyId,
          propertyName: input.propertyName,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          bookerId: input.bookerId,
          cleanerId: input.cleanerId,
          cleanerName: input.cleanerName,
          reviewerId: input.reviewerId,
          reviewerName: input.reviewerName,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          priceCents: input.priceCents,
          reviewerFeeCents: input.reviewerFeeCents,
          notes: input.notes,
          status: "ready-to-clean",
          declineCount: 0,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ jobs: [job, ...s.jobs] }));
        return job;
      },
      startCleaning: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) => {
            if (j.status !== "ready-to-clean") return {};
            const checklist: ChecklistItem[] =
              j.checklist?.map((c) => ({ ...c, done: false })) ??
              DEFAULT_ROOMS.map((room) => ({ room, done: false }));
            return {
              status: "cleaning",
              checklist,
              actualStart: new Date().toISOString(),
            };
          }),
        }));
      },
      finishCleaning: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "cleaning"
              ? {
                  status: "ready-for-review",
                  actualEnd: new Date().toISOString(),
                }
              : {}
          ),
        }));
      },
      startReview: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "ready-for-review" ? { status: "reviewing" } : {}
          ),
        }));
      },
      approve: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "reviewing" ? { status: "done" } : {}
          ),
        }));
      },
      decline: (jobId, reason) => {
        // Reviewer rejection sends the job back to the cleaner. Clear the
        // previous attempt's actual window so the next `cleaning` transition
        // stamps fresh values.
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "reviewing"
              ? {
                  status: "ready-to-clean",
                  declineReason: reason,
                  declineCount: j.declineCount + 1,
                  checklist: j.checklist?.map((c) => ({ ...c, done: false })),
                  actualStart: undefined,
                  actualEnd: undefined,
                }
              : {}
          ),
        }));
      },
      cancel: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "ready-to-clean" ? { status: "cancelled" } : {}
          ),
        }));
      },
      toggleChecklist: (jobId, room) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) => {
            if (j.status !== "cleaning" || !j.checklist) return {};
            return {
              checklist: j.checklist.map((c) =>
                c.room === room ? { ...c, done: !c.done } : c
              ),
            };
          }),
        }));
      },
      setPhoto: (jobId, uri) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "cleaning" ? { photoUri: uri } : {}
          ),
        }));
      },
      addCleanerNote: (jobId, input) => {
        const note = buildNote(input);
        if (!note) return;
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) => {
            if (j.status !== "cleaning") return {};
            return { cleanerNotes: [...(j.cleanerNotes ?? []), note] };
          }),
        }));
      },
      addReviewerNote: (jobId, input) => {
        const note = buildNote(input);
        if (!note) return;
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) => {
            if (j.status !== "reviewing") return {};
            return { reviewerNotes: [...(j.reviewerNotes ?? []), note] };
          }),
        }));
      },
      resetDemo: () => set({ jobs: seedJobs }),
    }),
    {
      // v7 = seed addresses migrated to real Prague locations with
      //      Nominatim-resolved coords (same shape as v6). Old v6 jobs
      //      reference US fixtures that would render off-continent on
      //      the embedded map.
      // v6 = currency switched from USD to CZK (Kč). Types are identical to
      //      v5 but priceCents now means haléře, not US cents, and seed
      //      values jumped 10× to realistic Czech rates. Bumping the key
      //      avoids hydrating v5 USD-shaped numbers as if they were CZK.
      // v8 = added required reviewerFeeCents on every Job (cleaner pay +
      //      reviewer flat fee make up priceCents).
      // v5 = snapshotted priceCents on every Job (rate × hours at booking).
      // v4 = scheduled/actual time windows on Job (was: single `date`).
      // v3 = added optional latitude/longitude snapshots for the embedded map.
      // v2 = property-based job model (was: service-based with totalPrice).
      // Key bumps orphan old payloads instead of hydrating malformed state
      // into the new types.
      name: "cleaningorg/jobs.v8",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ---------------- Selector hooks (used by screens) ----------------

export function useJobsForBooker(bookerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs
        .filter(
          (j) =>
            j.bookerId === bookerId &&
            j.status !== "done" &&
            j.status !== "cancelled"
        )
        .sort(bySchedule)
    )
  );
}

export function useJobsForCleaner(cleanerId: string): Job[] {
  // My Jobs holds the jobs awaiting cleaner action — ready-to-clean and
  // cleaning. Once the cleaner submits (`ready-for-review` or beyond), the
  // job moves to History so the cleaner can still see it during review,
  // instead of disappearing until the reviewer approves. See issue #37.
  return useJobsStore(
    useShallow((s) =>
      s.jobs
        .filter(
          (j) =>
            j.cleanerId === cleanerId &&
            (j.status === "ready-to-clean" || j.status === "cleaning")
        )
        .sort(bySchedule)
    )
  );
}

export function useJobsForReviewer(reviewerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs
        .filter(
          (j) =>
            j.reviewerId === reviewerId &&
            (j.status === "ready-for-review" || j.status === "reviewing")
        )
        .sort(bySchedule)
    )
  );
}

/**
 * Past bookings for a booker. Bookers don't have a History tab —
 * surfaced inline in `(tabs)/jobs.tsx`.
 */
export function useHistoryForBooker(bookerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs
        .filter((j) => j.bookerId === bookerId && j.status === "done")
        .sort(byScheduleDesc)
    )
  );
}

export function useHistoryForCleaner(cleanerId: string): Job[] {
  // Cleaner's History holds everything past the "I am still working on this"
  // states. Submitted jobs (`ready-for-review`, `reviewing`) belong here —
  // the work is finished from the cleaner's perspective; they're just
  // waiting for the reviewer's verdict. Earnings are still gated on `done`
  // by useCleanerEarnings, so credit doesn't move until approval. See #37.
  return useJobsStore(
    useShallow((s) =>
      s.jobs
        .filter(
          (j) =>
            j.cleanerId === cleanerId &&
            (j.status === "ready-for-review" ||
              j.status === "reviewing" ||
              j.status === "done" ||
              j.status === "cancelled")
        )
        .sort(byScheduleDesc)
    )
  );
}

export function useHistoryForReviewer(reviewerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs
        .filter((j) => j.reviewerId === reviewerId && j.status === "done")
        .sort(byScheduleDesc)
    )
  );
}

export function useJob(jobId: string): Job | undefined {
  return useJobsStore((s) => s.jobs.find((j) => j.id === jobId));
}

// ---------------- Cumulative totals (Profile screen) ----------------

interface RoleTotals {
  /** Sum of the relevant cents amount across realised (status === "done") jobs. */
  totalCents: number;
  /** Number of jobs in that sum. */
  jobCount: number;
}

/** Cleaner pay portion of a job: combined total minus the reviewer's fee. */
function cleanerPayOf(job: Job): number {
  return job.priceCents - (job.reviewerFeeCents ?? 0);
}

/** Cumulative earnings for a cleaner across completed jobs. */
export function useCleanerEarnings(cleanerId: string): RoleTotals {
  return useJobsStore(
    useShallow((s) => {
      const jobs = s.jobs.filter(
        (j) => j.cleanerId === cleanerId && j.status === "done"
      );
      let totalCents = 0;
      for (const j of jobs) totalCents += cleanerPayOf(j);
      return { totalCents, jobCount: jobs.length };
    })
  );
}

/** Cumulative inspection-fee earnings for a reviewer across completed jobs. */
export function useReviewerEarnings(reviewerId: string): RoleTotals {
  return useJobsStore(
    useShallow((s) => {
      const jobs = s.jobs.filter(
        (j) => j.reviewerId === reviewerId && j.status === "done"
      );
      let totalCents = 0;
      for (const j of jobs) totalCents += j.reviewerFeeCents ?? 0;
      return { totalCents, jobCount: jobs.length };
    })
  );
}

const PENDING_STATUSES = new Set<JobStatus>([
  "ready-for-review",
  "reviewing",
]);

/**
 * Cleaner pay tied up in jobs the cleaner has submitted but the reviewer
 * hasn't approved (or declined) yet. Used on the Profile screen to give a
 * clear "you've done X, Y is awaiting review" picture so the History
 * count and the Earnings count line up.
 */
export function useCleanerPending(cleanerId: string): RoleTotals {
  return useJobsStore(
    useShallow((s) => {
      const jobs = s.jobs.filter(
        (j) =>
          j.cleanerId === cleanerId && PENDING_STATUSES.has(j.status)
      );
      let totalCents = 0;
      for (const j of jobs) totalCents += cleanerPayOf(j);
      return { totalCents, jobCount: jobs.length };
    })
  );
}

/** Reviewer fees tied up in jobs the reviewer hasn't approved yet. */
export function useReviewerPending(reviewerId: string): RoleTotals {
  return useJobsStore(
    useShallow((s) => {
      const jobs = s.jobs.filter(
        (j) =>
          j.reviewerId === reviewerId && PENDING_STATUSES.has(j.status)
      );
      let totalCents = 0;
      for (const j of jobs) totalCents += j.reviewerFeeCents ?? 0;
      return { totalCents, jobCount: jobs.length };
    })
  );
}

/** Cumulative spend for a booker across completed jobs (cleaner pay + reviewer fee). */
export function useBookerSpend(bookerId: string): RoleTotals {
  return useJobsStore(
    useShallow((s) => {
      const jobs = s.jobs.filter(
        (j) => j.bookerId === bookerId && j.status === "done"
      );
      let totalCents = 0;
      for (const j of jobs) totalCents += j.priceCents;
      return { totalCents, jobCount: jobs.length };
    })
  );
}

export type { RoleTotals };

// ---------------- Per-property cross-section ----------------

export interface PropertyHistory {
  /** Number of `done` jobs at this property. */
  cleanCount: number;
  /**
   * ISO of when this property was last actually cleaned. Falls back to
   * `scheduledEnd` if `actualEnd` wasn't stamped (older jobs). `null`
   * when there are no completed jobs.
   */
  lastCleanedAt: string | null;
  /** Number of unique cleaners across the property's done jobs. */
  distinctCleaners: number;
  /**
   * Mean of all rating scores attached to this property's done jobs
   * (booker→cleaner, reviewer→cleaner — both contribute). `null` when
   * no ratings have been left yet, so the UI can omit the chip rather
   * than render "★0.0".
   */
  averageRating: number | null;
  /** Sum of `priceCents` across the property's done jobs. */
  totalSpendCents: number;
}

/**
 * Per-property aggregate of booking outcomes. Derived from `jobs` and
 * `ratings`; no new persistent state.
 *
 * Cross-store: this hook composes two `useShallow` subscriptions — one
 * against the jobs store (to filter the property's `done` set) and one
 * against the ratings store (to pull the scores for those jobs). The
 * import direction is one-way (`store/jobs.ts` imports
 * `store/ratings.ts`), so there's no risk of a cycle. Each selector
 * returns shallow-equal arrays when nothing relevant moves, so rating
 * additions on other properties don't re-render this card.
 *
 * Returns zeroes / nulls for an unknown propertyId rather than
 * `undefined` so callers can render unconditionally.
 */
export function usePropertyHistory(propertyId: string): PropertyHistory {
  const jobs = useJobsStore(
    useShallow((s) =>
      s.jobs.filter(
        (j) => j.propertyId === propertyId && j.status === "done"
      )
    )
  );

  // The set of jobIds is recomputed each render but `useShallow`'s
  // element-wise compare on the ratings result keeps the reference
  // stable when no rating in the matching set has changed.
  const jobIdSet = new Set(jobs.map((j) => j.id));
  const ratingScores = useRatingsStore(
    useShallow((s) =>
      s.ratings.filter((r) => jobIdSet.has(r.jobId)).map((r) => r.score)
    )
  );

  let lastTs = -Infinity;
  let lastCleanedAt: string | null = null;
  const cleanerIds = new Set<string>();
  let totalSpendCents = 0;
  for (const j of jobs) {
    cleanerIds.add(j.cleanerId);
    totalSpendCents += j.priceCents;
    const stamp = j.actualEnd ?? j.scheduledEnd;
    const ts = new Date(stamp).getTime();
    if (Number.isFinite(ts) && ts > lastTs) {
      lastTs = ts;
      lastCleanedAt = stamp;
    }
  }

  const averageRating =
    ratingScores.length > 0
      ? ratingScores.reduce((sum, n) => sum + n, 0) / ratingScores.length
      : null;

  return {
    cleanCount: jobs.length,
    lastCleanedAt,
    distinctCleaners: cleanerIds.size,
    averageRating,
    totalSpendCents,
  };
}

/**
 * All non-cancelled jobs for a property (active + completed), most recent
 * first. Used by the property detail screen's drill-in list. Cancelled
 * bookings are filtered out — they aren't part of "what happened at this
 * property" the way a completed clean is.
 */
export function useJobsForProperty(propertyId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs
        .filter((j) => j.propertyId === propertyId && j.status !== "cancelled")
        .sort(byScheduleDesc)
    )
  );
}
