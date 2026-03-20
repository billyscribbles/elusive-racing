import { useState, useEffect, useCallback } from 'react';
import { Gauge } from 'lucide-react';
import { vehicleData } from '../../data/navigation';
import './Hero.css';

const slides = [
  { image: '/hnats1.jpg', href: '/on-sale' },
  { image: '/hnats2.jpg', href: '/brand/hybrid-racing' },
  { image: '/APR-Performance-FL5.png', href: '/brand/apr-performance' },
  { image: '/APR-Performance-FK8.png', href: '/brand/apr-performance' },
];

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

// Desktop floating panel
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

// Mobile inline form (inside the bar)
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
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const goTo = useCallback((idx) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(idx);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);
  const prev = () => goTo((current - 1 + slides.length) % slides.length);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

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

      {/* ── Mobile: slider + vehicle bar ── */}
      <div className="hero-mobile">
        <div className="hero-slider">
          {slides.map((slide, i) => (
            <a
              key={i}
              href={slide.href}
              className={`hero-slide ${i === current ? 'hero-slide--active' : ''}`}
              tabIndex={i === current ? 0 : -1}
            >
              <div className="hero-slide-bg" style={{ backgroundImage: `url(${slide.image})` }} />
              <img src={slide.image} alt="" className="hero-slide-img" />
            </a>
          ))}
          <button className="hero-nav hero-nav--prev" onClick={prev} aria-label="Previous slide">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="hero-nav hero-nav--next" onClick={next} aria-label="Next slide">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="hero-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === current ? 'hero-dot--active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
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
