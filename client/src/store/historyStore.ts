import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_HISTORY = 10;

interface HistoryStore {
  productIds: number[];
  pushProduct: (id: number) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      productIds: [],

      pushProduct: (id: number) =>
        set((state) => {
          // Remove the id if it already exists (to re-insert at front)
          const filtered = state.productIds.filter((existing) => existing !== id);
          // Prepend and cap at MAX_HISTORY
          return { productIds: [id, ...filtered].slice(0, MAX_HISTORY) };
        }),

      clearHistory: () => set({ productIds: [] }),
    }),
    {
      name: 'paruvo-browsing-history',
    }
  )
);
