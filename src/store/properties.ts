import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { type Property, seedProperties } from "@/data/properties";

export interface AddPropertyInput {
  name: string;
  address: string;
  notes?: string;
  ownerId: string;
  /**
   * Optional coordinates. The booking flow expects callers (the home
   * form) to pre-resolve these via `geocodeAddress` so the store stays
   * synchronous. `undefined` is a valid value when geocoding fails — the
   * embedded map degrades to its address-only view.
   */
  latitude?: number;
  longitude?: number;
}

interface PropertiesState {
  properties: Property[];
  addProperty: (input: AddPropertyInput) => Property;
  updateProperty: (
    id: string,
    patch: Partial<Omit<Property, "id" | "ownerId">>
  ) => void;
  deleteProperty: (id: string) => void;
  resetDemo: () => void;
}

export const usePropertiesStore = create<PropertiesState>()(
  persist(
    (set) => ({
      properties: seedProperties,
      addProperty: (input) => {
        const property: Property = {
          id: `p${Date.now()}`,
          name: input.name.trim(),
          address: input.address.trim(),
          notes: input.notes?.trim() || undefined,
          ownerId: input.ownerId,
          latitude: input.latitude,
          longitude: input.longitude,
        };
        set((s) => ({ properties: [property, ...s.properties] }));
        return property;
      },
      updateProperty: (id, patch) => {
        set((s) => ({
          properties: s.properties.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        }));
      },
      deleteProperty: (id) => {
        set((s) => ({
          properties: s.properties.filter((p) => p.id !== id),
        }));
      },
      resetDemo: () => set({ properties: seedProperties }),
    }),
    {
      // v3 = real Czech seed addresses + Nominatim-resolved coords. Same
      //      shape as v2, but v2 payloads carry US fixture data which
      //      would point the embedded map at the wrong continent.
      // v2 = adds optional latitude/longitude on properties.
      name: "cleaningorg/properties.v3",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function usePropertiesForOwner(ownerId: string): Property[] {
  return usePropertiesStore(
    useShallow((s) => s.properties.filter((p) => p.ownerId === ownerId))
  );
}

export function useProperty(id: string | undefined): Property | undefined {
  return usePropertiesStore((s) =>
    id ? s.properties.find((p) => p.id === id) : undefined
  );
}
