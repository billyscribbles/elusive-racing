import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Each slot holds a term object `{ id, name, slug }` (from the
// vehicle_fitment WP taxonomy) or `null` when not selected.
//
// Migration: localStorage keys written before 2026-04 stored
// `{ make, model, year }` as strings. The persist middleware will load that
// shape, and our migrate() drops it (we have no slug to recover from
// labels). Bump the version to invalidate any in-flight stale shape.

const useVehicleStore = create(
  persist(
    (set) => ({
      make:     null,
      model:    null,
      submodel: null,

      setMake: (make) => set({ make: make ?? null, model: null, submodel: null }),
      setModel: (model) => set((s) => ({ model: model ?? null, submodel: null, make: s.make })),
      setSubmodel: (submodel) => set((s) => ({ submodel: submodel ?? null, make: s.make, model: s.model })),

      clearVehicle: () => set({ make: null, model: null, submodel: null }),
    }),
    {
      name: 'elusive-vehicle',
      version: 2,
      migrate: () => ({ make: null, model: null, submodel: null }),
    }
  )
);

export default useVehicleStore;
