import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, // { id, email, firstName, lastName, token, role, billing, shipping }

      login:      (data) => set({ user: { ...data.user, token: data.token } }),
      logout:     ()         => set({ user: null }),
      updateUser: (data)     => set(s => ({ user: { ...s.user, ...data } })),
      isLoggedIn: ()         => !!get().user?.token,
      isWholesale: ()        => (get().user?.role || '').startsWith('wholesale_customer'),
      isAdmin:    ()         => get().user?.role === 'administrator',
      getWholesaleTierKey: () => get().user?.wholesaleTier?.role ?? null,
      userTypeLabel: ()      => {
        const role = get().user?.role || '';
        if (role === 'administrator') return 'Admin';
        if (role.startsWith('wholesale_customer')) return get().user?.wholesaleTier?.label || 'Wholesale';
        return 'Customer';
      },
    }),
    { name: 'elusive-auth' }
  )
);

export default useAuthStore;
