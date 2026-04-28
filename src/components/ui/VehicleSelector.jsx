import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import useVehicleSelector from '../../hooks/useVehicleSelector';
import './VehicleSelector.css';

export default function VehicleSelector() {
  const {
    make, model, submodel,
    makes, models, submodels,
    loadingMakes, loadingModels, loadingSubmodels,
    onMakeChange, onModelChange, onSubmodelChange,
    clearVehicle, buildSearchUrl,
  } = useVehicleSelector();
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    const url = buildSearchUrl();
    if (url) navigate(url);
  }

  function handleClear(e) {
    e.preventDefault();
    clearVehicle();
  }

  return (
    <div className="vehicle-bar">
      <div className="container">
        <form className="vehicle-bar-form" onSubmit={handleSubmit}>
          <span className="vehicle-bar-label">
            {make ? 'Your Vehicle' : 'Select Your Vehicle'}
          </span>

          <select
            className="vehicle-bar-select"
            value={make?.id ?? ''}
            onChange={onMakeChange}
            disabled={loadingMakes}
          >
            <option value="">{loadingMakes ? 'Loading…' : 'Select Make'}</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <select
            className="vehicle-bar-select"
            value={model?.id ?? ''}
            onChange={onModelChange}
            disabled={!make || loadingModels}
          >
            <option value="">{loadingModels ? 'Loading…' : 'Select Model'}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <select
            className="vehicle-bar-select"
            value={submodel?.id ?? ''}
            onChange={onSubmodelChange}
            disabled={!model || loadingSubmodels}
          >
            <option value="">{loadingSubmodels ? 'Loading…' : 'Select Submodel'}</option>
            {submodels.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button type="submit" className="vehicle-bar-btn" disabled={!make}>
            Go
          </button>

          {make && (
            <button type="button" className="vehicle-bar-clear" onClick={handleClear} aria-label="Remove vehicle">
              <X size={14} />
              Remove
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
