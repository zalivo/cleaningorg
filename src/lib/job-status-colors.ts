import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import type { JobStatus } from "@/data/jobs";

/**
 * Single source of truth for the status pill / block palette. Used by
 * `JobCard` (status pill) and the cleaner's week view (per-block tint)
 * so the two surfaces never drift.
 */
export const STATUS_COLORS: Record<JobStatus, { bg: string; fg: string }> = {
  "ready-to-clean": { bg: BRAND_LIGHT, fg: BRAND },
  cleaning: { bg: "#FEF3C7", fg: "#B45309" },
  "ready-for-review": { bg: "#DBEAFE", fg: "#1D4ED8" },
  reviewing: { bg: "#EDE9FE", fg: "#6D28D9" },
  done: { bg: "#E5E7EB", fg: "#374151" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C" },
};
