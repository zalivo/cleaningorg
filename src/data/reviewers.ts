export interface Reviewer {
  id: string;
  name: string;
  rating: number;
  reviewsCompleted: number;
  bio: string;
  avatarColor: string;
  /**
   * Flat inspection fee paid for a single review, in the smallest currency
   * unit (Kč * 100 / cents). Snapshotted onto the Job at booking time so a
   * fee bump later doesn't rewrite history.
   */
  feeCents: number;
}

export const reviewers: Reviewer[] = [
  {
    id: "r1",
    name: "Priya Sharma",
    rating: 4.9,
    reviewsCompleted: 234,
    bio: "Quality assurance specialist with 6 years of experience.",
    avatarColor: "#A78BFA",
    feeCents: 20000, // 200 Kč
  },
  {
    id: "r2",
    name: "Tom Williams",
    rating: 4.8,
    reviewsCompleted: 187,
    bio: "Detail-focused reviewer with property management background.",
    avatarColor: "#FBBF24",
    feeCents: 25000, // 250 Kč
  },
  {
    id: "r3",
    name: "Elena Rossi",
    rating: 5.0,
    reviewsCompleted: 312,
    bio: "Senior inspector — commercial and residential.",
    avatarColor: "#34D399",
    feeCents: 30000, // 300 Kč (premium reviewer)
  },
];

export function getReviewer(id: string): Reviewer | undefined {
  return reviewers.find((r) => r.id === id);
}
