import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCheckoutStore = create(
  persist(
    (set) => ({
      contact: { email: '', firstName: '', lastName: '', phone: '' },
      shipping: { address1: '', address2: '', city: '', state: '', postcode: '', country: 'Australia' },
      fulfillment: 'delivery',

      setContact:     (data) => set((s) => ({ contact:  { ...s.contact,  ...data } })),
      setShipping:    (data) => set((s) => ({ shipping: { ...s.shipping, ...data } })),
      setFulfillment: (val)  => set({ fulfillment: val }),
    }),
    { name: 'elusive-checkout' }
  )
);

export default useCheckoutStore;
