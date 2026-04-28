import { useEffect, useState } from 'react';
import useVehicleStore from '../store/vehicleStore';
import { getVehicleMakes, getVehicleModels, getVehicleSubmodels } from '../lib/woocommerce';

// Shared data-loading + handler logic for the Make/Model/Submodel cascade.
// Used by Hero (desktop + mobile finder forms), StickyFinder, and VehicleSelector.
//
// Returns selected term objects (not strings), the three dropdown lists,
// onChange handlers for native <select>s, a clearVehicle action, and a
// buildSearchUrl() helper that produces the /search?vehicle_make=…&… URL
// the Go button submits to.
export default function useVehicleSelector() {
  const make     = useVehicleStore((s) => s.make);
  const model    = useVehicleStore((s) => s.model);
  const submodel = useVehicleStore((s) => s.submodel);
  const setMake     = useVehicleStore((s) => s.setMake);
  const setModel    = useVehicleStore((s) => s.setModel);
  const setSubmodel = useVehicleStore((s) => s.setSubmodel);
  const clearVehicle = useVehicleStore((s) => s.clearVehicle);

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [submodels, setSubmodels] = useState([]);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingSubmodels, setLoadingSubmodels] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingMakes(true);
    getVehicleMakes()
      .then((data) => { if (alive) setMakes(data); })
      .catch(() => { if (alive) setMakes([]); })
      .finally(() => { if (alive) setLoadingMakes(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!make) { setModels([]); setSubmodels([]); return; }
    let alive = true;
    setLoadingModels(true);
    getVehicleModels(make.id)
      .then((data) => { if (alive) setModels(data); })
      .catch(() => { if (alive) setModels([]); })
      .finally(() => { if (alive) setLoadingModels(false); });
    return () => { alive = false; };
  }, [make?.id]);

  useEffect(() => {
    if (!model) { setSubmodels([]); return; }
    let alive = true;
    setLoadingSubmodels(true);
    getVehicleSubmodels(model.id)
      .then((data) => { if (alive) setSubmodels(data); })
      .catch(() => { if (alive) setSubmodels([]); })
      .finally(() => { if (alive) setLoadingSubmodels(false); });
    return () => { alive = false; };
  }, [model?.id]);

  function onMakeChange(e) {
    const id = parseInt(e.target.value, 10);
    setMake(makes.find((m) => m.id === id) ?? null);
  }
  function onModelChange(e) {
    const id = parseInt(e.target.value, 10);
    setModel(models.find((m) => m.id === id) ?? null);
  }
  function onSubmodelChange(e) {
    const id = parseInt(e.target.value, 10);
    setSubmodel(submodels.find((s) => s.id === id) ?? null);
  }

  function buildSearchUrl() {
    if (!make) return null;
    const p = new URLSearchParams();
    p.set('vehicle_make', make.slug);
    if (model)    p.set('vehicle_model', model.slug);
    if (submodel) p.set('vehicle_submodel', submodel.slug);
    return `/search?${p.toString()}`;
  }

  return {
    make, model, submodel,
    makes, models, submodels,
    loadingMakes, loadingModels, loadingSubmodels,
    onMakeChange, onModelChange, onSubmodelChange,
    clearVehicle, buildSearchUrl,
  };
}
