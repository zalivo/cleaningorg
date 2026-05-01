export interface Property {
  id: string;
  name: string;
  address: string;
  notes?: string;
  ownerId: string; // booker/admin identity id
  /**
   * Coordinates for the embedded map. Resolved via OSM Nominatim
   * (`src/lib/geocode.ts`) when the booker adds or edits a property —
   * see the home form for the call site. Optional only because the
   * geocode call can fail (network down, address that doesn't resolve);
   * the address-only embed is the graceful fallback.
   *
   * Seed values were resolved against Nominatim and rounded to four
   * decimal places (~10 m precision — comfortable inside the marker
   * footprint at zoom 15).
   */
  latitude?: number;
  longitude?: number;
}

export const seedProperties: Property[] = [
  {
    id: "p1",
    name: "Pařížská Apartment",
    address: "Pařížská 5, 110 00 Praha 1",
    notes: "Gate code 4815. Friendly dog (Rex) in the yard.",
    ownerId: "booker-1",
    latitude: 50.0883,
    longitude: 14.4199,
  },
  {
    id: "p2",
    name: "Václavák Office",
    address: "Václavské náměstí 56, 110 00 Praha 1",
    notes: "Reception will let the cleaner in. After-hours only.",
    ownerId: "booker-1",
    latitude: 50.0801,
    longitude: 14.4286,
  },
  {
    id: "p3",
    name: "Vinohrady Flat",
    address: "Korunní 67, 120 00 Praha 2",
    notes: "Buzzer #7B. Spare key under the planter.",
    ownerId: "booker-1",
    latitude: 50.0754,
    longitude: 14.4482,
  },
];
