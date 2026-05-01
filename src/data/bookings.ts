import type { ServiceId } from "./services";

export type BookingStatus =
  | "upcoming"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  serviceId: ServiceId;
  serviceName: string;
  proId: string;
  proName: string;
  date: string;
  address: string;
  totalPrice: number;
  status: BookingStatus;
}

export const bookings: Booking[] = [
  {
    id: "b1",
    serviceId: "standard",
    serviceName: "Standard Clean",
    proId: "3",
    proName: "Aisha Patel",
    date: "2026-05-04T10:00:00Z",
    address: "742 Evergreen Terrace",
    totalPrice: 80,
    status: "upcoming",
  },
  {
    id: "b2",
    serviceId: "deep",
    serviceName: "Deep Clean",
    proId: "1",
    proName: "Maria Santos",
    date: "2026-05-12T14:00:00Z",
    address: "742 Evergreen Terrace",
    totalPrice: 150,
    status: "upcoming",
  },
  {
    id: "b3",
    serviceId: "standard",
    serviceName: "Standard Clean",
    proId: "4",
    proName: "David Kim",
    date: "2026-04-15T09:00:00Z",
    address: "742 Evergreen Terrace",
    totalPrice: 80,
    status: "completed",
  },
  {
    id: "b4",
    serviceId: "office",
    serviceName: "Office Clean",
    proId: "3",
    proName: "Aisha Patel",
    date: "2026-04-08T18:00:00Z",
    address: "500 Market St, Floor 3",
    totalPrice: 120,
    status: "completed",
  },
];

export function formatBookingDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
