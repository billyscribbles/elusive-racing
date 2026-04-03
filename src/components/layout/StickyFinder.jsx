import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, X } from 'lucide-react';
import { vehicleData } from '../../data/navigation';
import useVehicleStore from '../../store/vehicleStore';
import './StickyFinder.css';

export default function StickyFinder() {
  const { make, model, year, setVehicle, clearVehicle } = useVehicleStore();
  const navigate = useNavigate();

  const models = make ? (vehicleData.models[make] || []) : [];

  // Animate bar in/out on scroll + keep --finder-height in sync
  useEffect(() => {
    const setFinderHeight = (visible) => {
      if (window.innerWidth > 900) {
        document.documentElement.style.setProperty('--finder-height', visible ? '52px' : '0px');
      }
    };

    let ticking = false;
    const bar = document.querySelector('.sticky-finder');
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const threshold = window.innerWidth <= 900 ? 200 : window.innerHeight * 0.55;
        const visible = window.scrollY > threshold;
        bar?.classList.toggle('sticky-finder--visible', visible);
        setFinderHeight(visible);
        ticking = false;
      });
    };

    // Initialise on mount
    setFinderHeight(false);

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      setFinderHeight(false);
    };
  }, []);

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

  return (
    <div className="sticky-finder">
      <form className="sticky-finder-form" onSubmit={handleSubmit}>
        <div className="sticky-finder-label">
          <Gauge size={18} strokeWidth={1.75} />
          <span>Find Parts</span>
        </div>
        <div className="sticky-finder-divider" />
        <div className="sticky-finder-selects">
          <select
            className="sticky-finder-select"
            value={make}
            onChange={handleMakeChange}
            aria-label="Vehicle make"
          >
            <option value="">Make</option>
            {vehicleData.makes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            className="sticky-finder-select"
            value={model}
            onChange={handleModelChange}
            disabled={!make}
            aria-label="Vehicle model"
          >
            <option value="">Model</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            className="sticky-finder-select"
            value={year}
            onChange={handleYearChange}
            disabled={!model}
            aria-label="Vehicle year"
          >
            <option value="">Year</option>
            {vehicleData.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="submit" className="sticky-finder-btn" disabled={!make}>
          Search
        </button>
        {make && (
          <button
            type="button"
            className="sticky-finder-clear"
            onClick={(e) => { e.preventDefault(); clearVehicle(); }}
            aria-label="Remove vehicle"
          >
            <X size={13} />
          </button>
        )}
      </form>
    </div>
  );
}
