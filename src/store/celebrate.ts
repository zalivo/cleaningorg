import { create } from "zustand";

export type CelebrateKind = "confetti" | "booking" | "cleanDone" | "approve";

interface CelebrateState {
  active: boolean;
  /** Increments on every trigger so the Confetti component can remount its
   *  particle subtree and replay the animation even mid-flight. */
  triggerCount: number;
  kind: CelebrateKind;
  trigger: (kind?: CelebrateKind) => void;
  dismiss: () => void;
}

export const useCelebrateStore = create<CelebrateState>((set) => ({
  active: false,
  triggerCount: 0,
  kind: "confetti",
  trigger: (kind: CelebrateKind = "confetti") =>
    set((s) => ({
      active: true,
      triggerCount: s.triggerCount + 1,
      kind,
    })),
  dismiss: () => set({ active: false }),
}));
