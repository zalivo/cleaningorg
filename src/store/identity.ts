import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { identities, type Identity } from "@/data/identities";

interface IdentityState {
  activeIdentityId: string;
  setActiveIdentity: (id: string) => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      activeIdentityId: identities[0].id,
      setActiveIdentity: (id) => set({ activeIdentityId: id }),
    }),
    {
      name: "cleaningorg/identity",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function useActiveIdentity(): Identity {
  const id = useIdentityStore((s) => s.activeIdentityId);
  return identities.find((i) => i.id === id) ?? identities[0];
}
