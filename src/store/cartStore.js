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
            const max = existing.stockQuantity ?? product.stockQuantity ?? null;
            const newQty = max !== null ? Math.min(max, existing.quantity + qty) : existing.quantity + qty;
            return { items: s.items.map((i) => i.id === product.id && i.variantId === product.variantId ? { ...i, quantity: newQty } : i) };
          }
          const max = product.stockQuantity ?? null;
          const clampedQty = max !== null ? Math.min(max, qty) : qty;
          return { items: [...s.items, { ...product, quantity: clampedQty }] };
        });
      },

      addItems: (products) => {
        set((s) => {
          let items = [...s.items];
          for (const product of products) {
            const qty = product.quantity ?? 1;
            const idx = items.findIndex((i) => i.id === product.id && i.variantId === product.variantId);
            if (idx !== -1) {
              const max = items[idx].stockQuantity ?? product.stockQuantity ?? null;
              const newQty = max !== null ? Math.min(max, items[idx].quantity + qty) : items[idx].quantity + qty;
              items[idx] = { ...items[idx], quantity: newQty };
            } else {
              const max = product.stockQuantity ?? null;
              const clampedQty = max !== null ? Math.min(max, qty) : qty;
              items = [...items, { ...product, quantity: clampedQty }];
            }
          }
          return { items };
        });
      },

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        } else {
          set((s) => ({
            items: s.items.map((i) => {
              if (i.id !== id) return i;
              const max = i.stockQuantity ?? null;
              return { ...i, quantity: max !== null ? Math.min(max, quantity) : quantity };
            }),
          }));
        }
      },

      clearCart: () => set({ items: [] }),
    }),
    { name: 'elusive-cart' }
  )
);

export default useCartStore;
