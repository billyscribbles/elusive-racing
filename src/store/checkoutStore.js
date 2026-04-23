import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCheckoutStore = create(
  persist(
    (set) => ({
      contact: { email: '', firstName: '', lastName: '', phone: '' },
      shipping: { address1: '', address2: '', city: '', state: '', postcode: '', country: 'Australia' },
      fulfillment: 'delivery',
      freight: null, // { id, label, price } once calculated and selected
      // Afterpay uses a full-page redirect, so we stash the token here
      // (persisted to localStorage) and pick it up on the return page.
      afterpayOrderToken: null,

      setContact:     (data) => set((s) => ({ contact:  { ...s.contact,  ...data } })),
      setShipping:    (data) => set((s) => ({ shipping: { ...s.shipping, ...data }, freight: null })),
      setFulfillment: (val)  => set({ fulfillment: val, freight: null }),
      setFreight:     (val)  => set({ freight: val }),
      setAfterpayOrderToken: (val) => set({ afterpayOrderToken: val }),
      resetCheckout:  ()     => set({
        contact:     { email: '', firstName: '', lastName: '', phone: '' },
        shipping:    { address1: '', address2: '', city: '', state: '', postcode: '', country: 'Australia' },
        fulfillment: 'delivery',
        freight:     null,
        afterpayOrderToken: null,
      }),
    }),
    { name: 'elusive-checkout' }
  )
);

export default useCheckoutStore;
