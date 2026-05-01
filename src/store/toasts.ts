import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
}

interface ToastsState {
  toasts: Toast[];
  push: (message: string) => void;
  dismiss: (id: string) => void;
}

const TOAST_TTL_MS = 3500;

export const useToastsStore = create<ToastsState>((set, get) => ({
  toasts: [],
  push: (message) => {
    const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => get().dismiss(id), TOAST_TTL_MS);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
