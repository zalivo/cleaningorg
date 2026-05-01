export interface Property {
  id: string;
  name: string;
  address: string;
  notes?: string;
  ownerId: string; // booker/admin identity id
  // Optional coordinates. When present, the embedded map renders these
  // directly (Google's ?output=embed view doesn't geocode free-text query
  // strings reliably). Manually-added properties leave these undefined and
  // fall back to the address-only view, which is fine for the demo.
  latitude?: number;
  longitude?: number;
}

export const seedProperties: Property[] = [
  {
    id: "p1",
    name: "Evergreen House",
    address: "742 Evergreen Terrace",
    notes: "Gate code 4815. Friendly dog (Rex) in the yard.",
    ownerId: "booker-1",
    latitude: 39.7817,
    longitude: -89.6501,
  },
  {
    id: "p2",
    name: "Market St Office",
    address: "500 Market St, Floor 3",
    notes: "Reception will let the cleaner in. After-hours only.",
    ownerId: "booker-1",
    latitude: 37.7891,
    longitude: -122.3994,
  },
  {
    id: "p3",
    name: "Bayview Condo",
    address: "12 Bayview Ave, Apt 7B",
    notes: "Buzzer #7B. Spare key under the planter.",
    ownerId: "booker-1",
    latitude: 37.708,
    longitude: -122.3796,
  },
];
