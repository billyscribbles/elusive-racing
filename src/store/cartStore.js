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
        const qty = product.quantity ?? 1;
        set((s) => {
          const existing = s.items.find((i) => i.id === product.id && i.variantId === product.variantId);
          if (existing) {
            return { items: s.items.map((i) => i.id === product.id && i.variantId === product.variantId ? { ...i, quantity: i.quantity + qty } : i) };
          }
          return { items: [...s.items, { ...product, quantity: qty }] };
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
