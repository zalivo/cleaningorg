export interface Property {
  id: string;
  name: string;
  address: string;
  notes?: string;
  ownerId: string; // booker/admin identity id
}

export const seedProperties: Property[] = [
  {
    id: "p1",
    name: "Evergreen House",
    address: "742 Evergreen Terrace",
    notes: "Gate code 4815. Friendly dog (Rex) in the yard.",
    ownerId: "booker-1",
  },
  {
    id: "p2",
    name: "Market St Office",
    address: "500 Market St, Floor 3",
    notes: "Reception will let the cleaner in. After-hours only.",
    ownerId: "booker-1",
  },
  {
    id: "p3",
    name: "Bayview Condo",
    address: "12 Bayview Ave, Apt 7B",
    notes: "Buzzer #7B. Spare key under the planter.",
    ownerId: "booker-1",
  },
];
