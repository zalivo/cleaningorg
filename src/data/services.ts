export type ServiceId =
  | "standard"
  | "deep"
  | "move-out"
  | "office"
  | "post-construction";

export type ServiceIcon =
  | "home-outline"
  | "sparkles-outline"
  | "cube-outline"
  | "business-outline"
  | "hammer-outline";

export interface Service {
  id: ServiceId;
  name: string;
  description: string;
  price: number;
  durationHours: number;
  icon: ServiceIcon;
}

export const services: Service[] = [
  {
    id: "standard",
    name: "Standard Clean",
    description: "Kitchen, bathrooms, bedrooms, common areas",
    price: 80,
    durationHours: 2,
    icon: "home-outline",
  },
  {
    id: "deep",
    name: "Deep Clean",
    description: "Everything plus inside appliances, windows, baseboards",
    price: 150,
    durationHours: 4,
    icon: "sparkles-outline",
  },
  {
    id: "move-out",
    name: "Move-out Clean",
    description: "Empty home, ready-to-handover quality",
    price: 200,
    durationHours: 5,
    icon: "cube-outline",
  },
  {
    id: "office",
    name: "Office Clean",
    description: "Desks, breakrooms, shared spaces",
    price: 120,
    durationHours: 3,
    icon: "business-outline",
  },
  {
    id: "post-construction",
    name: "Post-construction",
    description: "Dust, debris, and fine particles after renovation",
    price: 250,
    durationHours: 6,
    icon: "hammer-outline",
  },
];

export function getService(id: string): Service | undefined {
  return services.find((s) => s.id === id);
}
