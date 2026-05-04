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
        if (!(Number(product.price) > 0)) {
          console.error('[cart] refusing to add zero-priced item', { id: product.id, name: product.name ?? product.title, price: product.price });
          return;
        }
        if (product.stockStatus === 'outofstock') {
          console.error('[cart] refusing to add out-of-stock item', { id: product.id, name: product.name ?? product.title });
          return;
        }
        const qty = product.quantity ?? 1;
        // stockQuantity 0/null = "no max". Out-of-stock items are rejected above,
        // so a 0-stock item that reaches this point is implicitly backorder
        // (orderable, no real cap).
        const stockMax = (n) => (Number(n) > 0 ? Number(n) : null);
        set((s) => {
          const existing = s.items.find((i) => i.id === product.id && i.variantId === product.variantId);
          if (existing) {
            const max = stockMax(existing.stockQuantity ?? product.stockQuantity);
            const newQty = max !== null ? Math.min(max, existing.quantity + qty) : existing.quantity + qty;
            return { items: s.items.map((i) => i.id === product.id && i.variantId === product.variantId ? { ...i, quantity: newQty } : i) };
          }
          const max = stockMax(product.stockQuantity);
          const clampedQty = max !== null ? Math.min(max, qty) : qty;
          const retailPrice = product.retailPrice ?? product.price;
          return { items: [...s.items, { ...product, retailPrice, wholesalePrices: product.wholesalePrices ?? null, quantity: clampedQty }] };
        });
      },

      addItems: (products) => {
        const valid = products.filter((p) => {
          if (!(Number(p.price) > 0)) {
            console.error('[cart] refusing to add zero-priced item', { id: p.id, name: p.name ?? p.title, price: p.price });
            return false;
          }
          if (p.stockStatus === 'outofstock') {
            console.error('[cart] refusing to add out-of-stock item', { id: p.id, name: p.name ?? p.title });
            return false;
          }
          return true;
        });
        if (!valid.length) return;
        const stockMax = (n) => (Number(n) > 0 ? Number(n) : null);
        set((s) => {
          let items = [...s.items];
          for (const product of valid) {
            const qty = product.quantity ?? 1;
            const idx = items.findIndex((i) => i.id === product.id && i.variantId === product.variantId);
            if (idx !== -1) {
              const max = stockMax(items[idx].stockQuantity ?? product.stockQuantity);
              const newQty = max !== null ? Math.min(max, items[idx].quantity + qty) : items[idx].quantity + qty;
              items[idx] = { ...items[idx], quantity: newQty };
            } else {
              const max = stockMax(product.stockQuantity);
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
              // 0 stock means "backorder, no real cap" — see addItem comment.
              const max = Number(i.stockQuantity) > 0 ? Number(i.stockQuantity) : null;
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
    {
      name: 'elusive-cart',
      version: 2,
      // Drop persisted cart whenever we bump the schema. Returning `undefined`
      // is zustand's way of saying "throw out the old state, use defaults".
      migrate: (persistedState, version) => {
        if (version < 1) return undefined;
        // v2: scrub leftover zero-priced AND zero-quantity items from before
        // the backorder fix (backorder products were entering at qty 0
        // because Math.min(stockQuantity=0, 1) = 0).
        if (version < 2 && persistedState?.items) {
          return {
            ...persistedState,
            items: persistedState.items.filter(
              (i) => Number(i.price) > 0 && Number(i.quantity) > 0,
            ),
          };
        }
        return persistedState;
      },
    }
  )
);

export default useCartStore;
