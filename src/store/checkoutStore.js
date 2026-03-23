import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCheckoutStore = create(
  persist(
    (set) => ({
      contact: { email: '', firstName: '', lastName: '', phone: '' },
      shipping: { address1: '', address2: '', city: '', state: '', postcode: '', country: 'Australia' },
      fulfillment: 'delivery',
      freight: null, // { id, label, price } once calculated and selected

      setContact:     (data) => set((s) => ({ contact:  { ...s.contact,  ...data } })),
      setShipping:    (data) => set((s) => ({ shipping: { ...s.shipping, ...data }, freight: null })),
      setFulfillment: (val)  => set({ fulfillment: val, freight: null }),
      setFreight:     (val)  => set({ freight: val }),
    }),
    { name: 'elusive-checkout' }
  )
);

export default useCheckoutStore;
