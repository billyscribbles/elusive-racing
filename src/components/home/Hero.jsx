import { useState, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, X } from 'lucide-react';
import { vehicleData } from '../../data/navigation';
import useVehicleStore from '../../store/vehicleStore';
import './Hero.css';

function DesktopFinder() {
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

  return (
    <form className="vf-form" onSubmit={handleSubmit}>
      <div className="vf-icon">
        <Gauge size={28} strokeWidth={1.75} />
      </div>
      <h2 className="vf-title">Find Parts For<br />Your Vehicle</h2>
      <p className="vf-sub">
        {make
          ? `Your vehicle: ${[make, model, year].filter(Boolean).join(' ')}`
          : 'Select your vehicle to find compatible parts'}
      </p>
      <div className="vf-selects">
        <select className="vf-select" value={make} onChange={handleMakeChange} aria-label="Vehicle make">
          <option value="">Select Make</option>
          {vehicleData.makes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="vf-select" value={model} onChange={handleModelChange} disabled={!make} aria-label="Vehicle model">
          <option value="">Select Model</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="vf-select" value={year} onChange={handleYearChange} disabled={!model} aria-label="Vehicle year">
          <option value="">Select Year</option>
          {vehicleData.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {make && (
          <button type="button" className="vf-remove-btn" onClick={clearVehicle}>
            <X size={13} />
            Remove Vehicle
          </button>
        )}
      </div>
      <button type="submit" className="vf-btn" disabled={!make}>
        Search Parts
      </button>
    </form>
  );
}

function MobileFinderForm() {
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

  return (
    <form className="vehicle-bar-form" onSubmit={handleSubmit}>
      <div className="vehicle-bar-selects">
        <select className="vb-select" value={make} onChange={handleMakeChange} aria-label="Vehicle make">
          <option value="">Select Make</option>
          {vehicleData.makes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="vb-select" value={model} onChange={handleModelChange} disabled={!make} aria-label="Vehicle model">
          <option value="">Select Model</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="vb-select" value={year} onChange={handleYearChange} disabled={!model} aria-label="Vehicle year">
          <option value="">Select Year / Submodel</option>
          {vehicleData.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button type="submit" className="vb-btn" disabled={!make}>GO</button>
      {make && (
        <button type="button" className="vb-clear-btn" onClick={clearVehicle} aria-label="Remove vehicle">
          <X size={14} />
        </button>
      )}
    </form>
  );
}

export default function Hero() {
  const [videoReady, setVideoReady] = useState(false);
  const [isMobile] = useState(() => window.innerWidth <= 900);

  useLayoutEffect(() => {
    if (isMobile) {
      document.documentElement.style.setProperty('--finder-height', '50px');
      return () => {
        document.documentElement.style.setProperty('--finder-height', '0px');
      };
    }
  }, [isMobile]);

  return (
    <>
      {/* ── Desktop: video left + floating finder right ── */}
      <div className="hero-desktop">
        <div className="hero-video-panel">
          <img src="/hnats1.jpg" alt="" className="hero-poster" fetchpriority="high" width={1280} height={800} />
          {!isMobile && (
            <video
              className={`hero-video ${videoReady ? 'hero-video--ready' : ''}`}
              autoPlay
              muted
              loop
              playsInline
              onCanPlay={() => setVideoReady(true)}
            >
              <source src="/hero-video.mp4" type="video/mp4" />
            </video>
          )}
          <div className="hero-overlay" />
          <div className="hero-video-content">
            <span className="hero-tag">Melbourne, Australia</span>
            <h1 className="hero-headline">Honda Performance<br />Specialists</h1>
            <p className="hero-sub">10,000+ genuine &amp; aftermarket parts.<br />Over a decade of expertise.</p>
            <div className="hero-actions">
              <a href="/shop" className="hero-btn-primary">Shop Now</a>
              <a href="/about" className="hero-btn-ghost">Our Story</a>
            </div>
          </div>
        </div>
        <div className="hero-finder-panel">
          <DesktopFinder />
        </div>
      </div>

      {/* ── Mobile: vehicle bar at top (always visible) + hero image ── */}
      <div className="hero-mobile">
        <div className="vehicle-bar">
          <div className="container vehicle-bar-inner">
            <div className="vehicle-bar-label">
              <Gauge size={20} strokeWidth={1.75} />
              <span>Find Parts For<br/>Your Vehicle</span>
            </div>
            <div className="vehicle-bar-divider" />
            <MobileFinderForm />
          </div>
        </div>

        <div className="hero-mobile-img-wrap">
          <img src="/hnats1.jpg" alt="" className="hero-mobile-img" width={640} height={400} />
          <div className="hero-mobile-overlay" />
          <div className="hero-mobile-content">
            <span className="hero-mobile-tag">Melbourne, Australia</span>
            <h1 className="hero-mobile-headline">Honda Performance<br />Specialists</h1>
            <p className="hero-mobile-sub">10,000+ parts. Over a decade of expertise.</p>
            <div className="hero-mobile-actions">
              <a href="/shop" className="hero-btn-primary">Shop Now</a>
              <a href="/services" className="hero-btn-ghost">Our Services</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
