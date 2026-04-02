import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useVehicleStore = create(
  persist(
    (set) => ({
      make:  '',
      model: '',
      year:  '',
      setVehicle:   (make, model, year) => set({ make, model, year }),
      clearVehicle: () => set({ make: '', model: '', year: '' }),
    }),
    { name: 'elusive-vehicle' }
  )
);

export default useVehicleStore;
