import { useState, useEffect } from 'react';
import './PromoBanner.css';

const DEFAULTS = {
  title: 'Performance Parts',
  subtitle: '10% off all in stock products',
  subtext: "Don't miss out on our best deals of the season!",
  image: '/promo-banner.jpg',
  ctaLabel: 'Shop Sale Now',
  ctaUrl: '/shop?sale=1',
};

export default function PromoBanner() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetch('/api/admin/promo-banner')
      .then(r => r.json())
      .then(data => setConfig({ ...DEFAULTS, ...(data || {}) }))
      .catch(() => setConfig(null));
  }, []);

  if (!config) return null;
  const expired = config.expiresAt && new Date(config.expiresAt + 'T23:59:59') < new Date();
  if (!config.visible || expired) return null;

  return (
    <section className="promo-banner">
      <img
        className="promo-banner-image"
        src={config.image || DEFAULTS.image}
        alt={config.title || DEFAULTS.title}
        width={1600}
        height={900}
        fetchpriority="high"
        loading="eager"
      />
      <div className="promo-banner-overlay" />
      <div className="promo-banner-slash" aria-hidden="true" />

      <div className="promo-banner-inner">
        <div className="promo-content">
          <span className="promo-tag">Limited Time</span>
          <h2 className="promo-headline">
            {config.title}
            <br />
            <em>{config.subtitle}</em>
          </h2>
          <p className="promo-subtext">{config.subtext}</p>
          <div className="promo-actions">
            <a href={config.ctaUrl || DEFAULTS.ctaUrl} className="promo-btn-primary">
              {config.ctaLabel || DEFAULTS.ctaLabel}
            </a>
            <a href="/shop" className="promo-btn-secondary">Browse All Parts</a>
          </div>
        </div>
      </div>
    </section>
  );
}
