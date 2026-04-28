import { useState, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, X } from 'lucide-react';
import useVehicleSelector from '../../hooks/useVehicleSelector';
import './Hero.css';

function DesktopFinder() {
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

  const summary = [make?.name, model?.name, submodel?.name].filter(Boolean).join(' ');

  return (
    <form className="vf-form" onSubmit={handleSubmit}>
      <div className="vf-icon">
        <Gauge size={28} strokeWidth={1.75} />
      </div>
      <h2 className="vf-title">Find Parts For<br />Your Vehicle</h2>
      <p className="vf-sub">
        {make ? `Your vehicle: ${summary}` : 'Select your vehicle to find compatible parts'}
      </p>
      <div className="vf-selects">
        <select className="vf-select" value={make?.id ?? ''} onChange={onMakeChange} disabled={loadingMakes} aria-label="Vehicle make">
          <option value="">{loadingMakes ? 'Loading…' : 'Select Make'}</option>
          {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="vf-select" value={model?.id ?? ''} onChange={onModelChange} disabled={!make || loadingModels} aria-label="Vehicle model">
          <option value="">{loadingModels ? 'Loading…' : 'Select Model'}</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="vf-select" value={submodel?.id ?? ''} onChange={onSubmodelChange} disabled={!model || loadingSubmodels} aria-label="Vehicle submodel">
          <option value="">{loadingSubmodels ? 'Loading…' : 'Select Submodel'}</option>
          {submodels.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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

  return (
    <form className="vehicle-bar-form" onSubmit={handleSubmit}>
      <div className="vehicle-bar-selects">
        <select className="vb-select" value={make?.id ?? ''} onChange={onMakeChange} disabled={loadingMakes} aria-label="Vehicle make">
          <option value="">{loadingMakes ? 'Loading…' : 'Select Make'}</option>
          {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="vb-select" value={model?.id ?? ''} onChange={onModelChange} disabled={!make || loadingModels} aria-label="Vehicle model">
          <option value="">{loadingModels ? 'Loading…' : 'Select Model'}</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="vb-select" value={submodel?.id ?? ''} onChange={onSubmodelChange} disabled={!model || loadingSubmodels} aria-label="Vehicle submodel">
          <option value="">{loadingSubmodels ? 'Loading…' : 'Select Submodel'}</option>
          {submodels.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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

const HERO_CLIPS = ['hero-1', 'hero-2'];
const FADE_SECONDS = 1.2;

export default function Hero() {
  const [videoReady, setVideoReady] = useState(false);
  const [isMobile] = useState(() => window.innerWidth <= 900);
  const [prefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  const shouldPlayVideo = !isMobile && !prefersReducedMotion;
  const [activeIdx, setActiveIdx] = useState(() => Math.floor(Math.random() * HERO_CLIPS.length));
  const videoRefs = [useRef(null), useRef(null)];

  function handleTimeUpdate(idx) {
    if (idx !== activeIdx) return;
    const el = videoRefs[idx].current;
    if (!el || !el.duration || Number.isNaN(el.duration)) return;
    if (el.duration - el.currentTime <= FADE_SECONDS) {
      const nextIdx = (idx + 1) % HERO_CLIPS.length;
      const nextEl = videoRefs[nextIdx].current;
      if (nextEl) {
        nextEl.currentTime = 0;
        const p = nextEl.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
      setActiveIdx(nextIdx);
    }
  }

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
          {shouldPlayVideo && HERO_CLIPS.map((clip, idx) => {
            const isActive = idx === activeIdx;
            return (
              <video
                key={clip}
                ref={videoRefs[idx]}
                className={`hero-video ${isActive && videoReady ? 'hero-video--ready' : ''}`}
                autoPlay={isActive}
                muted
                playsInline
                preload="auto"
                poster="/hnats1.jpg"
                onCanPlay={() => { if (isActive) setVideoReady(true); }}
                onTimeUpdate={() => handleTimeUpdate(idx)}
              >
                <source src={`/videos/${clip}.mp4`} type="video/mp4" />
              </video>
            );
          })}
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
