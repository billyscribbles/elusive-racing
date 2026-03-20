// Cart drawer UI state only — actual cart data lives in Shopify via useCart()
import { create } from 'zustand';

const useCartStore = create((set) => ({
  isOpen: false,
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
}));

export default useCartStore;
