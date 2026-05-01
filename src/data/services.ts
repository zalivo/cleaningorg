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
  /** Reference flat price in whole korunas (CZK). Display only — actual job
   *  totals come from the cleaner's hourly rate × scheduled duration. */
  price: number;
  durationHours: number;
  icon: ServiceIcon;
}

export const services: Service[] = [
  {
    id: "standard",
    name: "Standard Clean",
    description: "Kitchen, bathrooms, bedrooms, common areas",
    price: 800,
    durationHours: 2,
    icon: "home-outline",
  },
  {
    id: "deep",
    name: "Deep Clean",
    description: "Everything plus inside appliances, windows, baseboards",
    price: 1500,
    durationHours: 4,
    icon: "sparkles-outline",
  },
  {
    id: "move-out",
    name: "Move-out Clean",
    description: "Empty home, ready-to-handover quality",
    price: 2000,
    durationHours: 5,
    icon: "cube-outline",
  },
  {
    id: "office",
    name: "Office Clean",
    description: "Desks, breakrooms, shared spaces",
    price: 1200,
    durationHours: 3,
    icon: "business-outline",
  },
  {
    id: "post-construction",
    name: "Post-construction",
    description: "Dust, debris, and fine particles after renovation",
    price: 2500,
    durationHours: 6,
    icon: "hammer-outline",
  },
];

export function getService(id: string): Service | undefined {
  return services.find((s) => s.id === id);
}
