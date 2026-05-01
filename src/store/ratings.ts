import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { getProfessional } from "@/data/professionals";
import {
  type RaterRole,
  type Rating,
  type RatingAggregate,
  blendAggregate,
  seedRatings,
} from "@/data/ratings";

export interface AddRatingInput {
  jobId: string;
  raterIdentityId: string;
  raterRole: RaterRole;
  subjectIdentityId: string;
  score: number;
  comment?: string;
}

interface RatingsState {
  ratings: Rating[];
  /**
   * Append a rating. No-op if a rating with the same (jobId, raterRole)
   * already exists — ratings are final and one-per-rater-per-job.
   */
  addRating: (input: AddRatingInput) => void;
  resetDemo: () => void;
}

function isValidScore(n: number): n is 1 | 2 | 3 | 4 | 5 {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

export const useRatingsStore = create<RatingsState>()(
  persist(
    (set, get) => ({
      ratings: seedRatings,
      addRating: (input) => {
        if (!isValidScore(input.score)) return;
        const existing = get().ratings.find(
          (r) => r.jobId === input.jobId && r.raterRole === input.raterRole
        );
        if (existing) return;
        const rating: Rating = {
          id: `rt${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          jobId: input.jobId,
          raterIdentityId: input.raterIdentityId,
          raterRole: input.raterRole,
          subjectIdentityId: input.subjectIdentityId,
          score: input.score,
          comment: input.comment?.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ ratings: [rating, ...s.ratings] }));
      },
      resetDemo: () => set({ ratings: seedRatings }),
    }),
    {
      name: "cleaningorg/ratings.v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ---------------- Selector hooks ----------------

export function useRatingForJob(
  jobId: string,
  raterRole: RaterRole
): Rating | undefined {
  return useRatingsStore((s) =>
    s.ratings.find((r) => r.jobId === jobId && r.raterRole === raterRole)
  );
}

/** Hook form: subscribes a component to live aggregate updates. */
export function useCleanerAggregateRating(
  cleanerId: string
): RatingAggregate {
  const realScores = useRatingsStore(
    useShallow((s) =>
      s.ratings
        .filter((r) => r.subjectIdentityId === cleanerId)
        .map((r) => r.score)
    )
  );
  const pro = getProfessional(cleanerId);
  if (!pro) return { avg: 0, count: realScores.length };
  return blendAggregate(pro.rating, pro.jobsCompleted, realScores);
}

/** Non-hook form: for sort comparators or one-shot reads outside React. */
export function getCleanerAggregateRating(
  cleanerId: string
): RatingAggregate {
  const realScores = useRatingsStore
    .getState()
    .ratings.filter((r) => r.subjectIdentityId === cleanerId)
    .map((r) => r.score);
  const pro = getProfessional(cleanerId);
  if (!pro) return { avg: 0, count: realScores.length };
  return blendAggregate(pro.rating, pro.jobsCompleted, realScores);
}
