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

export interface Job {
  id: string;
  propertyId: string;
  propertyName: string; // snapshotted at book time
  address: string;      // snapshotted at book time
  bookerId: string;
  cleanerId: string;
  cleanerName: string;
  reviewerId: string;
  reviewerName: string;
  date: string;         // ISO
  notes?: string;
  status: JobStatus;
  checklist?: ChecklistItem[];
  photoUri?: string;
  declineReason?: string;
  declineCount: number;
  createdAt: string;    // ISO
}

export const seedJobs: Job[] = [
  {
    id: "j1",
    propertyId: "p1",
    propertyName: "Evergreen House",
    address: "742 Evergreen Terrace",
    bookerId: "booker-1",
    cleanerId: "1",
    cleanerName: "Maria Santos",
    reviewerId: "r1",
    reviewerName: "Priya Sharma",
    date: "2026-05-04T10:00:00.000Z",
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
    bookerId: "booker-1",
    cleanerId: "1",
    cleanerName: "Maria Santos",
    reviewerId: "r2",
    reviewerName: "Tom Williams",
    date: "2026-05-02T09:00:00.000Z",
    notes: "Gate code 4815. Friendly dog (Rex) in the yard.",
    status: "ready-for-review",
    checklist: [
      { room: "Kitchen", done: true },
      { room: "Bathroom", done: true },
      { room: "Living areas", done: true },
      { room: "Bedrooms", done: true },
    ],
    declineCount: 0,
    createdAt: "2026-04-30T08:00:00.000Z",
  },
  {
    id: "j3",
    propertyId: "p2",
    propertyName: "Market St Office",
    address: "500 Market St, Floor 3",
    bookerId: "booker-1",
    cleanerId: "3",
    cleanerName: "Aisha Patel",
    reviewerId: "r1",
    reviewerName: "Priya Sharma",
    date: "2026-04-15T18:00:00.000Z",
    notes: "Reception will let the cleaner in. After-hours only.",
    status: "done",
    declineCount: 0,
    createdAt: "2026-04-14T08:00:00.000Z",
  },
];

export function formatJobDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
