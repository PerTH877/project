
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { useAuthStore } from './authStore';

const MAX_HISTORY = 10;

interface HistoryStore {
  productIds: number[];
  pushProduct: (id: number) => void;
  initializeHistory: () => Promise<void>;
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

      initializeHistory: async () => {
        const { productIds } = useHistoryStore.getState();
        const { token } = useAuthStore.getState();

        // Only fetch if history is empty and user is logged in
        if (productIds.length === 0 && token) {
          try {
            const res = await api.get('/users/history');
            const data = res.data?.history || [];
            if (Array.isArray(data) && data.length > 0) {
              // Extract IDs from full product objects
              const ids = data.map((p: any) => p.product_id).filter(Boolean);
              if (ids.length > 0) {
                set({ productIds: ids.slice(0, MAX_HISTORY) });
              }
            }
          } catch (error) {
            console.error("Failed to hydrate browsing history:", error);
          }
        }
      },

      clearHistory: () => set({ productIds: [] }),
    }),
    {
      name: 'paruvo-browsing-history',
    }
  )
);
