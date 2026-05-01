export type JobStatus =
  | "ready-to-clean"
  | "cleaning"
  | "ready-for-review"
  | "reviewing"
  | "done"
  | "cancelled";

export interface ChecklistItem {
  room: string;
  done: boolean;
}

export interface Note {
  id: string;
  text?: string;
  photoUri?: string;
  createdAt: string; // ISO
}

export interface Job {
  id: string;
  propertyId: string;
  propertyName: string; // snapshotted at book time
  address: string; // snapshotted at book time
  latitude?: number; // snapshotted at book time
  longitude?: number; // snapshotted at book time
  bookerId: string;
  cleanerId: string;
  cleanerName: string;
  reviewerId: string;
  reviewerName: string;

  /** Booker-set window. Required; a job cannot be created without one. */
  scheduledStart: string; // ISO
  scheduledEnd: string; // ISO

  /** Stamped automatically on the `cleaning` transition. */
  actualStart?: string; // ISO
  /** Stamped automatically on the `ready-for-review` transition. */
  actualEnd?: string; // ISO

  /**
   * Total price for the job in integer cents (single currency v1).
   * Snapshotted at booking time as the cleaner's `hourlyRate` × the
   * scheduled duration in hours. Stays put if rate or window later
   * change; this is a transactional record, not a recomputation.
   */
  priceCents: number;

  notes?: string;
  status: JobStatus;
  checklist?: ChecklistItem[];
  photoUri?: string;
  declineReason?: string;
  declineCount: number;
  cleanerNotes?: Note[];
  reviewerNotes?: Note[];
  createdAt: string; // ISO
}

export const seedJobs: Job[] = [
  {
    id: "j1",
    propertyId: "p1",
    propertyName: "Evergreen House",
    address: "742 Evergreen Terrace",
    latitude: 39.7817,
    longitude: -89.6501,
    bookerId: "booker-1",
    cleanerId: "1",
    cleanerName: "Maria Santos",
    reviewerId: "r1",
    reviewerName: "Priya Sharma",
    scheduledStart: "2026-05-04T10:00:00.000Z",
    scheduledEnd: "2026-05-04T12:00:00.000Z",
    priceCents: 7000, // Maria Santos $35/hr × 2h
    notes: "Gate code 4815. Friendly dog (Rex) in the yard.",
    status: "ready-to-clean",
    declineCount: 0,
    createdAt: "2026-05-01T08:00:00.000Z",
  },
  {
    id: "j2",
    propertyId: "p1",
    propertyName: "Evergreen House",
    address: "742 Evergreen Terrace",
    latitude: 39.7817,
    longitude: -89.6501,
    bookerId: "booker-1",
    cleanerId: "1",
    cleanerName: "Maria Santos",
    reviewerId: "r2",
    reviewerName: "Tom Williams",
    scheduledStart: "2026-05-02T09:00:00.000Z",
    scheduledEnd: "2026-05-02T13:00:00.000Z",
    actualStart: "2026-05-02T09:15:00.000Z",
    actualEnd: "2026-05-02T13:30:00.000Z",
    priceCents: 14000, // Maria Santos $35/hr × 4h
    notes: "Gate code 4815. Friendly dog (Rex) in the yard.",
    status: "ready-for-review",
    checklist: [
      { room: "Kitchen", done: true },
      { room: "Bathroom", done: true },
      { room: "Living areas", done: true },
      { room: "Bedrooms", done: true },
    ],
    declineCount: 0,
    cleanerNotes: [
      {
        id: "n-seed-1",
        text: "Found a cracked tile in the master bathroom — left it as-is, please flag with the owner.",
        createdAt: "2026-05-02T11:30:00.000Z",
      },
    ],
    createdAt: "2026-04-30T08:00:00.000Z",
  },
  {
    id: "j3",
    propertyId: "p2",
    propertyName: "Market St Office",
    address: "500 Market St, Floor 3",
    latitude: 37.7891,
    longitude: -122.3994,
    bookerId: "booker-1",
    cleanerId: "3",
    cleanerName: "Aisha Patel",
    reviewerId: "r1",
    reviewerName: "Priya Sharma",
    scheduledStart: "2026-04-15T18:00:00.000Z",
    scheduledEnd: "2026-04-15T21:00:00.000Z",
    actualStart: "2026-04-15T18:00:00.000Z",
    actualEnd: "2026-04-15T20:45:00.000Z",
    priceCents: 12000, // Aisha Patel $40/hr × 3h
    notes: "Reception will let the cleaner in. After-hours only.",
    status: "done",
    declineCount: 0,
    reviewerNotes: [
      {
        id: "n-seed-2",
        text: "All clear — desks and breakroom looked great.",
        createdAt: "2026-04-15T20:15:00.000Z",
      },
    ],
    createdAt: "2026-04-14T08:00:00.000Z",
  },
];

// ---------------- Pricing helpers ----------------

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Hours between two ISO timestamps, returned as a real number (e.g. 2.5).
 * Order is `end - start`; callers pass the scheduled window in that order.
 */
export function estimatedHours(startISO: string, endISO: string): number {
  return (
    (new Date(endISO).getTime() - new Date(startISO).getTime()) / MS_PER_HOUR
  );
}

/**
 * Snapshot price in integer cents from an hourly rate (in dollars) and a
 * scheduled window. Round once at this boundary so we never persist
 * fractional cents.
 */
export function computePriceCents(
  hourlyRate: number,
  startISO: string,
  endISO: string
): number {
  return Math.round(hourlyRate * estimatedHours(startISO, endISO) * 100);
}

/**
 * Format integer cents for display:
 *   7000  -> "$70"
 *   7050  -> "$70.50"
 * Whole-dollar amounts drop the trailing `.00` so the common path reads
 * cleanly. Single currency v1 — no locale or symbol negotiation.
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  if (Number.isInteger(dollars)) {
    return `$${dollars.toLocaleString()}`;
  }
  return `$${dollars.toFixed(2)}`;
}

// ---------------- Format helpers ----------------

/**
 * Compact start-only display, e.g. "Mon, May 4, 10:00 AM". Used in places
 * that intentionally show a single instant (createdAt, etc.) rather than a
 * window.
 */
export function formatJobDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format a scheduled window. Same-day windows collapse to one date prefix:
 *   "Mon, May 4, 10:00 AM – 12:00 PM"
 * Cross-day windows fall back to two full timestamps.
 */
export function formatJobWindow(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const timeFmt: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  if (sameDay) {
    const datePart = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${datePart}, ${start.toLocaleTimeString(undefined, timeFmt)} – ${end.toLocaleTimeString(undefined, timeFmt)}`;
  }
  return `${formatJobDate(startISO)} – ${formatJobDate(endISO)}`;
}

/**
 * A job is "late" when its scheduled start has passed but no cleaner has
 * actually started yet — i.e. it's still `ready-to-clean` after the start
 * time. `now` is injected to keep this pure/testable; defaults to wall
 * clock.
 */
export function isJobLate(job: Job, now: number = Date.now()): boolean {
  return (
    job.status === "ready-to-clean" &&
    new Date(job.scheduledStart).getTime() < now
  );
}

// ---------------- Week grouping helpers ----------------

/**
 * Returns the Monday 00:00 (local time) of the week containing the given
 * ISO timestamp. Used as a stable key for grouping jobs in History.
 */
export function getWeekStart(iso: string): Date {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, …
  const diff = day === 0 ? -6 : 1 - day; // back up to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Human-readable label for a week-start Date:
 *   "This week", "Last week", or "Apr 27 – May 3".
 */
export function formatWeekLabel(weekStart: Date, now: Date = new Date()): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const thisWeekStart = getWeekStart(now.toISOString());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  if (weekStart.getTime() === thisWeekStart.getTime()) return "This week";
  if (weekStart.getTime() === lastWeekStart.getTime()) return "Last week";

  const month = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short" });
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${month(weekStart)} ${weekStart.getDate()} – ${weekEnd.getDate()}`;
  }
  return `${month(weekStart)} ${weekStart.getDate()} – ${month(weekEnd)} ${weekEnd.getDate()}`;
}
