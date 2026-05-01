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
  date: string;
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

export const useJobsStore = create<JobsState>()(
  persist(
    (set) => ({
      jobs: seedJobs,
      bookJob: (input) => {
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
          date: input.date,
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
            return { status: "cleaning", checklist };
          }),
        }));
      },
      finishCleaning: (jobId) => {
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "cleaning" ? { status: "ready-for-review" } : {}
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
        set((s) => ({
          jobs: patch(s.jobs, jobId, (j) =>
            j.status === "reviewing"
              ? {
                  status: "ready-to-clean",
                  declineReason: reason,
                  declineCount: j.declineCount + 1,
                  checklist: j.checklist?.map((c) => ({ ...c, done: false })),
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
      // v3 = adds optional latitude/longitude snapshots for the embedded map.
      // v2 = property-based job model (was: service-based with totalPrice).
      // Key bumps orphan old payloads instead of hydrating malformed state
      // into the new types.
      name: "cleaningorg/jobs.v3",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ---------------- Selector hooks (used by screens) ----------------

export function useJobsForBooker(bookerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs.filter(
        (j) =>
          j.bookerId === bookerId &&
          j.status !== "done" &&
          j.status !== "cancelled"
      )
    )
  );
}

export function useJobsForCleaner(cleanerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs.filter(
        (j) =>
          j.cleanerId === cleanerId &&
          (j.status === "ready-to-clean" ||
            j.status === "cleaning" ||
            j.status === "ready-for-review")
      )
    )
  );
}

export function useJobsForReviewer(reviewerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs.filter(
        (j) =>
          j.reviewerId === reviewerId &&
          (j.status === "ready-for-review" || j.status === "reviewing")
      )
    )
  );
}

export function useHistoryForCleaner(cleanerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs.filter(
        (j) =>
          j.cleanerId === cleanerId &&
          (j.status === "done" || j.status === "cancelled")
      )
    )
  );
}

export function useHistoryForReviewer(reviewerId: string): Job[] {
  return useJobsStore(
    useShallow((s) =>
      s.jobs.filter((j) => j.reviewerId === reviewerId && j.status === "done")
    )
  );
}

export function useJob(jobId: string): Job | undefined {
  return useJobsStore((s) => s.jobs.find((j) => j.id === jobId));
}
