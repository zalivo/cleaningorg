import type { ServiceId } from "./services";

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
  serviceId: ServiceId;
  serviceName: string;
  bookerId: string;
  cleanerId: string;
  cleanerName: string;
  reviewerId: string;
  reviewerName: string;
  date: string; // ISO
  address: string;
  notes?: string;
  totalPrice: number;
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
    serviceId: "standard",
    serviceName: "Standard Clean",
    bookerId: "booker-1",
    cleanerId: "1",
    cleanerName: "Maria Santos",
    reviewerId: "r1",
    reviewerName: "Priya Sharma",
    date: "2026-05-04T10:00:00.000Z",
    address: "742 Evergreen Terrace",
    totalPrice: 80,
    status: "ready-to-clean",
    declineCount: 0,
    createdAt: "2026-05-01T08:00:00.000Z",
  },
  {
    id: "j2",
    serviceId: "deep",
    serviceName: "Deep Clean",
    bookerId: "booker-1",
    cleanerId: "1",
    cleanerName: "Maria Santos",
    reviewerId: "r2",
    reviewerName: "Tom Williams",
    date: "2026-05-02T09:00:00.000Z",
    address: "742 Evergreen Terrace",
    totalPrice: 150,
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
    serviceId: "office",
    serviceName: "Office Clean",
    bookerId: "booker-1",
    cleanerId: "3",
    cleanerName: "Aisha Patel",
    reviewerId: "r1",
    reviewerName: "Priya Sharma",
    date: "2026-04-15T18:00:00.000Z",
    address: "500 Market St, Floor 3",
    totalPrice: 120,
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
