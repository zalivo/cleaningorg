export type RaterRole = "booker" | "reviewer";

export interface Rating {
  id: string;
  jobId: string;
  raterIdentityId: string;
  raterRole: RaterRole;
  subjectIdentityId: string;
  score: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: string; // ISO
}

export interface RatingAggregate {
  avg: number;
  count: number;
}

/**
 * Treat each Professional's seed `rating` as the average over `jobsCompleted`
 * historic jobs; fold real in-app ratings in with equal weight. Demo cleaners
 * therefore start from a believable aggregate on a fresh install, and ratings
 * the user actually leaves still move the needle.
 */
export function blendAggregate(
  seedRating: number,
  seedCount: number,
  realScores: number[]
): RatingAggregate {
  const totalCount = seedCount + realScores.length;
  if (totalCount === 0) return { avg: 0, count: 0 };
  const seedSum = seedRating * seedCount;
  const realSum = realScores.reduce((acc, s) => acc + s, 0);
  return { avg: (seedSum + realSum) / totalCount, count: totalCount };
}

export const seedRatings: Rating[] = [];
