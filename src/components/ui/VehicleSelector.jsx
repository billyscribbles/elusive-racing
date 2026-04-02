import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { vehicleData } from '../../data/navigation';
import useVehicleStore from '../../store/vehicleStore';
import './VehicleSelector.css';

export default function VehicleSelector() {
  const { make, model, year, setVehicle, clearVehicle } = useVehicleStore();
  const navigate = useNavigate();

  const models = make ? (vehicleData.models[make] || []) : [];

  function handleMakeChange(e)  { setVehicle(e.target.value, '', ''); }
  function handleModelChange(e) { setVehicle(make, e.target.value, ''); }
  function handleYearChange(e)  { setVehicle(make, model, e.target.value); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!make) return;
    const params = new URLSearchParams();
    params.set('make', make);
    if (model) params.set('model', model);
    if (year)  params.set('year', year);
    navigate(`/search?${params.toString()}`);
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

          <select className="vehicle-bar-select" value={make} onChange={handleMakeChange}>
            <option value="">Select Make</option>
            {vehicleData.makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select className="vehicle-bar-select" value={model} onChange={handleModelChange} disabled={!make}>
            <option value="">Select Model</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select className="vehicle-bar-select" value={year} onChange={handleYearChange} disabled={!model}>
            <option value="">Select Year / Submodel</option>
            {vehicleData.years.map((y) => (
              <option key={y} value={y}>{y}</option>
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
