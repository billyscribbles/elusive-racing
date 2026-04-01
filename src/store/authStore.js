import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, // { id, email, firstName, lastName, token, billing, shipping }

      login:      (userData) => set({ user: userData }),
      logout:     ()         => set({ user: null }),
      updateUser: (data)     => set(s => ({ user: { ...s.user, ...data } })),
      isLoggedIn: ()         => !!get().user?.token,
    }),
    { name: 'elusive-auth' }
  )
);

export default useAuthStore;
