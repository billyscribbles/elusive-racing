import { useState } from 'react';
import { vehicleData } from '../data/navigation';
import './VehicleSelector.css';

export default function VehicleSelector() {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  const models = make ? (vehicleData.models[make] || []) : [];

  const handleMakeChange = (e) => {
    setMake(e.target.value);
    setModel('');
    setYear('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (make) {
      const params = new URLSearchParams();
      if (make) params.set('make', make);
      if (model) params.set('model', model);
      if (year) params.set('year', year);
      window.location.href = `/search?${params.toString()}`;
    }
  };

  return (
    <div className="vehicle-bar">
      <div className="container">
        <form className="vehicle-bar-form" onSubmit={handleSubmit}>
          <span className="vehicle-bar-label">Select Your Vehicle</span>

          <select
            className="vehicle-bar-select"
            value={make}
            onChange={handleMakeChange}
          >
            <option value="">Select Make</option>
            {vehicleData.makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            className="vehicle-bar-select"
            value={model}
            onChange={(e) => { setModel(e.target.value); setYear(''); }}
            disabled={!make}
          >
            <option value="">Select Model</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            className="vehicle-bar-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={!model}
          >
            <option value="">Select Year / Submodel</option>
            {vehicleData.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            type="submit"
            className="vehicle-bar-btn"
            disabled={!make}
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
