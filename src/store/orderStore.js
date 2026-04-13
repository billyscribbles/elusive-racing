import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useOrderStore = create(
  persist(
    (set) => ({
      order: null,

      setOrder: (data) => set({ order: data }),
      clearOrder: () => set({ order: null }),
    }),
    {
      name: 'elusive-order',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useOrderStore;
