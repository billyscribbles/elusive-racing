import { useState, useEffect, useCallback } from 'react';
import { vehicleData } from '../../data/navigation';
import './Hero.css';

const slides = [
  { image: '/hnats1.jpg', href: '/on-sale' },
  { image: '/hnats2.jpg', href: '/brand/hybrid-racing' },
  { image: '/APR-Performance-FL5.png', href: '/brand/apr-performance' },
  { image: '/APR-Performance-FK8.png', href: '/brand/apr-performance' },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  const models = make ? (vehicleData.models[make] || []) : [];

  const goTo = useCallback((idx) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(idx);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, goTo]);

  const prev = () => goTo((current - 1 + slides.length) % slides.length);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const handleMakeChange = (e) => {
    setMake(e.target.value);
    setModel('');
    setYear('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (make) {
      const params = new URLSearchParams();
      params.set('make', make);
      if (model) params.set('model', model);
      if (year) params.set('year', year);
      window.location.href = `/search?${params.toString()}`;
    }
  };

  return (
    <>
      {/* Full-width slider */}
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

      {/* Vehicle finder — full-width bar below slider */}
      <div className="vehicle-bar">
        <div className="container vehicle-bar-inner">
          <div className="vehicle-bar-label">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" flexShrink="0">
              <path d="M1 3h15l3 3 3 3v5h-2m-7 0H6m12 0a2 2 0 11-4 0 2 2 0 014 0zM6 17a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Find Parts For<br/>Your Vehicle</span>
          </div>

          <div className="vehicle-bar-divider" />

          <form className="vehicle-bar-form" onSubmit={handleSubmit}>
            <div className="vehicle-bar-selects">
              <select className="vb-select" value={make} onChange={handleMakeChange}>
                <option value="">Select Make</option>
                {vehicleData.makes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select className="vb-select" value={model} onChange={(e) => { setModel(e.target.value); setYear(''); }} disabled={!make}>
                <option value="">Select Model</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select className="vb-select" value={year} onChange={(e) => setYear(e.target.value)} disabled={!model}>
                <option value="">Select Year / Submodel</option>
                {vehicleData.years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="vb-btn" disabled={!make}>
              GO
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
