import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import {
  type ChecklistItem,
  type Job,
  type Note,
  seedJobs,
} from "@/data/jobs";

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
   * Snapshotted total in integer minor units (haléře — 1/100 of a koruna).
   * Required — every job carries a price. Compute with
   * `computePriceCents(cleaner.hourlyRate, start, end)` at the call site
   * so the value matches the rate × duration shown to the booker at
   * confirm time.
   */
  priceCents: number;
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
              "Compute the value with computePriceCents(cleaner.hourlyRate, scheduledStart, scheduledEnd) at the call site. " +
              `Received priceCents=${JSON.stringify(input.priceCents)}.`
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
      // v6 = currency switched from USD to CZK (Kč). Types are identical to
      //      v5 but priceCents now means haléře, not US cents, and seed
      //      values jumped 10× to realistic Czech rates. Bumping the key
      //      avoids hydrating v5 USD-shaped numbers as if they were CZK.
      // v5 = snapshotted priceCents on every Job (rate × hours at booking).
      // v4 = scheduled/actual time windows on Job (was: single `date`).
      // v3 = added optional latitude/longitude snapshots for the embedded map.
      // v2 = property-based job model (was: service-based with totalPrice).
      // Key bumps orphan old payloads instead of hydrating malformed state
      // into the new types.
      name: "cleaningorg/jobs.v6",
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
  return useJobsStore(
    useShallow((s) =>
      s.jobs
        .filter(
          (j) =>
            j.cleanerId === cleanerId &&
            (j.status === "ready-to-clean" ||
              j.status === "cleaning" ||
              j.status === "ready-for-review")
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

export function useHistoryForCleaner(cleanerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs
        .filter(
          (j) =>
            j.cleanerId === cleanerId &&
            (j.status === "done" || j.status === "cancelled")
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
  /** Sum of `priceCents` across realised (status === "done") jobs. */
  totalCents: number;
  /** Number of jobs in that sum. */
  jobCount: number;
}

function tally(jobs: Job[]): RoleTotals {
  let totalCents = 0;
  for (const j of jobs) totalCents += j.priceCents;
  return { totalCents, jobCount: jobs.length };
}

/** Cumulative earnings for a cleaner across completed jobs. */
export function useCleanerEarnings(cleanerId: string): RoleTotals {
  return useJobsStore(
    useShallow((s) =>
      tally(
        s.jobs.filter((j) => j.cleanerId === cleanerId && j.status === "done")
      )
    )
  );
}

/** Cumulative spend for a booker across completed jobs. */
export function useBookerSpend(bookerId: string): RoleTotals {
  return useJobsStore(
    useShallow((s) =>
      tally(
        s.jobs.filter((j) => j.bookerId === bookerId && j.status === "done")
      )
    )
  );
}

export type { RoleTotals };
