import { useState, useEffect } from 'react';
import { Gauge } from 'lucide-react';
import { vehicleData } from '../../data/navigation';
import './StickyFinder.css';

export default function StickyFinder() {
  const [visible, setVisible] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  const models = make ? (vehicleData.models[make] || []) : [];

  useEffect(() => {
    const onScroll = () => {
      const threshold = window.innerWidth <= 900 ? 200 : window.innerHeight * 0.55;
      setVisible(window.scrollY > threshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (window.innerWidth > 900) {
      document.documentElement.style.setProperty('--finder-height', visible ? '52px' : '0px');
    }
    return () => {
      document.documentElement.style.setProperty('--finder-height', '0px');
    };
  }, [visible]);

  const handleMakeChange = (e) => { setMake(e.target.value); setModel(''); setYear(''); };
  const handleModelChange = (e) => { setModel(e.target.value); setYear(''); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!make) return;
    const params = new URLSearchParams();
    params.set('make', make);
    if (model) params.set('model', model);
    if (year) params.set('year', year);
    window.location.href = `/search?${params.toString()}`;
  };

  return (
    <div className={`sticky-finder ${visible ? 'sticky-finder--visible' : ''}`}>
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
            onChange={(e) => setYear(e.target.value)}
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
      </form>
    </div>
  );
}
