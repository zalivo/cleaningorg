import { create } from "zustand";

interface CelebrateState {
  active: boolean;
  alreadyCelebrated: boolean;
  triggerOnce: () => void;
  dismiss: () => void;
}

export const useCelebrateStore = create<CelebrateState>((set, get) => ({
  active: false,
  alreadyCelebrated: false,
  triggerOnce: () => {
    if (get().alreadyCelebrated) return;
    set({ active: true, alreadyCelebrated: true });
  },
  dismiss: () => set({ active: false }),
}));
