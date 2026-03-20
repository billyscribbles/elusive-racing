import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { vehicleData } from '../../data/navigation';
import './Hero.css';

function useVehicleForm() {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const models = make ? (vehicleData.models[make] || []) : [];

  const handleMakeChange = (e) => { setMake(e.target.value); setModel(''); setYear(''); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!make) return;
    const params = new URLSearchParams();
    params.set('make', make);
    if (model) params.set('model', model);
    if (year) params.set('year', year);
    window.location.href = `/search?${params.toString()}`;
  };

  return { make, model, year, models, handleMakeChange, handleModelChange: (e) => { setModel(e.target.value); setYear(''); }, handleYearChange: (e) => setYear(e.target.value), handleSubmit };
}

function DesktopFinder() {
  const { make, model, year, models, handleMakeChange, handleModelChange, handleYearChange, handleSubmit } = useVehicleForm();

  return (
    <form className="vf-form" onSubmit={handleSubmit}>
      <div className="vf-icon">
        <Gauge size={28} strokeWidth={1.75} />
      </div>
      <h2 className="vf-title">Find Parts For<br />Your Vehicle</h2>
      <p className="vf-sub">Select your vehicle to find compatible parts</p>
      <div className="vf-selects">
        <select className="vf-select" value={make} onChange={handleMakeChange}>
          <option value="">Select Make</option>
          {vehicleData.makes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="vf-select" value={model} onChange={handleModelChange} disabled={!make}>
          <option value="">Select Model</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="vf-select" value={year} onChange={handleYearChange} disabled={!model}>
          <option value="">Select Year</option>
          {vehicleData.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button type="submit" className="vf-btn" disabled={!make}>
        Search Parts
      </button>
    </form>
  );
}

function MobileFinderForm() {
  const { make, model, year, models, handleMakeChange, handleModelChange, handleYearChange, handleSubmit } = useVehicleForm();

  return (
    <form className="vehicle-bar-form" onSubmit={handleSubmit}>
      <div className="vehicle-bar-selects">
        <select className="vb-select" value={make} onChange={handleMakeChange}>
          <option value="">Select Make</option>
          {vehicleData.makes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="vb-select" value={model} onChange={handleModelChange} disabled={!make}>
          <option value="">Select Model</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="vb-select" value={year} onChange={handleYearChange} disabled={!model}>
          <option value="">Select Year / Submodel</option>
          {vehicleData.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button type="submit" className="vb-btn" disabled={!make}>GO</button>
    </form>
  );
}

export default function Hero() {
  const [videoReady, setVideoReady] = useState(false);

  return (
    <>
      {/* ── Desktop: video left + floating finder right ── */}
      <div className="hero-desktop">
        <div className="hero-video-panel">
          <img src="/hnats1.jpg" alt="" className="hero-poster" />
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

      {/* ── Mobile: static image + overlay + vehicle bar ── */}
      <div className="hero-mobile">
        <div className="hero-mobile-img-wrap">
          <img src="/hnats1.jpg" alt="" className="hero-mobile-img" />
          <div className="hero-mobile-overlay" />
        </div>

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
      </div>
    </>
  );
}
