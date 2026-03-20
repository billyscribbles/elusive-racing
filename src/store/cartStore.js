import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: (product) => {
        set((s) => {
          const existing = s.items.find((i) => i.id === product.id);
          if (existing) {
            return { items: s.items.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) };
          }
          return { items: [...s.items, { ...product, quantity: 1 }] };
        });
      },

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        } else {
          set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, quantity } : i) }));
        }
      },

      clearCart: () => set({ items: [] }),
    }),
    { name: 'elusive-cart' }
  )
);

export default useCartStore;
