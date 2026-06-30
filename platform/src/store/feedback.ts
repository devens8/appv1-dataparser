import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FeedbackEntry {
  id: string;
  rating: number; // 1–5
  category: string;
  message: string;
  author: string;
  createdAt: number;
}

interface FeedbackState {
  entries: FeedbackEntry[];
  hydrated: boolean;
  setHydrated: () => void;
  addFeedback: (e: Omit<FeedbackEntry, "id" | "createdAt">) => void;
  removeFeedback: (id: string) => void;
}

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set) => ({
      entries: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      addFeedback: (e) =>
        set((s) => ({
          entries: [
            { ...e, id: uid(), createdAt: Date.now() },
            ...s.entries,
          ],
        })),
      removeFeedback: (id) =>
        set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
    }),
    {
      name: "strata-feedback",
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
