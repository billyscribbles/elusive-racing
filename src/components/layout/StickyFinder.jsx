import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, X } from 'lucide-react';
import useVehicleSelector from '../../hooks/useVehicleSelector';
import './StickyFinder.css';

export default function StickyFinder() {
  const {
    make, model, submodel,
    makes, models, submodels,
    loadingMakes, loadingModels, loadingSubmodels,
    onMakeChange, onModelChange, onSubmodelChange,
    clearVehicle, buildSearchUrl,
  } = useVehicleSelector();
  const navigate = useNavigate();

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

    setFinderHeight(false);

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      setFinderHeight(false);
    };
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const url = buildSearchUrl();
    if (url) navigate(url);
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
            value={make?.id ?? ''}
            onChange={onMakeChange}
            disabled={loadingMakes}
            aria-label="Vehicle make"
          >
            <option value="">{loadingMakes ? '…' : 'Make'}</option>
            {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select
            className="sticky-finder-select"
            value={model?.id ?? ''}
            onChange={onModelChange}
            disabled={!make || loadingModels}
            aria-label="Vehicle model"
          >
            <option value="">{loadingModels ? '…' : 'Model'}</option>
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select
            className="sticky-finder-select"
            value={submodel?.id ?? ''}
            onChange={onSubmodelChange}
            disabled={!model || loadingSubmodels}
            aria-label="Vehicle submodel"
          >
            <option value="">{loadingSubmodels ? '…' : 'Submodel'}</option>
            {submodels.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
