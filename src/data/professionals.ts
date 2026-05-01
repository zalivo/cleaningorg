import type { ServiceId } from "./services";

export interface Professional {
  id: string;
  name: string;
  rating: number;
  jobsCompleted: number;
  bio: string;
  specialties: ServiceId[];
  hourlyRate: number;
  yearsExperience: number;
  avatarColor: string;
}

export const professionals: Professional[] = [
  {
    id: "1",
    name: "Maria Santos",
    rating: 4.9,
    jobsCompleted: 312,
    bio: "Detail-oriented cleaner with 8 years of experience in residential homes. Loves a sparkling kitchen.",
    specialties: ["standard", "deep"],
    hourlyRate: 35,
    yearsExperience: 8,
    avatarColor: "#F87171",
  },
  {
    id: "2",
    name: "James Chen",
    rating: 4.8,
    jobsCompleted: 198,
    bio: "Specialist in post-construction and move-out cleans. Eco-friendly products only.",
    specialties: ["post-construction", "move-out"],
    hourlyRate: 45,
    yearsExperience: 5,
    avatarColor: "#60A5FA",
  },
  {
    id: "3",
    name: "Aisha Patel",
    rating: 5.0,
    jobsCompleted: 421,
    bio: "Top-rated pro. Office cleaning specialist with night-shift availability.",
    specialties: ["office", "standard"],
    hourlyRate: 40,
    yearsExperience: 10,
    avatarColor: "#34D399",
  },
  {
    id: "4",
    name: "David Kim",
    rating: 4.7,
    jobsCompleted: 156,
    bio: "Reliable and friendly. Pet-owner friendly. Available evenings and weekends.",
    specialties: ["standard", "deep"],
    hourlyRate: 32,
    yearsExperience: 4,
    avatarColor: "#FBBF24",
  },
  {
    id: "5",
    name: "Sofia Rodriguez",
    rating: 4.9,
    jobsCompleted: 287,
    bio: "Bilingual (English/Spanish). Specializes in deep cleans and allergy-sensitive homes.",
    specialties: ["deep", "standard"],
    hourlyRate: 38,
    yearsExperience: 6,
    avatarColor: "#A78BFA",
  },
];

export function getProfessional(id: string): Professional | undefined {
  return professionals.find((p) => p.id === id);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
