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
import { getService, type ServiceId } from "@/data/services";

const SERVICE_ROOMS: Record<ServiceId, string[]> = {
  standard: ["Kitchen", "Bathroom", "Living areas", "Bedrooms"],
  deep: ["Kitchen", "Bathroom", "Living areas", "Bedrooms", "Inside appliances", "Windows"],
  "move-out": ["Kitchen", "Bathroom", "Bedrooms", "Closets", "Floors", "Walls"],
  office: ["Desks", "Breakroom", "Bathrooms", "Common areas"],
  "post-construction": ["Dust removal", "Floors", "Windows", "Fixtures"],
};

export interface BookJobInput {
  serviceId: ServiceId;
  bookerId: string;
  cleanerId: string;
  cleanerName: string;
  reviewerId: string;
  reviewerName: string;
  date: string;
  address: string;
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
        const service = getService(input.serviceId);
        const job: Job = {
          id: `j${Date.now()}`,
          serviceId: input.serviceId,
          serviceName: service?.name ?? input.serviceId,
          bookerId: input.bookerId,
          cleanerId: input.cleanerId,
          cleanerName: input.cleanerName,
          reviewerId: input.reviewerId,
          reviewerName: input.reviewerName,
          date: input.date,
          address: input.address,
          notes: input.notes,
          totalPrice: service?.price ?? 0,
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
            const rooms = SERVICE_ROOMS[j.serviceId] ?? ["Whole space"];
            const checklist: ChecklistItem[] =
              j.checklist?.map((c) => ({ ...c, done: false })) ??
              rooms.map((room) => ({ room, done: false }));
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
      name: "cleaningorg/jobs",
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
