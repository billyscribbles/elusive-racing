import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getWholesalePrice } from '../hooks/useWholesalePrice';

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
          const retailPrice = product.retailPrice ?? product.price;
          return { items: [...s.items, { ...product, retailPrice, wholesalePrices: product.wholesalePrices ?? null, quantity: clampedQty }] };
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
              const retailPrice = product.retailPrice ?? product.price;
              items = [...items, { ...product, retailPrice, wholesalePrices: product.wholesalePrices ?? null, quantity: clampedQty }];
            }
          }
          return { items };
        });
      },

      removeItem: (id, variantId) =>
        set((s) => ({ items: s.items.filter((i) => !(i.id === id && i.variantId === variantId)) })),

      updateQuantity: (id, variantId, quantity) => {
        if (quantity < 1) {
          set((s) => ({ items: s.items.filter((i) => !(i.id === id && i.variantId === variantId)) }));
        } else {
          set((s) => ({
            items: s.items.map((i) => {
              if (!(i.id === id && i.variantId === variantId)) return i;
              const max = i.stockQuantity ?? null;
              return { ...i, quantity: max !== null ? Math.min(max, quantity) : quantity };
            }),
          }));
        }
      },

      repriceAll: (tierKey) =>
        set((s) => ({
          items: s.items.map((i) => {
            const retail = i.retailPrice ?? i.price;
            const { effectivePrice } = getWholesalePrice(retail, i.wholesalePrices, tierKey);
            return { ...i, price: effectivePrice };
          }),
        })),

      clearCart: () => set({ items: [] }),
    }),
    { name: 'elusive-cart' }
  )
);

export default useCartStore;
